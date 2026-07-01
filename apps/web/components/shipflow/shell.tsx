"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "~/components/ui/sheet";
import { Spinner } from "~/components/ui/spinner";
import { OrgSwitcher } from "./org-switcher";
import { CommandPalette } from "./command-palette";
import {
  KeyboardShortcutsButton,
  KeyboardShortcutsProvider,
  ShortcutKeys,
} from "./keyboard-shortcuts";
import { TopNav } from "./top-nav";
import { activeNavHref, navGroups, navItems } from "./nav-items";
import { cn } from "~/lib/utils";

/**
 * Sidebar link trailing indicator. Shows the item's keyboard shortcut normally,
 * and swaps to a spinner only while *that* link's navigation is in flight — so
 * while switching to a tab you see the loading circle, and the shortcut keys the
 * rest of the time. Must be rendered inside the <Link> (uses useLinkStatus).
 */
function NavItemIndicator({ shortcut }: { shortcut: string }) {
  const { pending } = useLinkStatus();
  if (pending) return <Spinner className="size-3.5" aria-label="Loading page" />;
  return (
    <ShortcutKeys
      shortcut={shortcut}
      className="opacity-60 transition-opacity group-hover:opacity-100"
    />
  );
}

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
                      <NavItemIndicator shortcut={item.shortcut} />
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-4 border-t border-border pt-4">
        <KeyboardShortcutsButton />
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

/**
 * Radix (dropdown/dialog/select) locks `<body>` with `pointer-events: none`
 * while an overlay is open and clears it on close. On fast close + route
 * changes that cleanup can be skipped, leaving the whole app unclickable —
 * links and cards silently stop navigating. Watch the body's style and clear a
 * stuck lock whenever no Radix overlay is actually open.
 */
function useRadixPointerEventsGuard() {
  useEffect(() => {
    const clearIfStuck = () => {
      if (
        document.body.style.pointerEvents === "none" &&
        !document.querySelector("[data-state='open']")
      ) {
        document.body.style.pointerEvents = "";
      }
    };
    const observer = new MutationObserver(clearIfStuck);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, []);
}

export function ShipFlowShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const active = activeNavHref(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  useRadixPointerEventsGuard();

  // Belt-and-braces: also clear any stuck body lock right after a route change.
  useEffect(() => {
    document.body.style.pointerEvents = "";
  }, [pathname]);

  return (
    <CommandPalette>
      <KeyboardShortcutsProvider>
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
      </KeyboardShortcutsProvider>
    </CommandPalette>
  );
}
