"use client";

import { useState } from "react";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { useActiveProject } from "./project-context";
import { trpc } from "~/trpc/client";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Square, token-driven dialog that creates a project via `project.create`.
 * `trigger` is rendered as the dialog opener (e.g. the PageHeader CTA).
 */
export function CreateProjectDialog({ trigger }: { trigger: React.ReactNode }) {
  const utils = trpc.useUtils();
  const { setActiveProjectId } = useActiveProject();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const create = trpc.project.create.useMutation({
    onSuccess: (project) => {
      toast.success(`Project “${project?.name}” created`);
      void utils.project.list.invalidate();
      if (project) setActiveProjectId(project.id);
      setName("");
      setDescription("");
      setOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const slug = slugify(name);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="border-border bg-popover sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Group features, PRDs, tasks, repos, and reviews under one project.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-project-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !slug) return;
            create.mutate({ name: name.trim(), slug, description: description.trim() || undefined });
          }}
          className="grid gap-4 py-2"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="project-name" className="text-xs text-muted-foreground">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mobile App"
              autoFocus
              required
            />
            {slug ? <p className="font-mono text-[11px] text-muted-foreground">/{slug}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="project-desc" className="text-xs text-muted-foreground">
              Description <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Input
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this project delivers"
            />
          </div>
        </form>

        <DialogFooter>
          <button
            type="submit"
            form="create-project-form"
            disabled={!name.trim() || !slug || create.isPending}
            className="inline-flex h-9 items-center justify-center gap-2 bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform hover:opacity-95 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
          >
            {create.isPending ? <Spinner className="size-4" /> : <FolderPlus className="size-4" />}
            Create project
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
