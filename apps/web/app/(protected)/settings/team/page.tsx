"use client";

import { useState } from "react";
import { Crown, Shield, Briefcase, Code2, Eye, MoreHorizontal, UserPlus, Loader2, AlertTriangle, Mail } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "~/components/shipflow/ui-kit";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { trpc } from "~/trpc/client";
import { MEMBER_ROLES, type MemberRole } from "@repo/database/schema";

const ROLE_META: Record<MemberRole, { label: string; icon: typeof Crown; description: string }> = {
  owner:     { label: "Owner",     icon: Crown,     description: "Full control — billing, settings, delete org" },
  admin:     { label: "Admin",     icon: Shield,    description: "Manage members and all projects" },
  manager:   { label: "Manager",   icon: Briefcase, description: "Create features, approve PRDs, ship" },
  developer: { label: "Developer", icon: Code2,     description: "Assigned tasks, connect GitHub, open PRs" },
  viewer:    { label: "Viewer",    icon: Eye,       description: "Read-only access" },
};

const STATUS_LABEL: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  blocked: "Blocked",
};

type PendingRemoval = {
  memberId: string;
  userId: string;
  name: string;
};

function RoleBadge({ role }: { role: MemberRole }) {
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  const colors: Record<MemberRole, string> = {
    owner:     "border-amber-400/30 bg-amber-400/10 text-amber-300",
    admin:     "border-purple-400/30 bg-purple-400/10 text-purple-300",
    manager:   "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    developer: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    viewer:    "border-slate-400/30 bg-slate-400/10 text-slate-400",
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[role]}`}>
      <Icon className="size-3" />
      {meta.label}
    </span>
  );
}

function InviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("developer");
  const utils = trpc.useUtils();

  const invite = trpc.member.invite.useMutation({
    onSuccess: () => {
      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      utils.member.listInvitations.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        invite.mutate({ email, role });
      }}
      className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
    >
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
        <UserPlus className="size-4 text-cyan-300" />
        Invite a team member
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        They will receive an email with a link to accept the invitation and join your organization.
      </p>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
        <div className="grid gap-1.5">
          <Label htmlFor="add-email" className="text-xs text-slate-400">Email address</Label>
          <Input
            id="add-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            required
            className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-600"
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-slate-400">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
            <SelectTrigger className="w-36 border-white/10 bg-white/5 text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#0d1118]">
              {MEMBER_ROLES.filter((r) => r !== "owner").map((r) => (
                <SelectItem key={r} value={r} className="text-slate-300 focus:bg-white/10 focus:text-white capitalize">
                  {ROLE_META[r].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            disabled={invite.isPending || !email}
            className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
          >
            {invite.isPending ? <Loader2 className="size-4 animate-spin" /> : "Send invite"}
          </Button>
        </div>
      </div>
    </form>
  );
}

type Member = {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
};

function RemoveMemberModal({
  pending,
  members,
  onConfirm,
  onCancel,
  isPending,
}: {
  pending: PendingRemoval;
  members: Member[];
  onConfirm: (reassignToUserId: string | null) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [reassignTo, setReassignTo] = useState<string>("unassigned");

  const { data: assignedTasks = [], isLoading: loadingTasks } = trpc.member.getAssignedTasks.useQuery(
    { userId: pending.userId },
  );

  // All members except the one being removed
  const reassignOptions = members.filter((m) => m.userId !== pending.userId);

  const hasTasks = assignedTasks.length > 0;
  const leavingUnassigned = reassignTo === "unassigned";

  function handleConfirm() {
    onConfirm(leavingUnassigned ? null : reassignTo);
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="border-white/10 bg-[#0d1118] text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Remove {pending.name}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {hasTasks
              ? `${pending.name} has ${assignedTasks.length} assigned task${assignedTasks.length !== 1 ? "s" : ""}. Choose what to do with them before removing.`
              : `Remove ${pending.name} from the organization? This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>

        {loadingTasks ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-slate-500" />
          </div>
        ) : hasTasks ? (
          <div className="grid gap-4">
            {/* Task list */}
            <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5">
              {assignedTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between px-3 py-2.5 gap-3">
                  <p className="text-sm text-slate-200 truncate flex-1">{task.title}</p>
                  <span className="shrink-0 text-xs text-slate-500">{STATUS_LABEL[task.status] ?? task.status}</span>
                </div>
              ))}
            </div>

            {/* Reassign dropdown */}
            <div className="grid gap-1.5">
              <Label className="text-xs text-slate-400">Reassign tasks to</Label>
              <Select value={reassignTo} onValueChange={setReassignTo}>
                <SelectTrigger className="border-white/10 bg-white/5 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#0d1118]">
                  <SelectItem value="unassigned" className="text-slate-400 focus:bg-white/10 focus:text-white">
                    Leave unassigned
                  </SelectItem>
                  {reassignOptions.map((m) => (
                    <SelectItem key={m.userId} value={m.userId} className="text-slate-300 focus:bg-white/10 focus:text-white">
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Warning when leaving unassigned */}
            {leavingUnassigned && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2.5">
                <AlertTriangle className="size-4 shrink-0 text-amber-400 mt-0.5" />
                <p className="text-xs text-amber-300">
                  {assignedTasks.length} task{assignedTasks.length !== 1 ? "s" : ""} will have no assignee after this member is removed.
                </p>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
            className="text-slate-400 hover:text-white hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || loadingTasks}
            className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 hover:text-red-300"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : "Remove member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamPage() {
  const utils = trpc.useUtils();
  const { data: members = [], isLoading } = trpc.member.list.useQuery();
  const { data: invitations = [], isLoading: isLoadingInvitations } = trpc.member.listInvitations.useQuery();

  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);

  const updateRole = trpc.member.updateRole.useMutation({
    onSuccess: () => { utils.member.list.invalidate(); toast.success("Role updated"); },
    onError: (err) => toast.error(err.message),
  });

  const removeMember = trpc.member.remove.useMutation({
    onSuccess: () => {
      utils.member.list.invalidate();
      toast.success("Member removed");
      setPendingRemoval(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelInvitation = trpc.member.cancelInvitation.useMutation({
    onSuccess: () => {
      utils.member.listInvitations.invalidate();
      toast.success("Invitation cancelled");
    },
    onError: (err) => toast.error(err.message),
  });

  const totalCount = members.length + invitations.length;

  return (
    <div className="space-y-6">
      <PageHeader title="Team" description="Manage members, roles, and invitations for your organization." />
      <div className="grid max-w-4xl gap-8">
        <InviteForm />

        {/* Members + pending invitations list */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-white">Members ({totalCount})</h2>
          <div className="overflow-hidden rounded-xl border border-white/10">
            {isLoading || isLoadingInvitations ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-slate-500" />
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {/* Active members */}
                {members.map((m) => (
                  <div key={m.memberId} className="flex items-center gap-4 px-5 py-4">
                    {m.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- avatar URLs come from arbitrary OAuth providers; next/image would require remotePatterns config
                      <img src={m.image} alt={m.name} className="size-9 rounded-full object-cover" />
                    ) : (
                      <div className="grid size-9 place-items-center rounded-full bg-white/10 text-sm font-semibold text-white">
                        {m.name[0]}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-white">{m.name}</p>
                      <p className="truncate text-xs text-slate-500">{m.email}</p>
                    </div>

                    <RoleBadge role={m.role as MemberRole} />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 text-slate-500 hover:text-white">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-white/10 bg-[#0d1118] w-48">
                        {MEMBER_ROLES.filter((r) => r !== "owner" && r !== m.role).map((r) => (
                          <DropdownMenuItem
                            key={r}
                            className="cursor-pointer text-sm text-slate-300 focus:bg-white/10 focus:text-white"
                            onSelect={() => updateRole.mutate({ memberId: m.memberId, role: r })}
                          >
                            Set as {ROLE_META[r].label}
                          </DropdownMenuItem>
                        ))}
                        {m.role !== "owner" && (
                          <DropdownMenuItem
                            className="cursor-pointer text-sm text-red-400 focus:bg-red-400/10 focus:text-red-300"
                            onSelect={() =>
                              setPendingRemoval({
                                memberId: m.memberId,
                                userId: m.userId,
                                name: m.name,
                              })
                            }
                          >
                            Remove from org
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

                {/* Pending invitations */}
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-4 px-5 py-4 opacity-70">
                    <div className="grid size-9 place-items-center rounded-full border border-dashed border-amber-400/40 bg-amber-400/5 text-amber-400">
                      <Mail className="size-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-slate-300">{inv.email}</p>
                      <p className="truncate text-xs text-slate-500">
                        Invite expires {new Date(inv.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>

                    <RoleBadge role={inv.role as MemberRole} />

                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                      Invited
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 text-slate-500 hover:text-white">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-white/10 bg-[#0d1118] w-48">
                        <DropdownMenuItem
                          className="cursor-pointer text-sm text-red-400 focus:bg-red-400/10 focus:text-red-300"
                          onSelect={() => cancelInvitation.mutate({ invitationId: inv.id })}
                        >
                          Cancel invitation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

                {members.length === 0 && invitations.length === 0 && (
                  <div className="px-5 py-10 text-center text-sm text-slate-500">
                    No members yet. Invite your team above.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {pendingRemoval && (
        <RemoveMemberModal
          pending={pendingRemoval}
          members={members as Member[]}
          onConfirm={(reassignToUserId) =>
            removeMember.mutate({ memberId: pendingRemoval.memberId, reassignToUserId })
          }
          onCancel={() => setPendingRemoval(null)}
          isPending={removeMember.isPending}
        />
      )}
    </div>
  );
}
