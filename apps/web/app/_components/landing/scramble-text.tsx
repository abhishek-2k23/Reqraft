"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

/**
 * Decode-style heading: when scrolled into view the letters shuffle for ~1.7s,
 * locking in left-to-right, then stay static. The shuffle pool is the text's
 * own letters, so nothing foreign ever flashes through a heading.
 * Renders the real text on the server (SEO) and for reduced-motion users.
 */
export function ScrambleText({
  text,
  className,
  duration = 1700,
}: {
  text: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-70px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (!inView || reduce) return;
    // shuffle pool: only the characters that appear in the text itself
    const pool = Array.from(new Set(text.replace(/\s/g, "").split("")));
    if (pool.length === 0) return;
    let raf = 0;
    const start = performance.now();
    // glyphs churn at a relaxed ~14fps so the shuffle reads calm, not frantic
    let lastSwap = 0;
    const SWAP_MS = 70;

    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      if (p >= 1) {
        setDisplay(text);
        return;
      }
      if (now - lastSwap >= SWAP_MS) {
        lastSwap = now;
        const locked = Math.floor(p * text.length);
        let out = text.slice(0, locked);
        for (let i = locked; i < text.length; i++) {
          const ch = text[i]!;
          out += ch === " " ? " " : pool[Math.floor(Math.random() * pool.length)];
        }
        setDisplay(out);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, text, duration]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      {display}
    </span>
  );
}
