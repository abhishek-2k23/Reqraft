"use client";

import { useState } from "react";
import { FolderPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { trpc } from "~/trpc/client";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProjectsSection() {
  const utils = trpc.useUtils();
  const { data: projects = [], isLoading } = trpc.project.list.useQuery();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const create = trpc.project.create.useMutation({
    onSuccess: (p) => {
      toast.success(`Project "${p?.name}" created`);
      setName("");
      setDescription("");
      utils.project.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const slug = slugify(name);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
      <h2 className="mb-4 text-sm font-semibold text-white">Projects</h2>

      {isLoading ? (
        <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
          <Loader2 className="size-3 animate-spin" /> Loading…
        </div>
      ) : projects.length > 0 ? (
        <div className="mb-5 divide-y divide-white/5 rounded-lg border border-white/10">
          {projects.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">{p.name}</p>
                {p.description && (
                  <p className="text-xs text-slate-500">{p.description}</p>
                )}
              </div>
              <span className="font-mono text-xs text-slate-600">/{p.slug}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-sm text-slate-500">No projects yet. Create one to start submitting feature requests.</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !slug) return;
          create.mutate({ name: name.trim(), slug, description: description.trim() || undefined });
        }}
        className="grid gap-3 border-t border-white/10 pt-4"
      >
        <p className="text-xs font-medium text-slate-400">New project</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="proj-name" className="text-xs text-slate-400">Name</Label>
            <Input
              id="proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mobile App"
              required
              className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-600"
            />
            {slug && (
              <p className="font-mono text-[11px] text-slate-600">/{slug}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="proj-desc" className="text-xs text-slate-400">Description <span className="text-slate-600">(optional)</span></Label>
            <Input
              id="proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this project delivers"
              className="border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-600"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={!name.trim() || create.isPending}
          className="w-fit bg-cyan-300 text-slate-950 hover:bg-cyan-200"
        >
          {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <FolderPlus className="size-4" />}
          Create project
        </Button>
      </form>
    </div>
  );
}
