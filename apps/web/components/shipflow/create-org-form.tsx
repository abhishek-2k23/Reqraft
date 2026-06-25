"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { trpc } from "~/trpc/client";

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function CreateOrgForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [open, setOpen] = useState(false);

  const create = trpc.org.create.useMutation({
    onSuccess: () => {
      toast.success("Organization created");
      router.refresh();
      setOpen(false);
      setName("");
      setSlug("");
    },
    onError: (error) => toast.error(error.message),
  });

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">
        <Plus className="size-4" />
        Create new organization
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label htmlFor="org-name" className="text-slate-300">Name</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSlug(toSlug(event.target.value));
          }}
          placeholder="My Team"
          className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-600"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="org-slug" className="text-slate-300">Slug</Label>
        <Input
          id="org-slug"
          value={slug}
          onChange={(event) => setSlug(toSlug(event.target.value))}
          placeholder="my-team"
          className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-600"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => create.mutate({ name, slug })}
          disabled={!name.trim() || !slug.trim() || create.isPending}
          className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"
        >
          {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Create
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-slate-400 hover:bg-white/10 hover:text-slate-100">
          Cancel
        </Button>
      </div>
    </div>
  );
}
