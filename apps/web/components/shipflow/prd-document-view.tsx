"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  FileText,
  LayoutList,
  Loader2,
  Send,
  Share2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import { trpc } from "~/trpc/client";
import {
  prdDocumentFilename,
  renderPrdDocumentHtml,
  type PrdDocumentData,
} from "@repo/services/shipflow/prd-document";

export type PrdDocFields = {
  version: number;
  problem: string;
  goals: string[];
  nonGoals: string[];
  userStories: string[];
  acceptanceCriteria: string[];
  edgeCases: string[];
  successMetrics: string[];
  technicalRequirements: string[];
  dependencies: string[];
  risks: string[];
  estimatedTotalHours: number | null;
  targetDeadline: string | Date | null;
  approvedAt: string | Date | null;
};

export type PrdDocMeta = {
  featureTitle: string;
  priority: string;
  status: string;
  createdByName: string | null;
  createdAt: string | Date;
  orgName: string | null;
};

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function toDocumentData(fields: PrdDocFields, meta: PrdDocMeta): PrdDocumentData {
  return {
    featureTitle: meta.featureTitle,
    priority: meta.priority,
    status: meta.status,
    version: fields.version,
    problem: fields.problem,
    goals: fields.goals,
    nonGoals: fields.nonGoals,
    userStories: fields.userStories,
    acceptanceCriteria: fields.acceptanceCriteria,
    edgeCases: fields.edgeCases,
    successMetrics: fields.successMetrics,
    technicalRequirements: fields.technicalRequirements,
    dependencies: fields.dependencies,
    risks: fields.risks,
    estimatedTotalHours: fields.estimatedTotalHours,
    targetDeadline: fields.targetDeadline,
    approvedAt: fields.approvedAt,
    createdByName: meta.createdByName,
    createdAt: meta.createdAt,
    orgName: meta.orgName,
    generatedAt: new Date(),
  };
}

// ── View toggle ─────────────────────────────────────────────────────────
export type PrdView = "structured" | "document";

