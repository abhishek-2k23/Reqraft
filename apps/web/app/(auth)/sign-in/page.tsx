import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, GitPullRequestArrow, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

import { GithubSignInForm } from "@/features/auth/components/github-sign-in-form";
import { GoogleSignInForm } from "@/features/auth/components/google-sign-in-form";
import { EmailSignInForm } from "@/features/auth/components/email-sign-in-form";

const trust = ["PRD-first AI review", "GitHub · Google · Email auth", "Role-based team management"];

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="relative grid min-h-dvh lg:grid-cols-2">
        {/* Left — brand / marketing */}
        <section className="relative isolate hidden flex-col justify-between overflow-hidden border-r border-border px-10 py-9 lg:flex lg:px-14">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div
              className="app-grid absolute inset-0"
              style={{
                maskImage: "linear-gradient(to bottom, black 0%, black 45%, transparent 90%)",
                WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 45%, transparent 90%)",
              }}
            />
            <div className="absolute left-0 top-0 h-[420px] w-[560px] -translate-x-1/4 -translate-y-1/4 bg-[var(--glow-primary)] blur-[130px]" />
          </div>

          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Reqraft
          </Link>

          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 border border-border bg-foreground/[0.03] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Product delivery cockpit
            </div>
            <h1 className="mt-7 text-4xl tracking-tight sm:text-5xl sm:leading-[1.08]">
              Sign in and turn every PR into a{" "}
              <span className="text-foreground/45">product-promise check.</span>
            </h1>
            <p className="mt-5 max-w-lg font-mono text-sm leading-relaxed text-muted-foreground">
              Reqraft connects feature requests, PRDs, tasks, GitHub PRs, AI review, and release
              approval in one clean workflow.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-px border border-border bg-border">
              {trust.map((t) => (
                <div key={t} className="bg-card p-4">
                  <ShieldCheck className="size-4 text-primary" />
                  <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">{t}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="font-mono text-[11px] text-muted-foreground/70">
            From idea to reviewed, approved, shipped code — aligned.
          </p>
        </section>

        {/* Right — auth panel */}
        <section className="flex items-center justify-center px-5 py-12 sm:px-8">
          <div className="w-full max-w-md">
            <Link
              href="/"
              className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            >
              <ArrowLeft className="size-4" />
              Back
            </Link>

            <div className="relative border border-border bg-card">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

              <div className="p-6">
                <div className="flex items-center gap-3 border-b border-border pb-5">
                  <span className="grid size-10 shrink-0 place-items-center border border-primary/40 bg-primary/10 text-primary">
                    <LockKeyhole className="size-5" />
                  </span>
                  <div className="flex items-center gap-2">
                    <Image
                      src="/icons/reqraft-icon-transparent-512.png"
                      alt="Reqraft"
                      width={20}
                      height={20}
                      className="size-5"
                    />
                    <div>
                      <p className="text-sm font-medium">Secure workspace access</p>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Choose a sign-in method
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <GithubSignInForm callbackUrl={params.callbackUrl} />
                  <GoogleSignInForm callbackUrl={params.callbackUrl} />
                  <Divider label="or continue with email" />
                  <EmailSignInForm callbackUrl={params.callbackUrl} />
                </div>

                <div className="mt-6 border border-border bg-foreground/[0.02] p-4">
                  <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-primary">
                    <Sparkles className="size-3.5" />
                    After login
                  </div>
                  <div className="mt-3 grid gap-2 font-mono text-xs text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <GitPullRequestArrow className="size-3.5 text-primary" /> Connect GitHub repos & webhooks.
                    </p>
                    <p className="flex items-center gap-2">
                      <ShieldCheck className="size-3.5 text-primary" /> Review PRs against approved PRDs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-5 text-center font-mono text-[11px] leading-relaxed text-muted-foreground">
              By signing in you agree to our{" "}
              <Link href="/terms" className="text-foreground transition-colors hover:text-primary">Terms</Link>{" "}
              &{" "}
              <Link href="/privacy" className="text-foreground transition-colors hover:text-primary">Privacy</Link>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
