"use client";

import { motion } from "framer-motion";
import { Check, GitBranch, Radio, ShieldCheck, Users, Workflow } from "lucide-react";
import { SiGithub } from "react-icons/si";

import { cn } from "@/lib/utils";
import { SpotlightCard } from "./spotlight-card";
import { MiniViz, type VizKind } from "./mini-viz";

function Tile({
  className = "",
  icon,
  title,
  body,
  viz,
  children,
}: {
  className?: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  viz?: VizKind;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <SpotlightCard className="flex h-full flex-col p-6">
        <span className="grid size-9 place-items-center rounded-full border border-border bg-foreground/[0.04] text-primary">
          {icon}
        </span>
        <p className="mt-5 text-base font-medium">{title}</p>
        <p className="mt-1.5 font-mono text-xs leading-relaxed text-muted-foreground">{body}</p>
        {viz ? <div className="mt-auto pt-5">{<MiniViz kind={viz} />}</div> : null}
        {children ? <div className="mt-auto pt-5">{children}</div> : null}
      </SpotlightCard>
    </motion.div>
  );
}

export function FeatureBento() {
  return (
    <section className="mx-auto mt-32 w-full max-w-7xl px-5 sm:px-8 lg:px-10">
      <div className="max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">The whole loop</p>
        <h2 className="mt-4 text-3xl tracking-tight sm:text-4xl">
          Not just a chat box — a <span className="text-foreground/45">delivery system.</span>
        </h2>
      </div>

      <div className="mt-10 grid gap-3 lg:grid-cols-3">
        <Tile
          className="lg:col-span-2"
          icon={<ShieldCheck className="size-4" />}
          title="Review the code against the requirement"
          body="Every pull request is checked against the approved PRD — missing acceptance criteria, security, and correctness gaps become blocking findings that gate approval."
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 border border-success/50 bg-success/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-success">
              <Check className="size-3" /> passed
            </span>
            <span className="border border-border bg-foreground/[0.04] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              changes requested
            </span>
            <span className="border border-border bg-foreground/[0.04] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              3/3 criteria
            </span>
          </div>
        </Tile>

        <Tile
          icon={<SiGithub className="size-4 text-foreground" />}
          title="Every PR, linked to its feature"
          body="Connect a repo and Reqraft syncs pull requests, links them to the feature they implement, and re-reviews on each new commit."
          viz="pr"
        />

        <Tile
          icon={<Radio className="size-4" />}
          title="Realtime org sync"
          body="Members, invites, and feature status stay live across the team via realtime channels."
          viz="realtime"
        />
        <Tile
          icon={<Users className="size-4" />}
          title="Roles & invitations"
          body="Email invites, accept flow, and role-based permissions — owners, admins, and members."
          viz="roles"
        />
        <Tile
          icon={<Workflow className="size-4" />}
          title="Durable background jobs"
          body="PRD generation, task breakdown, and reviews run as reliable background workflows."
          viz="jobs"
        />

        <Tile
          className="lg:col-span-3"
          icon={<GitBranch className="size-4" />}
          title="From idea to shipped — one tracked lifecycle"
          body="Each feature moves through a clear status pipeline, so everyone sees exactly where it stands."
        >
          <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-widest">
            {["Intake", "Clarify", "PRD", "Tasks", "In review", "Approved", "Shipped"].map((s, i) => (
              <span
                key={s}
                className={cn(
                  "border px-2 py-1",
                  i === 6
                    ? "border-success/50 bg-success/10 text-success"
                    : "border-border bg-foreground/[0.04] text-muted-foreground",
                )}
              >
                {s}
              </span>
            ))}
          </div>
        </Tile>
      </div>
    </section>
  );
}
