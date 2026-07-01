// Shared, dependency-free renderer that turns a PRD into a standalone,
// print-ready HTML document. Used in two places so the artifact looks identical
// everywhere:
//   • the web app's "Download" action (client-side Blob download), and
//   • the "Share" email (server-side, attached as a .html file).
// It intentionally uses only inline styles and no runtime deps so it is safe to
// import from both the client bundle and the tRPC server.

export type PrdDocumentData = {
  featureTitle: string;
  priority: string;
  status: string;
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
  createdByName: string | null;
  createdAt: string | Date;
  orgName: string | null;
  // When the document was generated/exported (defaults to now).
  generatedAt?: string | Date;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// URL/file-safe slug used for the downloaded/attached filename.
export function prdDocumentFilename(title: string): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "product-requirements";
  return `PRD-${slug}.html`;
}

function listSection({
  title,
  subtitle,
  items,
  audience,
  accent,
  ordered,
  checklist,
}: {
  title: string;
  subtitle?: string;
  items: string[];
  audience?: "Managers" | "Developers" | "Everyone";
  accent: string; // hex
  ordered?: boolean;
  checklist?: boolean;
}): string {
  if (!items || items.length === 0) return "";

  const badge = audience
    ? `<span style="display:inline-block;margin-left:10px;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:${accent};background:${accent}14;border:1px solid ${accent}33;vertical-align:middle;">For ${audience}</span>`
    : "";

  const rows = items
    .map((item, i) => {
      const marker = checklist
        ? `<span style="flex:0 0 auto;margin-top:2px;display:inline-block;width:16px;height:16px;border-radius:4px;border:1.5px solid ${accent};color:${accent};font-size:11px;line-height:14px;text-align:center;">✓</span>`
        : ordered
          ? `<span style="flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;background:${accent}1a;color:${accent};font-size:12px;font-weight:700;">${i + 1}</span>`
          : `<span style="flex:0 0 auto;margin-top:8px;width:7px;height:7px;border-radius:999px;background:${accent};"></span>`;
      return `<li style="display:flex;gap:12px;padding:9px 0;border-top:${i === 0 ? "0" : "1px solid #eef0f4"};font-size:15px;line-height:1.6;color:#2b2f38;">${marker}<span>${escapeHtml(item)}</span></li>`;
    })
    .join("");

  return `
    <section style="margin-top:30px;">
      <h2 style="margin:0;font-size:19px;font-weight:700;color:#12141a;letter-spacing:-0.2px;border-left:4px solid ${accent};padding-left:12px;">
        ${escapeHtml(title)}${badge}
      </h2>
      ${subtitle ? `<p style="margin:8px 0 0 16px;font-size:13.5px;color:#6b7280;">${escapeHtml(subtitle)}</p>` : ""}
      <ul style="list-style:none;margin:14px 0 0;padding:0 0 0 16px;">${rows}</ul>
    </section>`;
}

function metaPill(label: string, value: string, accent: string): string {
  return `
    <td style="padding:0 10px 0 0;vertical-align:top;">
      <div style="border:1px solid #e6e8ee;border-radius:10px;padding:12px 14px;background:#fbfbfd;min-width:130px;">
        <div style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#8a90a0;">${escapeHtml(label)}</div>
        <div style="margin-top:5px;font-size:15px;font-weight:600;color:${accent};">${escapeHtml(value)}</div>
      </div>
    </td>`;
}

