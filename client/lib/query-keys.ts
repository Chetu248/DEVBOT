import {
  FolderGit2,
  LayoutGrid,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type DashboardNavGroup = {
  label: string;
  items: DashboardNavItem[];
};

const authKeys = ["auth"] as const;
const reposKeys = ["repos"] as const;
const chatKeys = ["chat"] as const;

export const queryKeys = {
  auth: {
    all: [...authKeys],
    me: () => [...authKeys, "me"],
  },
  repos: {
    all: [...reposKeys],
    list: () => [...reposKeys, "list"],
    detail: (repoId: string) => [...reposKeys, repoId],
    status: (repoId: string) => [...reposKeys, repoId, "status"],
  },
  chat: {
    all: [...chatKeys],
    sessions: (repositoryId: string) => [...chatKeys, "sessions", repositoryId],
    messages: (sessionId: string) => [...chatKeys, "messages", sessionId],
  },
} as const;

export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        title: "Overview",
        href: "/dashboard/overview",
        icon: LayoutGrid,
      },
      {
        title: "Repositories",
        href: "/dashboard",
        icon: FolderGit2,
        exact: true,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];

export function isDashboardNavActive(
  pathname: string,
  href: string,
  exact = false
) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}