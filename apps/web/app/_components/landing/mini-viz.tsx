"use client";

export type VizKind =
  | "intake"
  | "clarify"
  | "prd"
  | "tasks"
  | "review"
  | "pr"
  | "approve"
  | "ship"
  | "realtime"
  | "roles"
  | "jobs";

const box = "h-12 w-full";

export function MiniViz({ kind }: { kind: VizKind }) {
  switch (kind) {
    case "intake":
      // input field with a blinking caret + a line "typing" in
      return (
        <svg viewBox="0 0 120 48" className={box}>
          <rect x="12" y="16" width="96" height="16" className="fill-none stroke-border" />
          <rect x="18" y="22" className="fill-primary" width="2" height="4" style={{ animation: "viz-blink 1s steps(1) infinite" }} />
          <rect x="24" y="23" height="2" className="fill-foreground/25" width="64" style={{ transformOrigin: "left", animation: "viz-bar 2.4s ease-in-out infinite" }} />
        </svg>
      );

    case "clarify":
      // two chat bubbles appearing alternately
      return (
        <svg viewBox="0 0 120 48" className={box}>
          <rect x="10" y="8" width="50" height="13" className="fill-foreground/10 stroke-border" style={{ animation: "viz-appear 2.6s ease-in-out infinite" }} />
          <rect x="60" y="27" width="50" height="13" className="fill-primary/15 stroke-primary/40" style={{ animation: "viz-appear 2.6s ease-in-out 1.1s infinite" }} />
        </svg>
      );

    case "prd":
      // document with lines writing in sequentially + caret
      return (
        <svg viewBox="0 0 120 48" className={box}>
          <rect x="30" y="6" width="60" height="36" className="fill-none stroke-border" />
          {[14, 21, 28].map((y, i) => (
            <rect key={y} x="36" y={y} height="3" width={[44, 38, 30][i]} className="fill-foreground/20" style={{ transformOrigin: "left", animation: `viz-bar 2.7s ease-in-out ${i * 0.4}s infinite` }} />
          ))}
          <rect x="36" y="34" width="2" height="4" className="fill-primary" style={{ animation: "viz-blink 1s steps(1) infinite" }} />
        </svg>
      );

    case "tasks":
      // checklist — boxes ticked one by one
      return (
        <svg viewBox="0 0 120 48" className={box}>
          {[8, 20, 32].map((y, i) => (
            <g key={y}>
              <rect x="22" y={y} width="9" height="9" className="fill-none stroke-border" />
              <path d={`M24,${y + 5} l2.5,2.5 l4,-5`} className="fill-none stroke-primary" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={14} style={{ animation: `viz-draw 3s ease-in-out ${i * 0.5}s infinite` }} />
              <rect x="38" y={y + 3} height="3" width={[52, 44, 36][i]} className="fill-foreground/15" />
            </g>
          ))}
        </svg>
      );

    case "review":
      // document with a scan bar sweeping over it
      return (
        <div className="relative h-12 overflow-hidden">
          <div className="absolute inset-0 mx-auto flex w-2/3 flex-col justify-center gap-1.5 border border-border px-3">
            {["82%", "60%", "72%"].map((w, i) => (
              <div key={i} className="h-1 bg-foreground/12" style={{ width: w }} />
            ))}
          </div>
          <div className="absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-primary/30 to-transparent" style={{ animation: "viz-scan 2.4s ease-in-out infinite" }} />
        </div>
      );

    case "pr":
      // git branch + a pulsing PR node
      return (
        <svg viewBox="0 0 120 48" className={box}>
          <path d="M28,42 L28,6" className="stroke-border" strokeWidth={2} fill="none" />
          <path d="M28,26 C 52,26 64,26 84,12" className="stroke-primary/60" strokeWidth={2} fill="none" />
          <circle cx="28" cy="42" r="3" className="fill-foreground/30" />
          <circle cx="28" cy="26" r="3" className="fill-foreground/30" />
          <circle cx="88" cy="10" r="5" className="fill-none stroke-primary" strokeWidth={2} style={{ transformOrigin: "88px 10px", animation: "viz-pop 2.6s ease-in-out infinite" }} />
          <path d="M98,10 l8,0 m-3,-3 l3,3 l-3,3" className="stroke-primary/70" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "viz-appear 2.6s ease-in-out infinite" }} />
        </svg>
      );

    case "approve":
      // green tick drawing inside a circle
      return (
        <svg viewBox="0 0 120 48" className={box}>
          <circle cx="60" cy="24" r="14" className="fill-success/10 stroke-success/40" />
          <path d="M53,24 l5,5 l9,-11" className="fill-none stroke-success" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={40} style={{ animation: "viz-draw 2.4s ease-in-out infinite" }} />
        </svg>
      );

    case "ship":
      // rocket rising with exhaust
      return (
        <svg viewBox="0 0 120 48" className={box}>
          <g style={{ animation: "viz-rise 2s ease-in-out infinite" }}>
            <path d="M60,8 C 66,16 66,26 60,32 C 54,26 54,16 60,8 Z" className="fill-primary/20 stroke-primary" strokeWidth={1.5} />
            <circle cx="60" cy="18" r="2.5" className="fill-success" />
            <path d="M55,30 l-4,8 M65,30 l4,8 M60,32 l0,9" className="stroke-primary/50" strokeWidth={1.5} strokeLinecap="round" />
          </g>
        </svg>
      );

    case "realtime":
      // broadcast waves
      return (
        <div className="flex h-12 items-center justify-center">
          <span className="relative flex size-3 items-center justify-center">
            <span className="absolute size-3 animate-ping rounded-full" style={{ background: "var(--glow-primary)" }} />
            <span className="absolute size-6 animate-ping rounded-full [animation-delay:0.4s]" style={{ background: "var(--glow-primary)" }} />
            <span className="size-2 rounded-full bg-primary" />
          </span>
        </div>
      );

    case "roles":
      // avatars popping in
      return (
        <div className="flex h-12 items-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-6 rounded-full border border-border bg-foreground/[0.06]"
              style={{ animation: `viz-pop 3s ease-in-out ${i * 0.4}s infinite` }}
            />
          ))}
          <span className="grid size-6 place-items-center rounded-full border border-primary/40 bg-primary/10 font-mono text-[9px] text-primary" style={{ animation: "viz-pop 3s ease-in-out 1.2s infinite" }}>
            +
          </span>
        </div>
      );

    case "jobs":
      // queue of jobs processing one by one
      return (
        <div className="flex h-12 items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-6 flex-1 border border-border bg-primary/15"
              style={{ transformOrigin: "left", animation: `viz-bar 2.8s ease-in-out ${i * 0.3}s infinite` }}
            />
          ))}
        </div>
      );
  }
}
