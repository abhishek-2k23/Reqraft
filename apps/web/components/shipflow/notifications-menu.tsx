"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, FileText, OctagonAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useActiveProject } from "./project-context";
import { cn } from "~/lib/utils";
import { trpc } from "~/trpc/client";

type Event = {
  id: string;
  featureId: string;
  title: string;
  message: string;
  icon: LucideIcon;
  tone: "success" | "primary" | "destructive";
  at: Date;
};

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const toneDot: Record<Event["tone"], string> = {
  success: "bg-success",
  primary: "bg-primary",
  destructive: "bg-destructive",
};
const toneText: Record<Event["tone"], string> = {
  success: "text-success",
  primary: "text-primary",
  destructive: "text-destructive",
};

/** Derives recent pipeline events client-side from existing feature data — no new backend. */
export function NotificationsMenu() {
  const { activeProjectId, ready, isLoading } = useActiveProject();
  const { data: features = [] } = trpc.feature.list.useQuery(
    { projectId: activeProjectId ?? undefined },
    { enabled: ready && !isLoading },
  );

  const events = useMemo<Event[]>(() => {
    const out: Event[] = [];
    for (const f of features) {
      const at = new Date(f.createdAt);
      if (f.status === "prd_ready") {
        out.push({ id: `${f.id}-prd`, featureId: f.id, title: f.title, message: "PRD ready for review", icon: FileText, tone: "primary", at });
      } else if (f.status === "approved" || f.status === "shipped") {
        out.push({ id: `${f.id}-passed`, featureId: f.id, title: f.title, message: "AI review passed", icon: CheckCircle2, tone: "success", at });
      } else if (f.status === "blocked") {
        out.push({ id: `${f.id}-blocked`, featureId: f.id, title: f.title, message: "Blocker raised", icon: OctagonAlert, tone: "destructive", at });
      }
    }
    return out.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 8);
  }, [features]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Notifications"
        className="relative grid size-9 shrink-0 place-items-center border border-border bg-foreground/[0.03] text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus:outline-none"
      >
        <Bell className="size-4" />
        {events.length > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center bg-primary px-1 font-mono text-[9px] font-medium text-primary-foreground">
            {events.length}
          </span>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 border-border bg-popover p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Activity</p>
          <span className="text-[11px] text-muted-foreground">{events.length} new</span>
        </div>

        {events.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {events.map((e) => {
              const Icon = e.icon;
              return (
                <li key={e.id}>
                  <Link
                    href={`/features/${e.featureId}`}
                    className="flex items-start gap-3 border-b border-border px-3 py-3 transition-colors last:border-b-0 hover:bg-foreground/[0.04]"
                  >
                    <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center border border-border bg-foreground/[0.03]", toneText[e.tone])}>
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={cn("size-1.5 shrink-0", toneDot[e.tone])} />
                        <span className="truncate text-sm text-foreground">{e.message}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{e.title}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{relativeTime(e.at)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
