"use client";

import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import {
  Check,
  FileText,
  Inbox,
  ListChecks,
  MessagesSquare,
  Rocket,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import type { IconType } from "react-icons";

import { cn } from "@/lib/utils";
import { SpotlightCard } from "./spotlight-card";
import { MiniViz, type VizKind } from "./mini-viz";

const VB_W = 1600;
const VB_H = 1000;
const HUB: [number, number] = [800, 500];

type Tone = "primary" | "success" | "muted";

type Tile = {
  id: string;
  title: string;
  sub: string;
  icon?: LucideIcon;
  brand?: IconType;
  tone?: Tone;
  viz: VizKind;
  at: [number, number];
};

const C = { l: 246, m: 800, r: 1354 };
const R = { t: 152, m: 500, b: 848 };

const tiles: Tile[] = [
  { id: "intake", title: "Intake", sub: "Capture the ask", icon: Inbox, viz: "intake", at: [C.l, R.t] },
  { id: "clarify", title: "Clarify", sub: "AI asks the gaps", icon: MessagesSquare, tone: "primary", viz: "clarify", at: [C.m, R.t] },
  { id: "prd", title: "PRD", sub: "Structured spec", icon: FileText, tone: "primary", viz: "prd", at: [C.r, R.t] },
  { id: "tasks", title: "Tasks", sub: "Dev breakdown", icon: ListChecks, viz: "tasks", at: [C.l, R.m] },
  { id: "review", title: "Review", sub: "PRD-aware gate", icon: ShieldCheck, tone: "primary", viz: "review", at: [C.r, R.m] },
  { id: "github", title: "GitHub", sub: "Raise & sync PRs", brand: SiGithub, tone: "muted", viz: "pr", at: [C.l, R.b] },
  { id: "approve", title: "Approve", sub: "Human sign-off", icon: Check, viz: "approve", at: [C.m, R.b] },
  { id: "ship", title: "Ship", sub: "Reviewed release", icon: Rocket, tone: "success", viz: "ship", at: [C.r, R.b] },
];

function badgeTone(t: Tone | undefined) {
  if (t === "success") return "text-success";
  if (t === "primary") return "text-primary";
  return "text-muted-foreground";
}

function TileCard({ tile }: { tile: Tile }) {
  const Icon = tile.icon;
  const Brand = tile.brand;
  return (
    <SpotlightCard className="flex flex-col justify-between p-4">
      <span
        className={cn(
          "grid size-9 place-items-center rounded-full border border-border bg-foreground/[0.04]",
          badgeTone(tile.tone),
        )}
      >
        {Brand ? <Brand className="size-4 text-foreground" /> : Icon ? <Icon className="size-4" /> : null}
      </span>

      <MiniViz kind={tile.viz} />

      <div>
        <p className="text-sm font-medium">{tile.title}</p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{tile.sub}</p>
      </div>
    </SpotlightCard>
  );
}

function Hub() {
  return (
    <div className="relative flex flex-col items-center justify-center border border-primary/40 bg-card p-6 text-center shadow-[0_0_44px_var(--glow-primary)]">
      <div className="pointer-events-none absolute inset-0 bg-[var(--glow-primary)] blur-2xl" />
      <span className="relative grid size-16 place-items-center rounded-full border border-primary/40 bg-primary/5">
        <span className="absolute inline-flex size-16 animate-ping rounded-full bg-primary/15" />
        <Image
          src="/icons/reqraft-icon-transparent-512.png"
          alt="Reqraft"
          width={40}
          height={40}
          className="relative size-10"
        />
      </span>
      <p className="relative mt-4 text-base font-medium">Reqraft AI</p>
      <p className="relative mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Agentic core</p>
    </div>
  );
}

export function HubBento() {
  const reduce = useReducedMotion();

  return (
    <div className="mt-16">
      {/* Desktop: bento grid + radiating flow lines */}
      <div className="relative hidden aspect-[16/10] lg:block">
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 z-0 size-full" preserveAspectRatio="none">
          {tiles.map((t) => (
            <line
              key={`l-${t.id}`}
              x1={HUB[0]}
              y1={HUB[1]}
              x2={t.at[0]}
              y2={t.at[1]}
              strokeWidth={1}
              className={t.tone === "success" ? "stroke-success/35" : "stroke-primary/20"}
            />
          ))}
        </svg>
        {!reduce && (
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 z-0 size-full">
            {tiles.map((t, i) => (
              <circle key={`p-${t.id}`} r={4} className={t.tone === "success" ? "fill-success" : "fill-primary"}>
                <animateMotion
                  dur="3s"
                  begin={`${i * 0.35}s`}
                  repeatCount="indefinite"
                  path={`M${HUB[0]},${HUB[1]} L${t.at[0]},${t.at[1]}`}
                />
              </circle>
            ))}
          </svg>
        )}

        <div className="relative z-10 grid h-full grid-cols-[1fr_1.25fr_1fr] grid-rows-[1fr_1.3fr_1fr] gap-3">
          <TileCard tile={tiles[0]!} />
          <TileCard tile={tiles[1]!} />
          <TileCard tile={tiles[2]!} />
          <TileCard tile={tiles[3]!} />
          <Hub />
          <TileCard tile={tiles[4]!} />
          <TileCard tile={tiles[5]!} />
          <TileCard tile={tiles[6]!} />
          <TileCard tile={tiles[7]!} />
        </div>
      </div>

      {/* Mobile: hub on top, tiles in a 2-col grid */}
      <div className="lg:hidden">
        <Hub />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {tiles.map((t) => (
            <TileCard key={t.id} tile={t} />
          ))}
        </div>
      </div>
    </div>
  );
}
