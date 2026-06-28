"use client";

import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function UserInfoPanel() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/sign-in");
  }

  return (
    <div className="mt-auto border-t border-white/10 pt-4">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <div className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-slate-300">
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={session.user.name ?? "User"}
              className="size-8 object-cover"
            />
          ) : (
            <User className="size-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-200">
            {session?.user?.name ?? "User"}
          </p>
          <p className="truncate text-xs text-slate-500">
            {session?.user?.email ?? ""}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-red-400"
      >
        <LogOut className="size-4" />
        Sign Out
      </button>
    </div>
  );
}
