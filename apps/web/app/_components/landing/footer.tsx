"use client";

import Link from "next/link";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/prd", label: "PRDs" },
      { href: "/reviews", label: "Reviews" },
      { href: "/billing", label: "Pricing" },
    ],
  },
  {
    title: "Workflow",
    links: [
      { href: "/sign-in?callbackUrl=/features/new", label: "Generate a PRD" },
      { href: "/sign-in?callbackUrl=/tasks", label: "Task board" },
      { href: "/sign-in?callbackUrl=/github", label: "GitHub sync" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/sign-in", label: "Sign in" },
      { href: "/settings/team", label: "Team" },
      { href: "/profile", label: "Profile" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="mt-32 w-full border-t border-border">
      <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="grid gap-10 sm:grid-cols-3 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <span className="text-sm font-medium tracking-tight">Reqraft</span>
            <p className="mt-3 max-w-xs font-mono text-xs leading-relaxed text-muted-foreground">
              From feature request to reviewed, approved, shipped software.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-foreground/70 transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Oversized outlined wordmark — aligned to the global container width;
          its outline glows amber on hover */}
      <div className="overflow-hidden border-t border-border">
        <div className="mx-auto w-full max-w-7xl px-5 py-10 text-center sm:px-8 lg:px-10">
          <span
            aria-hidden
            className="inline-block w-full select-none text-[clamp(3rem,18vw,14rem)] font-semibold leading-[0.8] tracking-tighter text-transparent transition-all duration-300 [-webkit-text-stroke:1px_var(--border)] hover:[-webkit-text-stroke:1px_var(--primary)] hover:[filter:drop-shadow(0_0_28px_var(--glow-primary))]"
          >
            Reqraft
          </span>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-5 py-5 sm:flex-row sm:px-8 lg:px-10">
          <div className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="size-1.5 bg-success" />
            All systems operational
          </div>
          <div className="flex items-center gap-6 font-mono text-xs text-muted-foreground">
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms of service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
