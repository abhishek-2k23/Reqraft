"use client";

import { motion } from "framer-motion";
import { Braces, ScanLine, Terminal } from "lucide-react";

const bullets = [
  {
    icon: <ScanLine className="size-4" />,
    title: "Browser login — nothing to paste",
    body: "`reqraft login` opens your browser to approve, just like signing into a smart TV. No API keys copied by hand.",
  },
  {
    icon: <Braces className="size-4" />,
    title: "Type-safe and always in sync",
    body: "The CLI is generated from the same API the web app uses, so its commands can never drift from the product.",
  },
  {
    icon: <Terminal className="size-4" />,
    title: "--json for scripts & CI",
    body: "Pipe features, PRDs, and reviews into your automation. Set REQRAFT_TOKEN and run it headless in CI.",
  },
];

// A colored line in the fake terminal.
function Line({ children }: { children: React.ReactNode }) {
  return <div className="whitespace-pre-wrap">{children}</div>;
}

export function CliSection() {
  return (
    <section id="cli" className="mx-auto mt-32 w-full max-w-7xl scroll-mt-24 px-5 sm:px-8 lg:px-10">
      <div className="max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Reqraft CLI</p>
        <h2 className="mt-4 text-3xl tracking-tight sm:text-4xl">
          Drive the whole pipeline <span className="text-foreground/45">from your terminal.</span>
        </h2>
        <p className="mt-4 font-mono text-sm leading-relaxed text-muted-foreground">
          Install one npm package and run features, PRDs, and code reviews without leaving your
          shell — same account, same data, same review gates as the web app.
        </p>
      </div>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
        {/* Terminal mockup */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-lg border border-border bg-card/60 shadow-[0_0_60px_var(--glow-primary)]"
        >
          <div className="flex items-center gap-2 border-b border-border bg-foreground/[0.03] px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-destructive/60" />
            <span className="size-2.5 rounded-full bg-amber-400/70" />
            <span className="size-2.5 rounded-full bg-success/60" />
            <span className="ml-2 font-mono text-[11px] text-muted-foreground">reqraft — zsh</span>
          </div>
          <div className="space-y-1 p-5 font-mono text-[12.5px] leading-relaxed">
            <Line>
              <span className="text-primary">$</span> npm install -g reqraft
            </Line>
            <Line>
              <span className="text-muted-foreground">added 6 packages</span>
            </Line>
            <div className="h-2" />
            <Line>
              <span className="text-primary">$</span> reqraft login
            </Line>
            <Line>
              <span className="text-muted-foreground"> → opening browser to approve…</span>
            </Line>
            <Line>
              <span className="text-success">✔</span> Signed in as you@team.com
            </Line>
            <div className="h-2" />
            <Line>
              <span className="text-primary">$</span> reqraft feature list
            </Line>
            <Line>
              <span className="text-foreground/70">ID        STATUS       PRIORITY  TITLE</span>
            </Line>
            <Line>
              0b75cf3a  <span className="text-primary">tasks_ready</span>  urgent    Dark mode toggle
            </Line>
            <div className="h-2" />
            <Line>
              <span className="text-primary">$</span> reqraft prd approve 0b75cf3a
            </Line>
            <Line>
              <span className="text-success">✔</span> PRD approved — task generation triggered
            </Line>
          </div>
        </motion.div>

        {/* Bullets */}
        <div className="grid gap-3">
          {bullets.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="flex gap-4 border border-border bg-card/40 p-5"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-foreground/[0.04] text-primary">
                {b.icon}
              </span>
              <div>
                <p className="text-sm font-medium">{b.title}</p>
                <p className="mt-1 font-mono text-xs leading-relaxed text-muted-foreground">{b.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
