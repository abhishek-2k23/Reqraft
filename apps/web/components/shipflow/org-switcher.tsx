"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, Building2, Plus } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/trpc/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function OrgSwitcher() {
  const router = useRouter();
  const { data: orgs = [] } = trpc.org.list.useQuery();
  const { data: current } = trpc.org.current.useQuery();

  async function switchOrg(organizationId: string) {
    await authClient.organization.setActive({ organizationId });
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-white/10 focus:outline-none">
        <div className="grid size-6 shrink-0 place-items-center rounded bg-cyan-300/20 text-cyan-300">
          <Building2 className="size-3.5" />
        </div>
        <span className="flex-1 truncate text-xs font-medium text-slate-200">
          {current?.name ?? "Select org"}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-slate-500" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-52 border-white/10 bg-[#0d1118]">
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onSelect={() => switchOrg(org.id)}
            className={`text-sm ${org.id === current?.id ? "text-cyan-300" : "text-slate-300"} cursor-pointer focus:bg-white/10 focus:text-white`}
          >
            <Building2 className="mr-2 size-4 shrink-0" />
            <span className="truncate">{org.name}</span>
            {org.id === current?.id && (
              <span className="ml-auto text-[10px] text-cyan-400">active</span>
            )}
          </DropdownMenuItem>
        ))}

        {orgs.length > 0 && <DropdownMenuSeparator className="bg-white/10" />}

        <DropdownMenuItem
          onSelect={() => router.push("/settings")}
          className="cursor-pointer text-sm text-slate-400 focus:bg-white/10 focus:text-white"
        >
          <Plus className="mr-2 size-4" />
          New organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
