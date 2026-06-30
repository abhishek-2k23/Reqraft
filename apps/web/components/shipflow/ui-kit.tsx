"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { statusLabel, statusTone } from "./status";
import { cn } from "~/lib/utils";

type FeatureStatus = keyof typeof statusLabel;

/** Shared entrance variants — spring fade-up, staggered by the parent. */
export const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export const STAGGER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

/** Numeric roll-up that fires once when scrolled into view (respects reduced-motion). */
function CountUp({ value, suffix }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduce || !inView) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, reduce]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

/** Premium metric tile — square, hairline, mono caption, count-up value, amber hover glow. */
export function StatTile({
  label,
  value,
  suffix,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number;
  suffix?: string;
  detail: string;
  icon?: LucideIcon;
}) {
  return (
    <motion.div
      variants={FADE_UP}
      className="group relative overflow-hidden border border-border bg-card p-5 transition-colors hover:border-foreground/20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-28 bg-[var(--glow-primary)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        {Icon ? (
          <span className="grid size-8 place-items-center border border-border bg-foreground/[0.03] text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-5 text-4xl font-medium tracking-tight text-foreground">
        <CountUp value={value} suffix={suffix} />
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">{detail}</p>
    </motion.div>
  );
}

/** Big in-content page title + description + optional action (Neon/Vercel style). */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Square hairline panel with a header row (title + mono subtitle + optional action). */
export function SectionCard({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={FADE_UP}
      className={cn("overflow-hidden border border-border bg-card", className)}
    >
      <div className="flex flex-col gap-3 border-b border-border bg-foreground/[0.02] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

/** Token-driven, square status pill used across every list/table. */
export function StatusBadge({
  status,
  className,
}: {
  status: FeatureStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        statusTone[status],
        className,
      )}
    >
      {statusLabel[status]}
    </span>
  );
}
