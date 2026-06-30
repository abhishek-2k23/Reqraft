"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, SendHorizontal } from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "~/components/ui/textarea";
import { PageHeader } from "~/components/shipflow/ui-kit";
import { useActiveProject } from "~/components/shipflow/project-context";
import { trpc } from "~/trpc/client";

type Priority = "low" | "medium" | "high" | "urgent";

export default function NewFeaturePage() {
  const router = useRouter();
  const { projects, activeProjectId, isLoading: loadingProjects } = useActiveProject();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  // Default the form to the currently-active project once it resolves
  useEffect(() => {
    if (!projectId && activeProjectId) setProjectId(activeProjectId);
  }, [activeProjectId, projectId]);

  const createFeature = trpc.feature.create.useMutation({
    onSuccess: (feature) => {
      if (!feature) {
        toast.error("Feature was not created");
        return;
      }

      toast.success("Feature request created");
      router.push(`/features/${feature.id}`);
      router.refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="New feature request"
        description="Start with the messy real-world ask. Reqraft will turn it into a structured delivery workflow."
      />
      <div className="max-w-3xl rounded-lg border border-foreground/10 bg-foreground/[0.045] p-5">
        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-foreground/80">Feature title</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="AI release approval gate"
              className="border-foreground/10 bg-foreground/5 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description" className="text-foreground/80">Raw client request</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Explain what the client or team wants, what problem it solves, and any known constraints."
              className="min-h-44 border-foreground/10 bg-foreground/5 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-foreground/80">Project</Label>
              <Select
                value={projectId}
                onValueChange={setProjectId}
                disabled={loadingProjects}
              >
                <SelectTrigger className="w-full border-foreground/10 bg-foreground/5 text-foreground">
                  <SelectValue placeholder={loadingProjects ? "Loading…" : "Select project"} />
                </SelectTrigger>
                <SelectContent className="border-foreground/10 bg-[#0d1118]">
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-foreground/80 focus:bg-foreground/10 focus:text-foreground">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projects.length === 0 && !loadingProjects && (
                <p className="text-xs text-amber-400">No projects yet — create one in Settings first.</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label className="text-foreground/80">Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
                <SelectTrigger className="w-full border-foreground/10 bg-foreground/5 text-foreground">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="button"
            disabled={!title.trim() || !description.trim() || !projectId.trim() || createFeature.isPending}
            onClick={() => createFeature.mutate({ title, description, projectId, priority })}
            className="w-fit bg-primary text-primary-foreground hover:bg-primary"
          >
            {createFeature.isPending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
            Create feature
          </Button>
        </div>
      </div>
    </div>
  );
}
