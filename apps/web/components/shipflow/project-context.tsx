"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Check, ChevronsUpDown, FolderGit2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import { trpc } from "~/trpc/client";

type Project = { id: string; name: string; slug: string; description: string | null };

type ProjectContextValue = {
  projects: Project[];
  activeProjectId: string | null;
  activeProject: Project | null;
  setActiveProjectId: (id: string | null) => void;
  isLoading: boolean;
  ready: boolean;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

const STORAGE_PREFIX = "shipflow.activeProject";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { data: org } = trpc.org.current.useQuery();
  const { data: projects = [], isLoading } = trpc.project.list.useQuery();

  // `null` = not yet hydrated from localStorage (avoids SSR mismatch)
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const storageKey = org?.id ? `${STORAGE_PREFIX}.${org.id}` : null;

  // Hydrate the active project from localStorage once we know the org
  useEffect(() => {
    if (!storageKey) return;
    const stored = window.localStorage.getItem(storageKey);
    setActiveProjectIdState(stored);
    setReady(true);
  }, [storageKey]);

  // Once projects load, ensure the active project is valid; default to the first
  useEffect(() => {
    if (!ready || isLoading || projects.length === 0) return;
    const stillExists = activeProjectId && projects.some((p) => p.id === activeProjectId);
    if (!stillExists) {
      const next = projects[0]!.id;
      setActiveProjectIdState(next);
      if (storageKey) window.localStorage.setItem(storageKey, next);
    }
  }, [ready, isLoading, projects, activeProjectId, storageKey]);

  function setActiveProjectId(id: string | null) {
    setActiveProjectIdState(id);
    if (storageKey) {
      if (id) window.localStorage.setItem(storageKey, id);
      else window.localStorage.removeItem(storageKey);
    }
  }

  const value = useMemo<ProjectContextValue>(() => {
    const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;
    return { projects, activeProjectId, activeProject, setActiveProjectId, isLoading, ready };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, activeProjectId, isLoading, ready]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useActiveProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useActiveProject must be used within a ProjectProvider");
  return ctx;
}

export function ProjectSwitcher() {
  const router = useRouter();
  const { projects, activeProject, setActiveProjectId, isLoading } = useActiveProject();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-2.5 rounded-xl border border-cyan-300/25 bg-cyan-300/[0.07] px-3.5 py-2 text-left transition hover:border-cyan-300/40 hover:bg-cyan-300/10 focus:outline-none">
        <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-cyan-300/15 text-cyan-300">
          <FolderGit2 className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-cyan-300/70">Active project</p>
          <p className="truncate text-sm font-semibold text-white">
            {isLoading ? "Loading…" : activeProject?.name ?? "Select project"}
          </p>
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-cyan-300/50" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60 border-white/10 bg-[#0d1118]">
        {projects.length === 0 ? (
          <div className="px-2 py-3 text-xs text-slate-500">No projects yet.</div>
        ) : (
          projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onSelect={() => setActiveProjectId(project.id)}
              className={cn(
                "cursor-pointer text-sm focus:bg-white/10 focus:text-white",
                project.id === activeProject?.id ? "text-cyan-300" : "text-slate-300",
              )}
            >
              <FolderGit2 className="mr-2 size-4 shrink-0" />
              <span className="truncate">{project.name}</span>
              {project.id === activeProject?.id && <Check className="ml-auto size-3.5 text-cyan-400" />}
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onSelect={() => router.push("/settings")}
          className="cursor-pointer text-sm text-slate-400 focus:bg-white/10 focus:text-white"
        >
          <Plus className="mr-2 size-4" />
          New project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
