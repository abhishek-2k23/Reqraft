import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Terminal } from "lucide-react";

import { LandingNav } from "../../_components/landing/nav";
import { LandingFooter } from "../../_components/landing/footer";

export const metadata: Metadata = {
  title: "CLI docs · Reqraft",
  description:
    "Reference for the Reqraft CLI — drive features, PRDs, tasks, and AI code reviews from your terminal.",
};

/* ---------- doc building blocks ---------- */

function CodeBlock({ lines }: { lines: (string | { c: string })[] }) {
  return (
    <pre className="overflow-x-auto border border-border bg-card/60 p-4 font-mono text-[12.5px] leading-relaxed">
      {lines.map((l, i) => {
        const isComment = typeof l !== "string";
        const text = isComment ? l.c : l;
        return (
          <div key={i} className={isComment ? "text-muted-foreground/70" : undefined}>
            {isComment ? (
              <>{text}</>
            ) : (
              <>
                <span className="text-primary">$ </span>
                <span className="text-foreground/90">{text}</span>
              </>
            )}
          </div>
        );
      })}
    </pre>
  );
}

function DocSection({ id, heading, children }: { id: string; heading: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 space-y-4">
      <h2 className="border-b border-border pb-2 font-[family-name:var(--font-display)] text-xl font-medium tracking-tight">
        {heading}
      </h2>
      <div className="space-y-4 text-sm leading-7 text-foreground/75">{children}</div>
    </section>
  );
}

function FlagRow({ flag, desc }: { flag: string; desc: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-baseline gap-3 border-b border-border/60 py-2 last:border-b-0">
      <code className="font-mono text-xs text-primary">{flag}</code>
      <span className="text-sm text-foreground/75">{desc}</span>
    </div>
  );
}

const TOC = [
  { id: "install", label: "Install" },
  { id: "sign-in", label: "Sign in" },
  { id: "global-flags", label: "Global flags" },
  { id: "organizations", label: "Organizations" },
  { id: "features", label: "Features & the pipeline" },
  { id: "reviews", label: "Reviews" },
  { id: "session", label: "Session" },
  { id: "how-it-works", label: "How it works" },
];

