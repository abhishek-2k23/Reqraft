"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  GitPullRequestArrow,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

const metrics = [
  { label: "Feature cycle", value: "4.8x", detail: "faster from request to release", icon: Clock3 },
  { label: "PRD coverage", value: "92%", detail: "requirements mapped before code", icon: CheckCircle2 },
  { label: "Review signal", value: "38%", detail: "fewer escaped requirement bugs", icon: ShieldCheck },
  { label: "Blockers found", value: "24", detail: "issues caught before approval", icon: TriangleAlert },
];

const workflow = [
  "Client gives messy feature idea",
  "AI asks clarification questions",
  "PRD becomes the source of truth",
  "Tasks guide engineering",
  "GitHub PR is reviewed against the PRD",
  "Human approves and ships",
];

const FADE_UP_ANIMATION_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

function MetricCard({ metric, index }: { metric: (typeof metrics)[number]; index: number }) {
  const Icon = metric.icon;

  return (
    <motion.div
      variants={FADE_UP_ANIMATION_VARIANTS}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10"
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-3xl transition-all group-hover:bg-orange-500/20" />
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">{metric.label}</p>
        <div className="rounded-full bg-white/10 p-2 text-zinc-300 transition-colors group-hover:bg-orange-500/20 group-hover:text-orange-400">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-6 text-4xl font-semibold tracking-tight text-white">{metric.value}</p>
      <p className="mt-2 text-sm text-zinc-400">{metric.detail}</p>
    </motion.div>
  );
}

function ChatScene() {
  return (
    <motion.div variants={FADE_UP_ANIMATION_VARIANTS} className="relative mt-8 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/50 p-6 shadow-2xl backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <p className="text-sm font-medium text-white">Clarification Agent</p>
          <p className="text-xs text-zinc-400">Feature idea to PRD in progress</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-200 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex size-2 rounded-full bg-orange-500"></span>
          </span>
          live
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }} className="max-w-[85%] rounded-2xl rounded-tl-sm border border-white/5 bg-zinc-900/80 p-4 text-sm leading-relaxed text-zinc-300">
          Client: We need a QA gate that stops PRs when code misses the PRD.
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.6 }} className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-zinc-800 to-zinc-900 p-4 text-sm leading-relaxed text-white shadow-inner">
          AI: Should blockers prevent approval, or only warn reviewers?
        </motion.div>
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2.4 }} className="max-w-[85%] rounded-2xl rounded-tl-sm border border-white/5 bg-zinc-900/80 p-4 text-sm leading-relaxed text-zinc-300">
          Client: Block approval for security, correctness, and missing acceptance criteria.
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.2 }} className="mt-8 rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-orange-200">
          <Bot className="size-4" />
          Generated PRD Outline
        </div>
        <div className="mt-3 grid gap-2 text-sm text-zinc-400">
          <p className="flex items-center gap-2"><span className="text-orange-500/50">01</span> Define blocker taxonomy</p>
          <p className="flex items-center gap-2"><span className="text-orange-500/50">02</span> Compare PR diff against acceptance criteria</p>
          <p className="flex items-center gap-2"><span className="text-orange-500/50">03</span> Require human approval after AI pass</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden pt-8">
      <nav className="fixed left-1/2 top-6 z-50 flex w-[calc(100%-2rem)] max-w-7xl -translate-x-1/2 items-center justify-between rounded-2xl border border-white/10 bg-zinc-950/40 px-6 py-4 shadow-2xl backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/20">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <Image
            src="/icons/reqraft-icon-transparent-512.png"
            alt="Reqraft"
            width={36}
            height={36}
            className="size-9"
            priority
          />
          <span className="font-semibold tracking-tight text-white">Reqraft</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm font-medium text-zinc-400 md:flex">
          <Link href="/features" className="transition-colors hover:text-white">Features</Link>
          <Link href="/prd" className="transition-colors hover:text-white">PRDs</Link>
          <Link href="/reviews" className="transition-colors hover:text-white">Reviews</Link>
          <Link href="/billing" className="transition-colors hover:text-white">Pricing</Link>
        </div>
        <Link href="/sign-in" className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-all hover:scale-105 active:scale-95">
          <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
            <div className="relative h-full w-8 bg-white/20" />
          </div>
          Sign In
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </nav>

      <div className="mx-auto w-full max-w-7xl px-5 pt-40 sm:px-8 lg:px-10">
        <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-8">
          <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.15 } } }} className="max-w-3xl">
            <motion.div variants={FADE_UP_ANIMATION_VARIANTS} className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-200">
              <Sparkles className="size-4" />
              <span>AI product ops for shipping teams</span>
            </motion.div>
            <motion.h1 variants={FADE_UP_ANIMATION_VARIANTS} className="mt-8 text-5xl font-semibold tracking-tight text-white sm:text-7xl sm:leading-[1.1]">
              Turn feature ideas into <span className="text-zinc-500">shipped code.</span>
            </motion.h1>
            <motion.p variants={FADE_UP_ANIMATION_VARIANTS} className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
              Reqraft captures messy client asks, clarifies requirements, writes PRDs, watches GitHub PRs, and blocks releases when code misses the mark.
            </motion.p>
            <motion.div variants={FADE_UP_ANIMATION_VARIANTS} className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/sign-in?callbackUrl=/features/new" className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_40px_rgba(249,115,22,0.3)] transition-all hover:scale-105 hover:bg-orange-400 active:scale-95">
                Generate First PRD
                <MessageSquareText className="size-4" />
              </Link>
              <Link href="/sign-in?callbackUrl=/reviews" className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 active:scale-95">
                Watch PR Review
                <GitPullRequestArrow className="size-4" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } } }} className="relative z-10 w-full">
            <div className="grid gap-4 sm:grid-cols-2">
              {metrics.map((metric, i) => <MetricCard key={metric.label} metric={metric} index={i} />)}
            </div>
            <ChatScene />
          </motion.div>
        </div>
      </div>

      <motion.section initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 1 }} className="mt-32 w-full border-t border-white/5 bg-zinc-950/50 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_1fr] lg:px-10">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-8">
            <div className="absolute top-0 left-1/2 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <h2 className="text-xl font-semibold tracking-tight text-white">Workflow Cockpit</h2>
            <p className="mt-2 text-zinc-400">One clean path from idea to production confidence.</p>
            <div className="mt-8 grid gap-4">
              {workflow.map((step, index) => (
                <div key={step} className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-black/40 p-4 transition-colors hover:border-white/10 hover:bg-white/5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-orange-500/20 bg-orange-500/10 text-xs font-semibold text-orange-300 transition-colors group-hover:bg-orange-500/20">
                    {index + 1}
                  </span>
                  <p className="font-medium text-zinc-300 transition-colors group-hover:text-white">{step}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative flex flex-col justify-center rounded-3xl border border-orange-500/10 bg-orange-500/5 p-8 lg:p-12">
            <div className="absolute bottom-0 right-0 h-64 w-64 translate-x-1/3 translate-y-1/3 rounded-full bg-orange-500/20 blur-[100px]" />
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">Built for Teams</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">A PRD-first code review loop.</h2>
            <p className="mt-6 text-lg leading-relaxed text-zinc-400">
              Instead of checking only syntax and style, Reqraft reviews whether the pull request actually delivers the approved requirement, edge cases, success metrics, and release promise.
            </p>
          </div>
        </div>
      </motion.section>
    </main>
  );
}
