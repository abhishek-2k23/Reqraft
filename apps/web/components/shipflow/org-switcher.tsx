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
      <DropdownMenuTrigger className="flex w-full items-center gap-2 border border-border bg-foreground/[0.02] px-2.5 py-2 text-left transition-colors hover:bg-foreground/[0.06] focus:outline-none">
        <div className="grid size-6 shrink-0 place-items-center bg-primary/15 text-primary">
          <Building2 className="size-3.5" />
        </div>
        <span className="flex-1 truncate text-xs font-medium text-foreground">
          {current?.name ?? "Select org"}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-52 border-border bg-popover">
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onSelect={() => switchOrg(org.id)}
            className={`text-sm ${org.id === current?.id ? "text-primary" : "text-muted-foreground"} cursor-pointer`}
          >
            <Building2 className="mr-2 size-4 shrink-0" />
            <span className="truncate">{org.name}</span>
            {org.id === current?.id && (
              <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-primary">active</span>
            )}
          </DropdownMenuItem>
        ))}

        {orgs.length > 0 && <DropdownMenuSeparator className="bg-border" />}

        <DropdownMenuItem
          onSelect={() => router.push("/settings")}
          className="cursor-pointer text-sm text-muted-foreground"
        >
          <Plus className="mr-2 size-4" />
          New organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
