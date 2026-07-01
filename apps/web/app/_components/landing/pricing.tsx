"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
};

// Mirrors packages/services/shipflow/billing.ts (INR pricing).
const plans: Plan[] = [
  {
    name: "Free",
    price: "₹0",
    cadence: "/mo",
    tagline: "For trying the whole loop end to end.",
    features: [
      "100 AI review credits / month",
      "3 connected repositories",
      "3 projects",
      "Up to 3 teammates",
      "Full CLI access",
    ],
    cta: "Start free",
    href: "/sign-in?callbackUrl=/features/new",
  },
  {
    name: "Pro",
    price: "₹999",
    cadence: "/mo",
    tagline: "For teams shipping features every week.",
    features: [
      "1,000 AI review credits / month",
      "10 connected repositories",
      "10 projects",
      "Up to 10 teammates",
      "Everything in Free",
    ],
    cta: "Upgrade to Pro",
    href: "/sign-in?callbackUrl=/billing",
    highlighted: true,
  },
  {
    name: "Scale",
    price: "₹1,999",
    cadence: "/mo",
    tagline: "For larger orgs with many repos.",
    features: [
      "5,000 AI review credits / month",
      "50 connected repositories",
      "50 projects",
      "Unlimited teammates",
      "Everything in Pro",
    ],
    cta: "Go Scale",
    href: "/sign-in?callbackUrl=/billing",
  },
];

export function LandingPricing() {
  return (
    <section id="pricing" className="mx-auto mt-32 w-full max-w-7xl scroll-mt-24 px-5 sm:px-8 lg:px-10">
      <div className="max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Pricing</p>
        <h2 className="mt-4 text-3xl tracking-tight sm:text-4xl">
          Start free. <span className="text-foreground/45">Pay as you ship more.</span>
        </h2>
        <p className="mt-4 font-mono text-sm leading-relaxed text-muted-foreground">
          AI reviews are metered as credits and enforced server-side. Every plan includes the full
          workflow and the CLI — bigger plans just lift the limits.
        </p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className={cn(
              "relative flex flex-col border bg-card/40 p-6",
              plan.highlighted
                ? "border-primary/60 shadow-[0_0_60px_var(--glow-primary)]"
                : "border-border",
            )}
          >
            {plan.highlighted ? (
              <span className="absolute -top-3 left-6 border border-primary/60 bg-background px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
                Most popular
              </span>
            ) : null}

            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {plan.name}
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl tracking-tight">{plan.price}</span>
              <span className="font-mono text-sm text-muted-foreground">{plan.cadence}</span>
            </div>
            <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
              {plan.tagline}
            </p>

            <ul className="mt-6 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-foreground/80">{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href={plan.href}
              className={cn(
                "group mt-8 inline-flex h-11 items-center justify-center gap-2 border px-5 text-sm font-medium transition-colors",
                plan.highlighted
                  ? "border-primary bg-primary text-primary-foreground hover:bg-transparent hover:text-foreground"
                  : "border-border bg-foreground/[0.03] text-foreground hover:bg-foreground/[0.06]",
              )}
            >
              {plan.cta}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        ))}
      </div>

      <p className="mt-6 text-center font-mono text-[11px] text-muted-foreground">
        Prices in INR, billed monthly via Razorpay. Cancel anytime — access lasts to the period end.
      </p>
    </section>
  );
}
