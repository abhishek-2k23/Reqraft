"use client";

import { motion } from "framer-motion";
import {
  Check,
  GitPullRequestArrow,
  Radio,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { SiGithub } from "react-icons/si";

import { cn } from "@/lib/utils";
import { ScrambleText } from "./scramble-text";

/**
 * Premium bento — every card holds a structured "figure" panel (Raycast-style
 * FIG_0n) with a calm looping visualization, framed by the neon-card border.
 */

function Fig({ n, children, className = "" }: { n: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden border border-border bg-foreground/[0.02] p-4", className)}>
      <span className="pointer-events-none absolute left-3 top-2.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50">
        fig_{String(n).padStart(2, "0")}
      </span>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/* ---- figures ---- */

function VizReview() {
  return (
    <div className="relative">
      <div className="grid gap-1.5">
        {[
          { w: "62%", tone: "add" },
          { w: "84%", tone: "add" },
          { w: "48%", tone: "del" },
          { w: "73%", tone: "ctx" },
        ].map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className={cn(
                "w-3 font-mono text-[10px] leading-none",
                l.tone === "add" ? "text-success/70" : l.tone === "del" ? "text-destructive/60" : "text-muted-foreground/40",
              )}
            >
              {l.tone === "add" ? "+" : l.tone === "del" ? "−" : "·"}
            </span>
            <span
              style={{ width: l.w }}
              className={cn(
                "h-1.5",
                l.tone === "add" ? "bg-success/25" : l.tone === "del" ? "bg-destructive/20" : "bg-foreground/10",
              )}
            />
          </div>
        ))}
      </div>
      {/* scanning beam */}
      <motion.div
        animate={{ top: ["-8%", "108%"] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.8 }}
        className="pointer-events-none absolute inset-x-0 h-px bg-primary/70 shadow-[0_0_14px_var(--primary)]"
      />
      <div className="mt-4 flex items-center gap-2">
        <motion.span
          animate={{ opacity: [0, 0, 1, 1], scale: [0.8, 0.8, 1, 1] }}
          transition={{ duration: 3.4, times: [0, 0.7, 0.78, 1], repeat: Infinity }}
          className="inline-flex items-center gap-1 border border-success/50 bg-success/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-success"
        >
          <Check className="size-2.5" /> passed
        </motion.span>
        <span className="border border-border bg-foreground/[0.04] px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          3/3 criteria
        </span>
        <span className="hidden border border-border bg-foreground/[0.04] px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground sm:inline">
          0 blocking findings
        </span>
      </div>
    </div>
  );
}

function VizGithub() {
  return (
    <svg viewBox="0 0 220 84" className="h-20 w-full" fill="none">
      {/* main branch */}
      <line x1="28" y1="76" x2="28" y2="8" className="stroke-border" strokeWidth="2" />
      <circle cx="28" cy="66" r="3" className="fill-muted-foreground/40" />
      <circle cx="28" cy="40" r="3" className="fill-muted-foreground/40" />
      {/* feature branch out + merge back */}
      <motion.path
        d="M28 66 C 70 66 60 22 108 22 C 156 22 150 40 192 40"
        className="stroke-primary/70"
        strokeWidth="1.8"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: [0, 1, 1] }}
        transition={{ duration: 3.2, times: [0, 0.6, 1], repeat: Infinity, repeatDelay: 0.9 }}
      />
      <motion.circle
        cx="108"
        cy="22"
        r="4.5"
        className="fill-none stroke-primary"
        strokeWidth="1.8"
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        style={{ transformOrigin: "108px 22px" }}
      />
      <motion.circle
        cx="192"
        cy="40"
        r="4"
        className="fill-success"
        animate={{ opacity: [0, 0, 1, 1] }}
        transition={{ duration: 3.2, times: [0, 0.6, 0.72, 1], repeat: Infinity, repeatDelay: 0.9 }}
      />
      <text x="100" y="10" className="fill-muted-foreground font-mono text-[8px] uppercase tracking-widest">
        pr #128
      </text>
      <text x="180" y="58" className="fill-success font-mono text-[8px] uppercase tracking-widest">
        merged
      </text>
    </svg>
  );
}

function VizCopilot() {
  return (
    <div className="space-y-2">
      <motion.div
        animate={{ opacity: [0, 1, 1, 0], y: [6, 0, 0, -2] }}
        transition={{ duration: 4.4, times: [0, 0.12, 0.85, 1], repeat: Infinity }}
        className="w-fit border border-border bg-foreground/[0.04] px-2.5 py-1.5 font-mono text-[9.5px] text-muted-foreground"
      >
        What&apos;s blocking the release?
      </motion.div>
      <motion.div
        animate={{ opacity: [0, 0, 1, 1, 0], y: [6, 6, 0, 0, -2] }}
        transition={{ duration: 4.4, times: [0, 0.28, 0.4, 0.85, 1], repeat: Infinity }}
        className="ml-auto w-fit border border-primary/30 bg-primary/[0.07] px-2.5 py-1.5 font-mono text-[9.5px] text-foreground/85"
      >
        PR #128 — 1 criterion unmet ↗
      </motion.div>
    </div>
  );
}

function VizRealtime() {
  return (
    <div className="relative mx-auto size-20">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute rounded-full border border-border"
          style={{ inset: `${i * 12}px` }}
        />
      ))}
      {/* rotating sweep */}
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, var(--glow-primary), transparent 26%)",
        }}
      />
      {/* blips */}
      {[{ l: "18%", t: "30%" }, { l: "68%", t: "22%" }, { l: "58%", t: "68%" }].map((b, i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: i * 1 }}
          className="absolute size-1.5 rounded-full bg-primary"
          style={{ left: b.l, top: b.t }}
        />
      ))}
      <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/50" />
    </div>
  );
}

