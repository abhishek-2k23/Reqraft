"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, GitPullRequestArrow, Sparkles } from "lucide-react";

import { HubBento } from "./hub-bento";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
};

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

export function LandingHero() {
  return (
    <section className="relative isolate overflow-hidden pt-36 lg:pt-44">
      {/* hero-only background: square grid fading to 0 + amber glow (both scroll away) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="app-grid absolute inset-0"
          style={{
            maskImage: "linear-gradient(to bottom, black 0%, black 40%, transparent 85%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 40%, transparent 85%)",
          }}
        />
        <div className="absolute left-1/2 top-0 h-[440px] w-[760px] max-w-full -translate-x-1/2 -translate-y-1/4 bg-[var(--glow-primary)] blur-[130px]" />
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={container}
        className="mx-auto w-full max-w-7xl px-5 text-center sm:px-8 lg:px-10"
      >
        <motion.div
          variants={fadeUp}
          className="inline-flex items-center gap-2 border border-border bg-foreground/[0.03] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
        >
          <Sparkles className="size-3.5 text-primary" />
          AI product ops for shipping teams
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="mx-auto mt-7 max-w-4xl text-5xl tracking-tight sm:text-6xl sm:leading-[1.05]"
        >
          One AI core, wired to every step from idea to{" "}
          <span className="text-foreground/45">shipped code.</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mx-auto mt-6 max-w-2xl font-mono text-sm leading-relaxed text-muted-foreground"
        >
          Reqraft clarifies the request, writes the PRD, breaks it into tasks, reviews every GitHub
          PR against that spec, and gates the release — all from one agentic core.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/sign-in?callbackUrl=/features/new"
            className="group inline-flex h-11 items-center gap-2 border border-primary bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[0_0_40px_var(--glow-primary)] transition-colors hover:bg-transparent hover:text-foreground"
          >
            Generate first PRD
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/sign-in?callbackUrl=/reviews"
            className="inline-flex h-11 items-center gap-2 border border-border bg-foreground/[0.03] px-5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/[0.06]"
          >
            Watch a PR review
            <GitPullRequestArrow className="size-4" />
          </Link>
        </motion.div>

        <motion.div variants={fadeUp}>
          <HubBento />
        </motion.div>
      </motion.div>
    </section>
  );
}
