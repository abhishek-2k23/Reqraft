"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ExternalLink, GitBranch, Github, ShieldCheck } from "lucide-react";

import { ShipFlowShell } from "~/components/shipflow/shell";
import { trpc } from "~/trpc/client";

const FADE_UP_ANIMATION_VARIANTS = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

function getInstallUrl() {
  const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME;
  // If the app name isn't set in .env, direct the user to create one instead of the marketplace.
  return appName ? `https://github.com/apps/${appName}/installations/new` : "https://github.com/settings/apps/new";
}

export default function GithubPage() {
  const { data: installStatus = { installed: false, installation: null } } = trpc.github.getInstallationStatus.useQuery();

  return (
    <ShipFlowShell
      active="/github"
      title="GitHub Integration"
      description="Connect repositories to enable AI code review."
    >
      <motion.div 
        initial="hidden" 
        animate="show" 
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }} 
        className="mt-6 grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]"
      >
        <motion.div variants={FADE_UP_ANIMATION_VARIANTS} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 p-8 shadow-2xl backdrop-blur-xl transition-all hover:border-white/20 hover:bg-zinc-900/40">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-3xl transition-all group-hover:bg-orange-500/20" />
          
          <div className="mb-8 flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-xl bg-white/5 text-zinc-400 transition-colors group-hover:bg-orange-500/20 group-hover:text-orange-400">
              <Github className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">GitHub App</h2>
              <p className="text-sm text-zinc-500">Repository access</p>
            </div>
          </div>

          {installStatus.installed ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <ShieldCheck className="size-5 text-emerald-400" />
              <p className="font-medium text-emerald-400">Successfully Connected</p>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm leading-relaxed text-zinc-400">
                Install the ShipFlow GitHub App to automatically sync pull requests, trigger AI code reviews, and post status checks directly to your repositories.
              </p>
              <a
                href={getInstallUrl()}
                className="group/btn relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.2)] transition-all hover:scale-[1.02] hover:bg-orange-400 active:scale-[0.98]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Install GitHub App
                  <ExternalLink className="size-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                </span>
              </a>
            </div>
          )}
        </motion.div>

        <motion.div variants={FADE_UP_ANIMATION_VARIANTS} className="rounded-2xl border border-white/10 bg-zinc-950/40 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 flex items-center gap-3">
            <GitBranch className="size-5 text-zinc-400" />
            <h2 className="text-base font-semibold text-white">How it works</h2>
          </div>
          
          <div className="relative border-l border-white/10 pl-6 space-y-8">
            {[
              { title: "Install the GitHub App", desc: "Grant access to your selected repositories." },
              { title: "Link your project", desc: "Connect a repository to a ShipFlow feature." },
              { title: "Create a branch", desc: "Use the format feature/{featureId} for automatic tracking." },
              { title: "Open a pull request", desc: "ShipFlow will automatically detect the new PR." },
              { title: "Automated AI Review", desc: "Code is reviewed against the PRD requirements and commented on." },
            ].map((step, index) => (
              <div key={index} className="relative">
                <span className="absolute -left-[37px] grid size-7 place-items-center rounded-full border border-orange-500/30 bg-zinc-950 font-mono text-[11px] font-bold text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">{step.title}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </ShipFlowShell>
  );
}
