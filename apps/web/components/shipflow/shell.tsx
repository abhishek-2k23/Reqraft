import Link from "next/link";
import {
  BadgeIndianRupee,
  Boxes,
  CheckCircle2,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  Rocket,
  ScrollText,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { OrgSwitcher } from "./org-switcher";
import { ProjectSwitcher } from "./project-context";
import { UserInfoPanel } from "./user-info-panel";
import { cn } from "~/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/features", label: "Features", icon: Boxes },
  { href: "/prd", label: "PRDs", icon: ScrollText },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/reviews", label: "Reviews", icon: ShieldCheck },
  { href: "/github", label: "GitHub", icon: GitBranch },
  { href: "/billing", label: "Billing", icon: BadgeIndianRupee },
  { href: "/settings/team", label: "Team", icon: Settings },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function ShipFlowShell({
  children,
  title,
  description,
  active,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  active: string;
}) {
  return (
    <main className="min-h-screen bg-[#090b10] text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="flex flex-col border-r border-white/10 bg-[#0d1118] px-4 py-5">
          <Link href="/" className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="grid size-9 place-items-center rounded-lg bg-cyan-300 text-slate-950">
              <Rocket className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Reqraft</p>
              <p className="text-xs text-slate-400">Product delivery OS</p>
            </div>
          </Link>

          <nav className="mt-8 grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white",
                    isActive && "bg-cyan-300 text-slate-950 hover:bg-cyan-200 hover:text-slate-950",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-white/10 pt-4">
            <OrgSwitcher />
          </div>

          <div className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-100">
              <CheckCircle2 className="size-4" />
              YC demo ready
            </div>
            <p className="mt-2 text-xs leading-5 text-emerald-50/75">
              Core workflow, test coverage, CI, and product UI are wired for a polished pitch.
            </p>
          </div>

          <UserInfoPanel />
        </aside>

        <section className="min-w-0">
          <header className="border-b border-white/10 px-5 py-5 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Reqraft</p>
              <ProjectSwitcher />
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-white">{title}</h1>
                <p className="mt-1 max-w-3xl text-sm text-slate-400">{description}</p>
              </div>
              <Link
                href="/features/new"
                className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
              >
                New feature request
              </Link>
            </div>
          </header>
          <div className="px-5 py-6 sm:px-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
