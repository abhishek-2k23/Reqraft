import {
  BadgeIndianRupee,
  Boxes,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Mono caption groups the sidebar like Neon's dashboard. */
  group: "Delivery" | "Workspace";
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Delivery" },
  { href: "/features", label: "Features", icon: Boxes, group: "Delivery" },
  { href: "/prd", label: "PRDs", icon: ScrollText, group: "Delivery" },
  { href: "/tasks", label: "Tasks", icon: ListChecks, group: "Delivery" },
  { href: "/reviews", label: "Reviews", icon: ShieldCheck, group: "Delivery" },
  { href: "/github", label: "GitHub", icon: GitBranch, group: "Delivery" },
  { href: "/projects", label: "Projects", icon: FolderKanban, group: "Workspace" },
  { href: "/billing", label: "Billing", icon: BadgeIndianRupee, group: "Workspace" },
  { href: "/settings/team", label: "Team", icon: Users, group: "Workspace" },
  { href: "/settings", label: "Settings", icon: Settings, group: "Workspace" },
];

export const navGroups: NavItem["group"][] = ["Delivery", "Workspace"];

/** Best-match nav item for a pathname (handles nested routes like /settings/team). */
export function activeNavHref(pathname: string): string | null {
  const match = navItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.href ?? null;
}

/** Human label for the current route, for the top-nav breadcrumb. */
export function routeLabel(pathname: string): string {
  if (pathname.startsWith("/features/new")) return "New request";
  if (/^\/features\/[^/]+$/.test(pathname)) return "Feature detail";
  if (pathname.startsWith("/search")) return "Search";
  const href = activeNavHref(pathname);
  return navItems.find((i) => i.href === href)?.label ?? "Reqraft";
}
