"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "~/components/ui/sheet";
import { OrgSwitcher } from "./org-switcher";
import { CommandPalette } from "./command-palette";
import { TopNav } from "./top-nav";
import { LinkPending } from "./link-pending";
import { activeNavHref, navGroups, navItems } from "./nav-items";
import { cn } from "~/lib/utils";

function SidebarBody({
  active,
  onNavigate,
}: {
  active: string | null;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-1 px-3 py-4">
      <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 px-2 py-1">
        <Image
          src="/icons/reqraft-icon-transparent-512.png"
          alt="Reqraft"
          width={32}
          height={32}
          className="size-8"
          priority
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Reqraft</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Product delivery OS
          </p>
        </div>
      </Link>

      <nav className="mt-4 flex-1 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group}>
            <p className="px-3 pb-1.5 pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
              {group}
            </p>
            <div className="grid gap-0.5">
              {navItems
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = active === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group relative flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
                      )}
                    >
                      {isActive ? (
                        <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-primary" />
                      ) : null}
                      <Icon className="size-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      <LinkPending className="size-3.5" />
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-4 border-t border-border pt-4">
        <OrgSwitcher />
        <div className="mt-3 flex items-center gap-2 border border-border bg-foreground/[0.02] px-3 py-2">
          <span aria-hidden className="size-1.5 bg-success" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            All systems operational
          </span>
        </div>
      </div>
    </div>
  );
}

export function ShipFlowShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const active = activeNavHref(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <CommandPalette>
      <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-border bg-sidebar lg:block">
          <div className="sticky top-0 h-screen">
            <SidebarBody active={active} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <TopNav onOpenMobileNav={() => setMobileOpen(true)} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[270px] border-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Reqraft app navigation</SheetDescription>
          <SidebarBody active={active} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </CommandPalette>
  );
}
