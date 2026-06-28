"use client";

import { useState } from "react";
import { Crown, Shield, Briefcase, Code2, Eye, MoreHorizontal, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ShipFlowShell } from "~/components/shipflow/shell";
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
import { trpc } from "~/trpc/client";
import { MEMBER_ROLES, type MemberRole } from "@repo/database/schema";

const ROLE_META: Record<MemberRole, { label: string; icon: typeof Crown; description: string }> = {
  owner:     { label: "Owner",     icon: Crown,     description: "Full control — billing, settings, delete org" },
  admin:     { label: "Admin",     icon: Shield,    description: "Manage members and all projects" },
  manager:   { label: "Manager",   icon: Briefcase, description: "Create features, approve PRDs, ship" },
  developer: { label: "Developer", icon: Code2,     description: "Assigned tasks, connect GitHub, open PRs" },
  viewer:    { label: "Viewer",    icon: Eye,       description: "Read-only access" },
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

function DirectAddForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("developer");
  const utils = trpc.useUtils();

  const add = trpc.member.directAdd.useMutation({
    onSuccess: (member) => {
      toast.success(`${member.name} added to the team`);
      setEmail("");
      utils.member.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        add.mutate({ email, role });
      }}
      className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
    >
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
        <UserPlus className="size-4 text-cyan-300" />
        Add a team member
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        They can sign in immediately with Google or GitHub using this email.
        {/* TODO: replace with email invitation + acceptance link flow */}
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
            disabled={add.isPending || !email}
            className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
          >
            {add.isPending ? <Loader2 className="size-4 animate-spin" /> : "Add member"}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default function TeamPage() {
  const utils = trpc.useUtils();
  const { data: members = [], isLoading } = trpc.member.list.useQuery();

  const updateRole = trpc.member.updateRole.useMutation({
    onSuccess: () => { utils.member.list.invalidate(); toast.success("Role updated"); },
    onError: (err) => toast.error(err.message),
  });

  const removeMember = trpc.member.remove.useMutation({
    onSuccess: () => { utils.member.list.invalidate(); toast.success("Member removed"); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <ShipFlowShell
      active="/settings"
      title="Team"
      description="Manage members, roles, and invitations for your organization."
    >
      <div className="grid max-w-4xl gap-8">
        <DirectAddForm />

        {/* Members list */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-white">Members ({members.length})</h2>
          <div className="overflow-hidden rounded-xl border border-white/10">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-slate-500" />
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {members.map((m) => (
                  <div key={m.memberId} className="flex items-center gap-4 px-5 py-4">
                    {m.image ? (
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
                            onSelect={() => removeMember.mutate({ memberId: m.memberId })}
                          >
                            Remove from org
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </ShipFlowShell>
  );
}