export function PrdViewToggle({ view, onChange }: { view: PrdView; onChange: (v: PrdView) => void }) {
  const options: { value: PrdView; label: string; icon: React.ReactNode }[] = [
    { value: "structured", label: "Structured", icon: <LayoutList className="size-3.5" /> },
    { value: "document", label: "Document", icon: <FileText className="size-3.5" /> },
  ];
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-foreground/[0.03] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={view === o.value}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            view === o.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Toolbar (toggle + download + share) ─────────────────────────────────
export function PrdDocActions({
  view,
  onView,
  fields,
  meta,
  prdId,
  featureId,
}: {
  view: PrdView;
  onView: (v: PrdView) => void;
  fields: PrdDocFields;
  meta: PrdDocMeta;
  prdId: string;
  featureId: string;
}) {
  const [shareOpen, setShareOpen] = useState(false);

  function handleDownload() {
    try {
      const html = renderPrdDocumentHtml(toDocumentData(fields, meta));
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = prdDocumentFilename(meta.featureTitle);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PRD document downloaded");
    } catch {
      toast.error("Could not generate the document");
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <PrdViewToggle view={view} onChange={onView} />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="gap-1.5 border-foreground/10 bg-foreground/5 text-foreground hover:bg-foreground/10"
        >
          <Download className="size-3.5" />
          Download
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => setShareOpen(true)}
          className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary"
        >
          <Share2 className="size-3.5" />
          Share
        </Button>
      </div>
      <PrdShareDialog open={shareOpen} onOpenChange={setShareOpen} prdId={prdId} featureId={featureId} featureTitle={meta.featureTitle} />
    </div>
  );
}

// ── Share dialog ────────────────────────────────────────────────────────
function initials(name: string | null, email: string): string {
  const src = (name ?? email ?? "?").trim();
  return src.slice(0, 1).toUpperCase();
}

function PrdShareDialog({
  open,
  onOpenChange,
  prdId,
  featureId,
  featureTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prdId: string;
  featureId: string;
  featureTitle: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");

  const { data: members = [], isLoading } = trpc.member.list.useQuery(undefined, { enabled: open });

  // Only teammates with a real email address can receive the PRD.
  const eligible = useMemo(
    () => members.filter((m) => m.email && m.email.includes("@")),
    [members],
  );

  const share = trpc.prd.share.useMutation({
    onSuccess: ({ sent, failed }) => {
      toast.success(
        failed > 0
          ? `Shared with ${sent} teammate${sent === 1 ? "" : "s"} · ${failed} failed`
          : `PRD shared with ${sent} teammate${sent === 1 ? "" : "s"}`,
      );
      onOpenChange(false);
      setSelected(new Set());
      setMessage("");
    },
    onError: (error) => toast.error(error.message),
  });

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  const allSelected = eligible.length > 0 && selected.size === eligible.length;
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(eligible.map((m) => m.userId)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-foreground/10 bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Share2 className="size-4 text-primary" />
            Share PRD with your team
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Selected teammates get a beautifully formatted email with the full “{featureTitle}” PRD attached as a document.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Users className="size-3.5" /> Team members
            </p>
            {eligible.length > 0 && (
              <button type="button" onClick={toggleAll} className="text-xs text-primary underline-offset-2 hover:underline">
                {allSelected ? "Clear all" : "Select all"}
              </button>
            )}
          </div>

          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-foreground/10 bg-foreground/[0.02] p-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : eligible.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                No teammates with an email address yet. Invite members from Settings → Team.
              </p>
            ) : (
              eligible.map((m) => {
                const checked = selected.has(m.userId);
                return (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => toggle(m.userId)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
                      checked ? "bg-primary/10" : "hover:bg-foreground/[0.04]",
                    )}
                  >
                    <Checkbox checked={checked} className="pointer-events-none" />
                    {m.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.image} alt={m.name ?? m.email} className="size-7 rounded-full object-cover ring-1 ring-foreground/10" />
                    ) : (
                      <div className="grid size-7 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary ring-1 ring-foreground/10">
                        {initials(m.name, m.email)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{m.name ?? m.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{m.role}</span>
                    {checked && <Check className="size-4 shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Add a message (optional)</p>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              placeholder="e.g. Please review the acceptance criteria before our sync tomorrow."
              className="min-h-20 border-foreground/10 bg-foreground/5 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-foreground/10 bg-foreground/5 text-foreground/80 hover:bg-foreground/10"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={selected.size === 0 || share.isPending}
            onClick={() =>
              share.mutate({
                prdId,
                featureId,
                recipientUserIds: [...selected],
                message: message.trim() || undefined,
              })
            }
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary disabled:opacity-50"
          >
            {share.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {share.isPending ? "Sending…" : `Send to ${selected.size || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── On-screen document view ─────────────────────────────────────────────
type Accent =
  | "indigo"
  | "emerald"
  | "red"
  | "sky"
  | "purple"
  | "amber"
  | "cyan"
  | "orange";

const ACCENT: Record<Accent, { text: string; border: string; bg: string; dot: string; barBg: string }> = {
  indigo:  { text: "text-indigo-500 dark:text-indigo-300", border: "border-indigo-500/40", bg: "bg-indigo-500/[0.06]", dot: "bg-indigo-500", barBg: "bg-indigo-500" },
  emerald: { text: "text-emerald-600 dark:text-emerald-300", border: "border-emerald-500/40", bg: "bg-emerald-500/[0.06]", dot: "bg-emerald-500", barBg: "bg-emerald-500" },
  red:     { text: "text-red-600 dark:text-red-300", border: "border-red-500/40", bg: "bg-red-500/[0.05]", dot: "bg-red-500", barBg: "bg-red-500" },
  sky:     { text: "text-sky-600 dark:text-sky-300", border: "border-sky-500/40", bg: "bg-sky-500/[0.06]", dot: "bg-sky-500", barBg: "bg-sky-500" },
  purple:  { text: "text-purple-600 dark:text-purple-300", border: "border-purple-500/40", bg: "bg-purple-500/[0.06]", dot: "bg-purple-500", barBg: "bg-purple-500" },
  amber:   { text: "text-amber-600 dark:text-amber-300", border: "border-amber-500/40", bg: "bg-amber-500/[0.06]", dot: "bg-amber-500", barBg: "bg-amber-500" },
  cyan:    { text: "text-cyan-600 dark:text-cyan-300", border: "border-cyan-500/40", bg: "bg-cyan-500/[0.06]", dot: "bg-cyan-500", barBg: "bg-cyan-500" },
  orange:  { text: "text-orange-600 dark:text-orange-300", border: "border-orange-500/40", bg: "bg-orange-500/[0.06]", dot: "bg-orange-500", barBg: "bg-orange-500" },
};

function DocSection({
  title,
  subtitle,
  audience,
  items,
  accent,
  variant = "bullet",
}: {
  title: string;
  subtitle?: string;
  audience?: "Managers" | "Developers" | "Everyone";
  items: string[];
  accent: Accent;
  variant?: "bullet" | "numbered" | "checklist";
}) {
  if (!items || items.length === 0) return null;
  const a = ACCENT[accent];
  return (
    <section className="scroll-mt-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <h3 className={cn("border-l-[3px] pl-3 text-lg font-bold text-foreground", a.border)}>{title}</h3>
        {audience && (
          <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", a.border, a.bg, a.text)}>
            For {audience}
          </span>
        )}
      </div>
      {subtitle && <p className="ml-4 mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      <ul className="ml-4 mt-3 space-y-0">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 border-t border-foreground/[0.06] py-2.5 text-[15px] leading-relaxed text-foreground/85 first:border-t-0">
            {variant === "numbered" ? (
              <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold", a.bg, a.text)}>{i + 1}</span>
            ) : variant === "checklist" ? (
              <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded border text-[11px]", a.border, a.text)}>
                <Check className="size-3" />
              </span>
            ) : (
              <span className={cn("mt-2 size-1.5 shrink-0 rounded-full", a.dot)} />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PrdDocumentView({ fields, meta }: { fields: PrdDocFields; meta: PrdDocMeta }) {
  const approved = Boolean(fields.approvedAt);
  const metaCards: { label: string; value: string; accent: Accent }[] = [
    { label: "Version", value: `v${fields.version}`, accent: "indigo" },
    { label: "Status", value: approved ? "Approved" : meta.status.replace(/_/g, " "), accent: approved ? "emerald" : "amber" },
    { label: "Priority", value: meta.priority, accent: "purple" },
    { label: "Est. effort", value: fields.estimatedTotalHours ? `~${fields.estimatedTotalHours}h` : "—", accent: "sky" },
    { label: "Target date", value: formatDate(fields.targetDeadline), accent: "cyan" },
  ];

  return (
    <article className="overflow-hidden rounded-xl border border-foreground/10 bg-card">
      {/* Accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500" />
      <div className="space-y-8 p-6 sm:p-9">
        {/* Header */}
        <header>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Product Requirements Document</p>
          <h2 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-foreground">{meta.featureTitle}</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {meta.orgName ? `${meta.orgName} · ` : ""}Created by{" "}
            <span className="font-medium text-foreground/80">{meta.createdByName ?? "Unknown"}</span> on {formatDate(meta.createdAt)}
            {approved && (
              <span className="text-emerald-600 dark:text-emerald-400"> · Approved {formatDate(fields.approvedAt)}</span>
            )}
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {metaCards.map((c) => {
              const a = ACCENT[c.accent];
              return (
                <div key={c.label} className="min-w-[104px] rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</div>
                  <div className={cn("mt-1 text-sm font-semibold capitalize", a.text)}>{c.value}</div>
                </div>
              );
            })}
          </div>
        </header>

        {/* Problem / overview */}
        <section>
          <h3 className="border-l-[3px] border-indigo-500/40 pl-3 text-lg font-bold text-foreground">Overview &amp; Problem</h3>
          <div className="ml-4 mt-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.05] p-5 text-[15px] leading-relaxed text-foreground/90">
            {fields.problem}
          </div>
        </section>

        <DocSection title="Goals" subtitle="What this feature must achieve." audience="Managers" items={fields.goals} accent="emerald" variant="checklist" />
        <DocSection title="Non-Goals" subtitle="Explicitly out of scope." audience="Managers" items={fields.nonGoals} accent="red" />
        <DocSection title="User Stories" subtitle="Who benefits and how." audience="Everyone" items={fields.userStories} accent="indigo" variant="numbered" />
        <DocSection title="Success Metrics" subtitle="How we know it worked." audience="Managers" items={fields.successMetrics} accent="sky" />
        <DocSection title="Technical Requirements" audience="Developers" items={fields.technicalRequirements} accent="purple" />
        <DocSection title="Acceptance Criteria" subtitle="Must all pass before shipping." audience="Developers" items={fields.acceptanceCriteria} accent="emerald" variant="checklist" />
        <DocSection title="Dependencies" audience="Developers" items={fields.dependencies} accent="amber" />
        <DocSection title="Edge Cases" audience="Developers" items={fields.edgeCases} accent="cyan" />

        {fields.risks.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 border-l-[3px] border-orange-500/40 pl-3 text-lg font-bold text-foreground">
              <AlertTriangle className="size-4 text-orange-500" /> Risks &amp; Mitigations
            </h3>
            <ul className="ml-4 mt-3 space-y-2">
              {fields.risks.map((risk, i) => (
                <li key={i} className="flex gap-3 rounded-lg border border-orange-500/20 bg-orange-500/[0.05] p-3.5 text-[15px] leading-relaxed text-foreground/85">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-orange-500" />
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Footer */}
        <footer className="flex items-center gap-2 border-t border-foreground/10 pt-5 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-primary/70" />
          End of document · {meta.featureTitle} · v{fields.version}
        </footer>
      </div>
    </article>
  );
}
