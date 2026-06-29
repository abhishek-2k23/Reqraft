"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Clock,
  ListTodo,
  LogOut,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/trpc/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDisplayName, getInitials } from "@/features/auth/components/user-menu";
import { SIGN_IN_PATH } from "@/features/auth/utils";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const memberships = trpc.profile.memberships.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const myTasks = trpc.profile.myTasks.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await authClient.signOut({
      fetchOptions: { onSuccess: () => router.push(SIGN_IN_PATH) },
    });
  }

  if (sessionPending) {
    return <ProfileSkeleton />;
  }

  if (!session?.user) {
    router.push(SIGN_IN_PATH);
    return null;
  }

  const user = session.user;
  const displayName = getDisplayName(user);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-5">
        <Avatar className="size-20 ring-2 ring-white/10">
          {user.image ? <AvatarImage src={user.image} alt={displayName} /> : null}
          <AvatarFallback className="text-2xl">{getInitials(user)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">{displayName}</h1>
          {user.email ? <p className="text-sm text-slate-400 truncate">{user.email}</p> : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-slate-400 hover:text-red-400"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>

      {/* Organizations */}
      <Section icon={<Building2 className="size-4" />} title="Organizations">
        {memberships.isPending ? (
          <CardSkeleton />
        ) : memberships.data?.length === 0 ? (
          <EmptyState text="You're not a member of any organization yet." />
        ) : (
          <div className="grid gap-3">
            {memberships.data?.map((m) => (
              <button
                key={m.orgId}
                type="button"
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.06]"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cyan-300/10 text-lg font-bold text-cyan-300">
                  {m.orgName?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{m.orgName}</p>
                  <p className="text-xs text-slate-500 capitalize">{m.plan} plan · {m.memberCount} members</p>
                </div>
                <RoleBadge role={m.role} />
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* My Tasks */}
      <Section icon={<ListTodo className="size-4" />} title="My Tasks">
        {myTasks.isPending ? (
          <CardSkeleton />
        ) : myTasks.data?.length === 0 ? (
          <EmptyState text="No tasks assigned to you yet." />
        ) : (
          <div className="grid gap-2">
            {myTasks.data?.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <TaskStatusIcon status={task.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{task.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{task.orgName} · {task.featureTitle}</p>
                </div>
                <span className="shrink-0 text-xs capitalize text-slate-500">{task.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <h2 className="text-sm font-semibold uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    owner: "bg-amber-400/10 text-amber-300 border-amber-400/20",
    admin: "bg-purple-400/10 text-purple-300 border-purple-400/20",
    manager: "bg-blue-400/10 text-blue-300 border-blue-400/20",
    developer: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${colors[role] ?? "bg-white/5 text-slate-400 border-white/10"}`}>
      {role}
    </span>
  );
}

function TaskStatusIcon({ status }: { status: string }) {
  if (status === "done") return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />;
  if (status === "in_progress") return <Clock className="mt-0.5 size-4 shrink-0 text-cyan-400" />;
  return <div className="mt-1 size-3 shrink-0 rounded-full border border-slate-600" />;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <div className="flex items-center gap-5">
        <Skeleton className="size-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
    </div>
  );
}
