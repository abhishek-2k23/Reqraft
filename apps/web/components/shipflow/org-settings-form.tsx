"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { trpc } from "~/trpc/client";

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function OrgSettingsForm() {
  const router = useRouter();
  const { data: org, isLoading } = trpc.org.current.useQuery();
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    if (org) {
      setName(org.name);
      setSlug(org.slug);
    }
  }, [org]);

  const update = trpc.org.update.useMutation({
    onSuccess: () => {
      toast.success("Organization updated");
      utils.org.current.invalidate();
      utils.org.list.invalidate();
      router.refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-lg bg-white/5" />;
  }

  if (!org) return null;

  const dirty = name !== org.name || slug !== org.slug;

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="org-name" className="text-xs text-slate-400">Organization name</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-600"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="org-slug" className="text-xs text-slate-400">Slug</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">reqraft.in/</span>
          <Input
            id="org-slug"
            value={slug}
            onChange={(e) => setSlug(toSlug(e.target.value))}
            className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-600"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() => update.mutate({ name, slug })}
          disabled={!dirty || !name.trim() || !slug.trim() || update.isPending}
          className="bg-cyan-300 text-slate-950 hover:bg-cyan-200 disabled:opacity-40"
        >
          {update.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
