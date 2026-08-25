# devPilot

**devPilot** is a full-stack RAG (Retrieval-Augmented Generation) application that lets you **chat with any of your GitHub repositories**. Sign in with GitHub, pick a repo, index it, and ask natural-language questions about the codebase — devPilot retrieves the most relevant code chunks and answers with citations to the exact files and line ranges.

---

## ✨ Features

- **GitHub OAuth2 login** — sign in with your GitHub account (no separate credentials to manage).
- **Repository browser** — automatically syncs and lists the repos you own, collaborate on, or belong to via your organizations.
- **Codebase indexing pipeline** — fetches a repo's file tree via the GitHub API, filters out irrelevant files (binaries, lockfiles, etc.), chunks source code, embeds it, and stores the vectors in Postgres (pgvector).
- **Semantic code search (RAG)** — questions are matched against embedded code chunks scoped to the selected repository.
- **Streaming chat** — answers are streamed back to the UI in real time over **Server-Sent Events (SSE)**.
- **Cited answers** — every answer references the specific file paths and line ranges the model used as context.
- **Multi-session chat** — create and revisit multiple chat sessions per repository.
- **Index status tracking** — live progress (files processed, chunk count, indexing state) per repository.
- **Encrypted token storage** — GitHub access tokens are encrypted at rest before being persisted.

---

## 🏗️ Architecture

devPilot is a monorepo with two independently deployable apps:

```
devPilot/
├── backend/   → Java 21 · Spring Boot 4 · Spring AI · Spring Security (OAuth2)
└── client/    → Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui
```

**Flow:**
1. User logs in via GitHub OAuth2 (handled entirely by the backend).
2. Backend syncs the user's repositories from the GitHub REST API.
3. On request, the backend walks a repo's file tree, filters/chunks the source files, generates embeddings via an OpenAI-compatible embedding model, and stores them in a **pgvector**-backed Postgres table.
4. When the user asks a question in a chat session, the backend performs a similarity search scoped to that repository, builds a grounded prompt, and streams the LLM's response back to the client over SSE — along with citations pointing to the source files.

### Backend stack
| Concern | Technology |
|---|---|
| Framework | Spring Boot 4 (Java 21) |
| Auth | Spring Security + OAuth2 Client (GitHub provider) |
| AI / RAG | Spring AI (OpenAI-compatible chat + embedding models) |
| Vector store | Spring AI PGVector store |
| Database | PostgreSQL (`pgvector` extension) + Spring Data JPA |
| Streaming | Server-Sent Events (`SseEmitter`) |
| Token security | Spring Security Crypto (`TextEncryptor`) |
| Build tool | Maven (`mvnw`) |

### Frontend stack
| Concern | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui components |
| Data fetching | TanStack Query |
| Markdown / streaming UI | `streamdown` |
| Auth gating | Middleware-based route protection (`proxy.ts`) |

---

## 📂 Project structure

```
backend/
└── src/main/java/devPilot/backend/
    ├── config/          # CORS, security, crypto, app-level beans
    ├── controllers/      # REST endpoints (auth, repos, chat)
    ├── dto/               # Request/response payloads
    ├── entity/            # JPA entities (User, Repository, ChatSession, ChatMessage, IndexStatus)
    ├── repository/        # Spring Data JPA repositories
    ├── security/          # GitHub OAuth2 user service, current-user helpers
    ├── services/
    │   ├── ai/            # Prompt building, context retrieval, citation mapping
    │   ├── github/        # GitHub API client, rate limiter
    │   └── indexing/      # File filtering, chunking, async indexing pipeline
    └── exceptions/        # Centralized exception handling

client/
├── app/                   # Next.js App Router pages (login, dashboard, chat, auth callback)
├── components/            # Chat UI, dashboard UI, shadcn/ui primitives
├── hooks/                 # useAuth, useChat, useRepos, etc.
└── lib/                   # API client, stream parsing, query keys, utils
```

---

## 🔌 API overview

| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/api/auth/login-url` | Returns the GitHub OAuth2 authorization URL |
| `GET`  | `/api/auth/me` | Returns the currently authenticated user |
| `POST` | `/api/auth/logout` | Logs the user out |
| `GET`  | `/api/repos` | Lists (and optionally syncs) the user's GitHub repositories |
| `GET`  | `/api/repos/{id}` | Fetches a single repository |
| `POST` | `/api/repos/{id}/index` | Kicks off asynchronous indexing for a repository |
| `GET`  | `/api/repos/{id}/status` | Returns live indexing progress/status |
| `POST` | `/api/chat/sessions` | Creates a new chat session for a repository |
| `GET`  | `/api/chat/sessions` | Lists chat sessions for a repository |
| `GET`  | `/api/chat/sessions/{id}` | Fetches messages in a chat session |
| `POST` | `/api/chat/sessions/{id}/messages` | Sends a message and streams the AI reply via SSE |

---

## 🚀 Getting started

### Prerequisites

- **Java 21+**
- **Node.js 20+** and npm
- **PostgreSQL 16+** with the [`pgvector`](https://github.com/pgvector/pgvector) extension available
- A **GitHub OAuth App** (Client ID + Secret) — set the callback URL to `http://localhost:8080/login/oauth2/code/github`
- An **OpenAI-compatible API key** (for chat + embedding models)

### 1. Set up the database

Create a Postgres database and enable the required extensions:

```sql
CREATE DATABASE devpilot;

\c devpilot

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 2. Configure the backend

Create `backend/src/main/resources/application.yml` (or `application.properties`) with at least the following:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/devpilot
    username: postgres
    password: postgres
  security:
    oauth2:
      client:
        registration:
          github:
            client-id: ${GITHUB_CLIENT_ID}
            client-secret: ${GITHUB_CLIENT_SECRET}
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}

app:
  frontend-url: http://localhost:3000
  cors:
    allowed-origins: http://localhost:3000
  token-encryptor-password: ${TOKEN_ENCRYPTOR_PASSWORD}
  token-encryptor-salt: ${TOKEN_ENCRYPTOR_SALT}
  github:
    api-delay-ms: 50
  indexing:
    chunk-size: 800
    max-file-bytes: 102400
```

> `token-encryptor-salt` must be a valid **hex-encoded** string (used by Spring Security's `Encryptors.text`).

Run the backend:

```bash
cd backend
./mvnw spring-boot:run
```

The API will be available at `http://localhost:8080`.

### 3. Configure and run the frontend

```bash
cd client
npm install
```

Create `client/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Start the dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### 4. Use it

1. Open `http://localhost:3000` and log in with GitHub.
2. Pick a repository from your dashboard and start indexing it.
3. Once indexing completes, open the chat view and start asking questions about the codebase.

---

## 🗺️ Roadmap ideas

- Support additional embedding/chat providers
- Incremental re-indexing on new commits
- Multi-branch indexing
- Shareable chat sessions

---

## 📄 License

Add your preferred license here (e.g. MIT).