function VizRoles() {
  const members = [
    { init: "AK", role: "owner", tone: "text-primary border-primary/40 bg-primary/10" },
    { init: "MM", role: "admin", tone: "text-foreground/70 border-border bg-foreground/[0.05]" },
    { init: "SR", role: "member", tone: "text-foreground/70 border-border bg-foreground/[0.05]" },
  ];
  return (
    <div className="space-y-1.5">
      {members.map((m, i) => (
        <motion.div
          key={m.init}
          animate={{ opacity: [0, 1], x: [-8, 0] }}
          transition={{ duration: 0.5, delay: i * 0.9, repeat: Infinity, repeatDelay: 3.4 }}
          className="flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <span className="grid size-5 place-items-center border border-border bg-foreground/[0.06] font-mono text-[8px] text-foreground/80">
              {m.init}
            </span>
            <span className="font-mono text-[9.5px] text-muted-foreground">member_{i + 1}</span>
          </span>
          <span className={cn("border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-widest", m.tone)}>
            {m.role}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function VizJobs() {
  const jobs = ["prd.generate", "tasks.breakdown", "review.run", "release.gate"];
  return (
    <div className="flex items-center gap-0 overflow-x-auto py-1">
      {jobs.map((job, i) => (
        <div key={job} className="flex shrink-0 items-center">
          <motion.span
            animate={{ borderColor: ["var(--border)", "var(--primary)", "var(--border)"] }}
            transition={{ duration: 4.8, times: [0, 0.5, 1], delay: i * 1.1, repeat: Infinity }}
            className={cn(
              "border px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-widest",
              i === jobs.length - 1 ? "text-success" : "text-foreground/70",
            )}
          >
            {job}
          </motion.span>
          {i < jobs.length - 1 && (
            <svg width="40" height="10" className="shrink-0">
              <line x1="0" y1="5" x2="40" y2="5" strokeWidth="1.5" className="flow-dash stroke-primary/40" />
            </svg>
          )}
        </div>
      ))}
      <span className="ml-4 hidden items-center gap-1.5 border border-border bg-foreground/[0.03] px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground lg:flex">
        <RotateCcw className="size-2.5 text-primary" /> auto-retry on failure
      </span>
    </div>
  );
}

/* ---- card ---- */

function Card({
  className = "",
  icon,
  title,
  body,
  fig,
  figBody,
  delay = 0,
  row = false,
}: {
  className?: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  fig: number;
  figBody: React.ReactNode;
  delay?: number;
  /** wide card: text left, figure right */
  row?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay }}
      className={cn("neon-card flex flex-col gap-5 p-6", row && "lg:flex-row lg:items-center", className)}
    >
      <div className={cn(row && "lg:max-w-sm lg:shrink-0")}>
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center border border-border bg-foreground/[0.04] text-primary">
            {icon}
          </span>
          <p className="text-base font-medium">{title}</p>
        </div>
        <p className="mt-3 font-mono text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
      <Fig n={fig} className={cn("mt-auto", row && "lg:mt-0 lg:flex-1")}>
        {figBody}
      </Fig>
    </motion.div>
  );
}

export function FeatureBento() {
  return (
    <section id="features" className="mx-auto mt-32 w-full max-w-7xl scroll-mt-24 px-5 sm:px-8 lg:px-10">
      <div className="max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Everything included</p>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl">
          <ScrambleText text="Not just a chat box" /> —{" "}
          <span className="font-[family-name:var(--font-serif)] italic text-foreground/60">
            a delivery system.
          </span>
        </h2>
      </div>

      <div className="mt-10 grid gap-3 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          icon={<ShieldCheck className="size-4" />}
          title="PRD-aware code review"
          body="Every pull request is checked against the approved spec — missed acceptance criteria, security holes, and correctness gaps become blocking findings that gate approval."
          fig={1}
          figBody={<VizReview />}
        />
        <Card
          icon={<SiGithub className="size-4 text-foreground" />}
          title="GitHub-native"
          body="Connect a repo and Reqraft syncs every PR, links it to its feature, and re-reviews each new commit."
          fig={2}
          figBody={<VizGithub />}
          delay={0.06}
        />

        <Card
          icon={<Sparkles className="size-4" />}
          title="Copilot with full context"
          body="Ask anything about your features, PRDs, or reviews — answers come from your workspace, not thin air."
          fig={3}
          figBody={<VizCopilot />}
          delay={0.05}
        />
        <Card
          icon={<Radio className="size-4" />}
          title="Realtime org sync"
          body="Members, invites, and feature status stay live across the whole team — no refresh, no stale boards."
          fig={4}
          figBody={<VizRealtime />}
          delay={0.1}
        />
        <Card
          icon={<Users className="size-4" />}
          title="Roles & invitations"
          body="Email invites with an accept flow and role-based permissions — owners, admins, and members."
          fig={5}
          figBody={<VizRoles />}
          delay={0.15}
        />

        <Card
          className="lg:col-span-3"
          row
          icon={<Workflow className="size-4" />}
          title="Durable background jobs"
          body="PRD generation, task breakdown, and reviews run as reliable, resumable workflows — a crashed step retries, nothing is lost."
          fig={6}
          figBody={<VizJobs />}
        />
      </div>

      {/* quiet proof line */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border border-border bg-foreground/[0.02] px-6 py-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="flex items-center gap-2">
          <GitPullRequestArrow className="size-3 text-primary" /> Reviews on every commit
        </span>
        <span className="flex items-center gap-2">
          <ShieldCheck className="size-3 text-primary" /> Server-enforced credits
        </span>
        <span className="flex items-center gap-2">
          <Sparkles className="size-3 text-primary" /> One agentic core
        </span>
      </div>
    </section>
  );
}
