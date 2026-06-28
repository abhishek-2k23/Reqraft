"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";

type State =
  | { status: "loading" }
  | { status: "needs-signin" }
  | { status: "accepting" }
  | { status: "success"; orgName: string }
  | { status: "error"; message: string };

export default function InvitePage() {
  return (
    <Suspense>
      <InvitePageContent />
    </Suspense>
  );
}

function InvitePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [state, setState] = useState<State>({ status: "loading" });

  const { data: session, isPending: sessionPending } = authClient.useSession();

  const inviteQuery = trpc.member.getInvitation.useQuery(
    { invitationId: token ?? "" },
    { enabled: !!token, retry: false },
  );

  const acceptMutation = trpc.member.acceptInvitation.useMutation({
    onSuccess: (data) => {
      setState({ status: "success", orgName: data.orgName ?? "your organization" });
      setTimeout(() => router.push("/dashboard"), 2000);
    },
    onError: (err) => setState({ status: "error", message: err.message }),
  });

  useEffect(() => {
    if (sessionPending || inviteQuery.isPending) return;

    if (!token) {
      setState({ status: "error", message: "Invalid invitation link." });
      return;
    }

    if (inviteQuery.error) {
      setState({ status: "error", message: inviteQuery.error.message });
      return;
    }

    if (!session?.user) {
      setState({ status: "needs-signin" });
      return;
    }

    // User is signed in — auto-accept
    if (inviteQuery.data && state.status === "loading") {
      setState({ status: "accepting" });
      acceptMutation.mutate({ invitationId: token });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, sessionPending, inviteQuery.isPending, inviteQuery.data, inviteQuery.error]);

  function handleSignIn() {
    const callbackUrl = `/invite?token=${token}`;
    router.push(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const invite = inviteQuery.data;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090b10] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1118] p-10 text-center shadow-2xl">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Image src="/icons/reqraft-icon-transparent-512.png" alt="Reqraft" width={32} height={32} className="size-8" priority />
          <span className="text-xl font-bold tracking-tight text-cyan-300">Reqraft</span>
        </div>

        {(state.status === "loading" || state.status === "accepting") && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="size-10 animate-spin text-cyan-300" />
            <p className="text-slate-400">
              {state.status === "accepting" ? "Accepting invitation…" : "Verifying your invitation…"}
            </p>
          </div>
        )}

        {state.status === "needs-signin" && invite && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex size-16 items-center justify-center rounded-full bg-cyan-300/10">
              <Mail className="size-8 text-cyan-300" />
            </div>
            <div>
              <p className="text-xl font-semibold text-white">You're invited to join</p>
              <p className="mt-1 text-2xl font-bold text-cyan-300">{invite.orgName}</p>
              <p className="mt-3 text-sm text-slate-400">
                as a <span className="font-medium text-slate-300">{invite.role}</span>
              </p>
            </div>
            <Button
              onClick={handleSignIn}
              className="w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200"
            >
              Sign in to accept
            </Button>
            <p className="text-xs text-slate-500">
              Don't have an account? You can sign up on the next page.
            </p>
          </div>
        )}

        {state.status === "success" && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2 className="size-14 text-emerald-400" />
            <p className="text-xl font-semibold text-white">You're in!</p>
            <p className="text-sm text-slate-400">
              Welcome to <span className="text-slate-200">{state.orgName}</span>. Redirecting to your dashboard…
            </p>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <XCircle className="size-14 text-red-400" />
            <p className="text-xl font-semibold text-white">Invitation invalid</p>
            <p className="text-sm text-slate-400">{state.message}</p>
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="text-slate-400 hover:text-white"
            >
              Go to homepage
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