export default function CliDocsPage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-x-hidden">
      <LandingNav />

      <div className="w-full px-3 pb-24 pt-32 sm:px-5">
      <div className="mx-auto w-full max-w-6xl">
        {/* header */}
        <header className="border-b border-border pb-8">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
            <Terminal className="size-3.5" /> Developer docs
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-medium tracking-tight sm:text-5xl">
            Reqraft{" "}
            <span className="font-[family-name:var(--font-serif)] italic text-foreground/60">CLI</span>
          </h1>
          <p className="mt-4 max-w-2xl font-mono text-sm leading-relaxed text-muted-foreground">
            Drive your AI product delivery pipeline — features → PRD → tasks → AI code review —
            straight from the terminal. Companion to the web app at reqraft.in.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="https://www.npmjs.com/package/reqraft"
              target="_blank"
              rel="noreferrer"
              className="group inline-flex h-9 items-center gap-2 border border-border bg-foreground/[0.03] px-3.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40"
            >
              npm package
              <ArrowUpRight className="size-3 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
            <span className="border border-border bg-foreground/[0.02] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              reqraft@0.1.0 · node ≥ 18
            </span>
          </div>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[200px_1fr]">
          {/* table of contents */}
          <aside className="hidden lg:block">
            <nav className="sticky top-28 space-y-1 border-l border-border pl-4">
              <p className="pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                On this page
              </p>
              {TOC.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  className="block py-1 text-[13px] text-foreground/60 transition-colors hover:text-foreground"
                >
                  {t.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* content */}
          <article className="min-w-0 space-y-12">
            <DocSection id="install" heading="Install">
              <CodeBlock
                lines={[
                  "npm install -g reqraft",
                  { c: "# or run without installing:" },
                  "npx reqraft --help",
                ]}
              />
              <p>
                Requires Node.js ≥ 18. The binary is <code className="font-mono text-xs text-foreground/90">reqraft</code>.
              </p>
            </DocSection>

            <DocSection id="sign-in" heading="Sign in">
              <p>
                Reqraft uses the OAuth 2.0 Device Authorization flow — no passwords or tokens to
                copy by hand:
              </p>
              <CodeBlock lines={["reqraft login"]} />
              <p>
                It prints a URL and a short code, opens your browser, and waits while you approve
                the request. The credential is stored at{" "}
                <code className="font-mono text-xs text-foreground/90">~/.reqraft/config.json</code>{" "}
                (mode 0600).
              </p>
              <p>For CI / headless use, set a token in the environment instead:</p>
              <CodeBlock lines={['export REQRAFT_TOKEN="<token>"']} />
            </DocSection>

            <DocSection id="global-flags" heading="Global flags">
              <p>
                Global flags go <strong className="text-foreground/90">before</strong> the
                subcommand, e.g.{" "}
                <code className="font-mono text-xs text-foreground/90">reqraft --json feature list</code>.
              </p>
              <div className="border border-border bg-card/40 px-4 py-1">
                <FlagRow flag="--json" desc="Machine-readable JSON output, for scripting and CI." />
                <FlagRow flag="--api <url>" desc="Point at a non-default deployment (default https://reqraft.in)." />
                <FlagRow flag="--org <slug>" desc="Run against a specific organization for this call." />
              </div>
            </DocSection>

            <DocSection id="organizations" heading="Organizations">
              <CodeBlock
                lines={[
                  { c: "# organizations you belong to (* = active)" },
                  "reqraft org list",
                  { c: "# set the active organization" },
                  "reqraft org use <slug>",
                ]}
              />
            </DocSection>

            <DocSection id="features" heading="Features & the pipeline">
              <CodeBlock
                lines={[
                  "reqraft feature list [--status prd_ready] [--project <id>]",
                  'reqraft feature create --title "Dark mode" --description "Add a theme toggle" [--priority high]',
                  "reqraft feature show <featureId>",
                  'reqraft feature clarify <featureId> "Target users are mobile web visitors"',
                  "reqraft feature tasks <featureId>",
                ]}
              />
              <p>PRDs are generated, printed, and approved with the same feature id:</p>
              <CodeBlock
                lines={[
                  { c: "# trigger PRD generation / regeneration" },
                  "reqraft prd generate <featureId>",
                  { c: "# print the PRD (markdown)" },
                  "reqraft prd show <featureId>",
                  { c: "# approve the PRD → generates tasks" },
                  "reqraft prd approve <featureId>",
                ]}
              />
            </DocSection>

            <DocSection id="reviews" heading="Reviews">
              <CodeBlock
                lines={[
                  "reqraft review list [--status passed|failed|running]",
                  "reqraft review show <cycleId>",
                  "reqraft review resolve <issueId>",
                ]}
              />
            </DocSection>

            <DocSection id="session" heading="Session">
              <CodeBlock
                lines={[
                  { c: "# current user + active org" },
                  "reqraft whoami",
                  { c: "# remove stored credentials" },
                  "reqraft logout",
                ]}
              />
            </DocSection>

            <DocSection id="how-it-works" heading="How it works">
              <p>
                The CLI is a thin, fully type-safe tRPC client against the same API the web app
                uses; its types are derived from the server&apos;s router, so the CLI can never
                drift from the API. Authentication rides on BetterAuth&apos;s device grant and
                bearer tokens.
              </p>
              <p>
                Ready to try it?{" "}
                <Link href="/sign-in" className="text-primary underline-offset-4 hover:underline">
                  Create an account
                </Link>{" "}
                and run{" "}
                <code className="font-mono text-xs text-foreground/90">reqraft login</code>.
              </p>
            </DocSection>
          </article>
        </div>
      </div>
      </div>

      <LandingFooter />
    </main>
  );
}
