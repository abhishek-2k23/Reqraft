"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/features", label: "Features" },
  { href: "/prd", label: "PRDs" },
  { href: "/reviews", label: "Reviews" },
  { href: "/billing", label: "Pricing" },
];

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <Image
            src="/icons/reqraft-icon-transparent-512.png"
            alt="Reqraft"
            width={28}
            height={28}
            className="size-7"
            priority
          />
          <span className="text-sm font-medium tracking-tight">Reqraft</span>
        </Link>

        <div className="hidden items-center gap-9 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/sign-in"
            className="group inline-flex h-9 items-center gap-2 border border-foreground bg-foreground px-4 text-xs font-medium text-background transition-colors hover:bg-transparent hover:text-foreground"
          >
            Sign in
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
