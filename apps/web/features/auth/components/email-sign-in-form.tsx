"use client";

import { useRef, useState, useTransition } from "react";
import { Eye, EyeOff, Loader2, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signInWithDemo, signInWithEmail } from "../actions";

const DEMO_EMAIL = "demo@shipflow.ai";
const DEMO_PASSWORD = "Demo@ShipFlow2024!";

export function EmailSignInForm({ callbackUrl }: { callbackUrl?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fillingDemo, setFillingDemo] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDemoClick() {
    setFillingDemo(true);
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setShowPassword(true);

    // Short pause so user can see the fields fill in, then auto-submit
    setTimeout(() => {
      setFillingDemo(false);
      startTransition(async () => {
        await signInWithDemo();
      });
    }, 600);
  }

  return (
    <div className="grid gap-4">
      <form ref={formRef} action={signInWithEmail} className="grid gap-3">
        {callbackUrl && (
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="email" className="text-xs text-slate-400">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-600 transition-all duration-300"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="password" className="text-xs text-slate-400">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="border-white/10 bg-white/5 pr-9 text-slate-100 placeholder:text-slate-600 transition-all duration-300"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isPending || fillingDemo || !email || !password}
          className="w-full bg-white/10 text-slate-100 hover:bg-white/20"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          {isPending ? "Signing in…" : "Sign in with Email"}
        </Button>
      </form>

      {/* Demo shortcut — fills credentials and auto-submits */}
      <button
        type="button"
        onClick={handleDemoClick}
        disabled={fillingDemo || isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-amber-400/40 bg-amber-400/5 py-2.5 text-sm font-medium text-amber-300 transition hover:border-amber-400/60 hover:bg-amber-400/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {fillingDemo ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Zap className="size-4" />
        )}
        {fillingDemo ? "Filling demo credentials…" : "Try Demo Account"}
      </button>
    </div>
  );
}
