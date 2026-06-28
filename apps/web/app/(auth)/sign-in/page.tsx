import Link from "next/link";
import { ArrowLeft, Bot, CheckCircle2, GitPullRequestArrow, LockKeyhole, Rocket, ShieldCheck } from "lucide-react";

import { GithubSignInForm } from "@/features/auth/components/github-sign-in-form";
import { GoogleSignInForm } from "@/features/auth/components/google-sign-in-form";
import { EmailSignInForm } from "@/features/auth/components/email-sign-in-form";

const trustItems = [
  "PRD-first AI review workflow",
  "GitHub + Google + Email auth",
  "Role-based team management",
];

function Divider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-xs text-slate-500">{label}</span>
      <div className="h-px flex-1 bg-white/10" />
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
    <main className="min-h-dvh overflow-hidden bg-[#090b10] text-slate-100">
      <div className="absolute inset-0 shipflow-grid opacity-35" />
      <div className="relative grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">

        {/* Left — marketing copy */}
        <section className="flex min-h-dvh flex-col justify-between px-5 py-6 sm:px-8 lg:px-10">
          <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm text-slate-400 transition hover:text-white">
            <ArrowLeft className="size-4" />
            Back to Reqraft
          </Link>

          <div className="max-w-2xl py-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm text-cyan-100">
              <Rocket className="size-4" />
              Product delivery cockpit
            </div>
            <h1 className="mt-6 text-5xl font-semibold leading-tight text-white sm:text-6xl">
              Sign in and turn every PR into a product promise check.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              Reqraft connects feature requests, generated PRDs, engineering tasks, GitHub pull requests, AI review, billing, and release approval in one clean workflow.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {trustItems.map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
                  <CheckCircle2 className="size-4 text-emerald-300" />
                  <p className="mt-3 text-sm leading-5 text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-600">Reqraft keeps product, engineering, and founders aligned from idea to shipped code.</p>
        </section>

        {/* Right — auth panel */}
        <section className="flex items-center justify-center border-t border-white/10 bg-[#0d1118]/80 px-5 py-10 backdrop-blur sm:px-8 lg:border-l lg:border-t-0">
          <div className="w-full max-w-md">
            <div className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/30">

              <div className="mb-6 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-cyan-300 text-slate-950">
                  <LockKeyhole className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Secure workspace access</p>
                  <p className="text-xs text-slate-500">Choose how you want to sign in</p>
                </div>
              </div>

              <div className="grid gap-3">
                {/* OAuth providers */}
                <GithubSignInForm callbackUrl={params.callbackUrl} />
                <GoogleSignInForm callbackUrl={params.callbackUrl} />

                <Divider label="or continue with email" />

                {/* Email + password + demo */}
                <EmailSignInForm callbackUrl={params.callbackUrl} />
              </div>

              <div className="mt-6 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-cyan-100">
                  <Bot className="size-4" />
                  After login
                </div>
                <div className="mt-3 grid gap-2 text-xs leading-5 text-cyan-50/75">
                  <p className="flex items-center gap-2"><GitPullRequestArrow className="size-3.5" /> Connect GitHub repos and webhooks.</p>
                  <p className="flex items-center gap-2"><ShieldCheck className="size-3.5" /> Review PRs against approved PRDs.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