export function renderPrdDocumentHtml(data: PrdDocumentData): string {
  const approved = Boolean(data.approvedAt);
  const statusLabel = data.status.replace(/_/g, " ");

  const heroMeta = `
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin-top:22px;">
      <tr>
        ${metaPill("Version", `v${data.version}`, "#4f46e5")}
        ${metaPill("Status", approved ? "Approved" : statusLabel, approved ? "#0f9d58" : "#b45309")}
        ${metaPill("Priority", data.priority, "#0f172a")}
        ${metaPill("Est. effort", data.estimatedTotalHours ? `~${data.estimatedTotalHours}h` : "—", "#0284c7")}
        ${metaPill("Target date", formatDate(data.targetDeadline), "#7c3aed")}
      </tr>
    </table>`;

  const body = [
    // Problem — highlighted intro block
    `<section style="margin-top:30px;">
       <h2 style="margin:0;font-size:19px;font-weight:700;color:#12141a;border-left:4px solid #4f46e5;padding-left:12px;">Overview &amp; Problem</h2>
       <div style="margin-top:14px;padding:18px 20px;background:#f5f6ff;border:1px solid #e0e3ff;border-radius:12px;font-size:15.5px;line-height:1.7;color:#2b2f38;">
         ${escapeHtml(data.problem)}
       </div>
     </section>`,
    listSection({ title: "Goals", subtitle: "What this feature must achieve.", items: data.goals, audience: "Managers", accent: "#0f9d58", checklist: true }),
    listSection({ title: "Non-Goals", subtitle: "Explicitly out of scope.", items: data.nonGoals, audience: "Managers", accent: "#dc2626" }),
    listSection({ title: "User Stories", subtitle: "Who benefits and how.", items: data.userStories, audience: "Everyone", accent: "#4f46e5", ordered: true }),
    listSection({ title: "Success Metrics", subtitle: "How we know it worked.", items: data.successMetrics, audience: "Managers", accent: "#0284c7" }),
    listSection({ title: "Technical Requirements", items: data.technicalRequirements, audience: "Developers", accent: "#7c3aed" }),
    listSection({ title: "Acceptance Criteria", subtitle: "Must all pass before shipping.", items: data.acceptanceCriteria, audience: "Developers", accent: "#0f9d58", checklist: true }),
    listSection({ title: "Dependencies", items: data.dependencies, audience: "Developers", accent: "#d97706" }),
    listSection({ title: "Edge Cases", items: data.edgeCases, audience: "Developers", accent: "#0891b2" }),
    listSection({ title: "Risks & Mitigations", items: data.risks, audience: "Everyone", accent: "#ea580c" }),
  ]
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>PRD — ${escapeHtml(data.featureTitle)}</title>
<style>
  @media print { body { background:#fff !important; } .doc { box-shadow:none !important; border:0 !important; margin:0 !important; } }
  body { margin:0; }
</style>
</head>
<body style="margin:0;padding:32px 16px;background:#eef0f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#12141a;">
  <div class="doc" style="max-width:820px;margin:0 auto;background:#ffffff;border:1px solid #e3e5ec;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(15,20,40,0.08);">
    <!-- Accent bar -->
    <div style="height:5px;background:linear-gradient(90deg,#4f46e5,#0891b2,#0f9d58);"></div>
    <div style="padding:40px 48px 44px;">
      <!-- Header -->
      <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#4f46e5;">Product Requirements Document</p>
      <h1 style="margin:10px 0 0;font-size:32px;font-weight:800;letter-spacing:-0.6px;color:#0b0d12;line-height:1.15;">${escapeHtml(data.featureTitle)}</h1>
      <p style="margin:14px 0 0;font-size:13.5px;color:#6b7280;">
        ${data.orgName ? `${escapeHtml(data.orgName)} · ` : ""}Created by <strong style="color:#374151;">${escapeHtml(data.createdByName ?? "Unknown")}</strong>
        on ${formatDate(data.createdAt)}${approved ? ` · <span style="color:#0f9d58;font-weight:600;">Approved ${formatDate(data.approvedAt)}</span>` : ""}
      </p>
      ${heroMeta}

      ${body}

      <!-- Footer -->
      <div style="margin-top:40px;padding-top:20px;border-top:1px solid #eef0f4;font-size:12px;color:#9aa0ac;">
        Generated ${formatDate(data.generatedAt ?? new Date())} · Reqraft — turns feature ideas into reviewed, approved, shipped software.
      </div>
    </div>
  </div>
</body>
</html>`;
}
