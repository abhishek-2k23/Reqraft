import { cn } from "~/lib/utils";

/** Shimmer block — the atom for every page skeleton. */
function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-foreground/[0.06]", className)} />;
}

/** Static (non-pulsing) bordered box — mirrors the icon containers in the real UI. */
function Box({ className }: { className?: string }) {
  return <div className={cn("border border-border bg-foreground/[0.03]", className)} />;
}

/** Mirrors <PageHeader>: big title + description + optional action. */
export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2.5">
        <Bar className="h-8 w-52" />
        <Bar className="h-3.5 w-80 max-w-full" />
      </div>
      <Bar className="hidden h-9 w-36 sm:block" />
    </div>
  );
}

/** Mirrors <StatTile>: mono caption + bordered icon box, big value, detail line. */
export function StatTileSkeleton() {
  return (
    <div className="border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <Bar className="h-2.5 w-24" />
        <Box className="size-8" />
      </div>
      <Bar className="mt-5 h-9 w-16" />
      <Bar className="mt-1.5 h-3 w-32" />
    </div>
  );
}

function StatTilesRow() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatTileSkeleton key={i} />
      ))}
    </div>
  );
}

/** Simple search input row used on the projects page. */
function SearchBarSkeleton() {
  return (
    <div className="flex items-center gap-2 border border-border bg-card px-3 py-2.5">
      <Bar className="size-4" />
      <Bar className="h-3 w-40" />
    </div>
  );
}

/** Generic single-line row (search results). */
export function RowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 border border-border bg-card px-5 py-4">
      <div className="min-w-0 flex-1 space-y-2">
        <Bar className="h-4 w-1/3" />
        <Bar className="h-3 w-2/3" />
      </div>
      <Bar className="h-5 w-20" />
    </div>
  );
}

/** ───────────────────────── Dashboard ───────────────────────── */

// Mirrors the "Delivery pipeline" band: label + 5-cell bordered grid.
function PipelineBandSkeleton() {
  return (
    <div>
      <Bar className="mb-2 h-2.5 w-32" />
      <div className="grid grid-cols-2 overflow-hidden border border-border bg-card sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="border-b border-border p-4 last:border-b-0 sm:border-b-0 lg:border-r lg:last:border-r-0"
          >
            <Bar className="h-2.5 w-12" />
            <Bar className="mt-2 h-7 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Mirrors the "Active features" SectionCard: header band + divided rows.
function ActiveFeaturesSkeleton() {
  return (
    <div className="overflow-hidden border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-foreground/[0.02] px-5 py-4">
        <div className="space-y-2">
          <Bar className="h-4 w-28" />
          <Bar className="h-3 w-44" />
        </div>
        <Bar className="hidden h-9 w-32 sm:block" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid gap-4 px-5 py-4 md:grid-cols-[1.5fr_0.7fr_0.7fr] md:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <Bar className="h-4 w-40" />
                <Bar className="h-4 w-16" />
              </div>
              <Bar className="h-3 w-3/4" />
            </div>
            <Bar className="h-3 w-16" />
            <div className="flex items-center justify-between">
              <Bar className="h-3 w-24" />
              <Bar className="size-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full dashboard-shaped skeleton (stat tiles + pipeline band + active features). */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <StatTilesRow />
      <PipelineBandSkeleton />
      <ActiveFeaturesSkeleton />
    </div>
  );
}

/** ───────────────────────── Features ───────────────────────── */

// Mirrors the "AI intake starts here" tinted banner.
function IntakeBannerSkeleton() {
  return (
    <div className="space-y-3 border border-primary/30 bg-primary/[0.06] p-5">
      <Bar className="h-4 w-44" />
      <Bar className="h-3 w-full max-w-2xl" />
      <Bar className="h-3 w-2/3 max-w-2xl" />
    </div>
  );
}

// Mirrors a feature card: title + status badge, 3-line description, footer meta.
function FeatureCardSkeleton() {
  return (
    <div className="flex flex-col border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <Bar className="h-4 w-1/2" />
        <Bar className="h-5 w-16" />
      </div>
      <div className="mt-3 space-y-2">
        <Bar className="h-3 w-full" />
        <Bar className="h-3 w-5/6" />
        <Bar className="h-3 w-2/3" />
      </div>
      <div className="mt-5 flex items-center justify-between">
        <Bar className="h-3 w-20" />
        <Bar className="h-3 w-16" />
      </div>
    </div>
  );
}

/** Feature card grid (inline list area of the features page). */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <FeatureCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Full features-page skeleton (header + intake banner + card grid). */
export function GridPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <IntakeBannerSkeleton />
      <CardGridSkeleton />
    </div>
  );
}

/** ───────────────────────── Projects ───────────────────────── */

// Mirrors a project card: icon box + arrow, name, /slug, description, footer meta.
function ProjectCardSkeleton() {
  return (
    <div className="flex flex-col border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <Box className="size-9" />
        <Bar className="size-4" />
      </div>
      <Bar className="mt-4 h-4 w-1/2" />
      <Bar className="mt-1.5 h-2.5 w-20" />
      <div className="mt-2 space-y-2">
        <Bar className="h-3 w-full" />
        <Bar className="h-3 w-2/3" />
      </div>
      <div className="mt-4 border-t border-border pt-3">
        <Bar className="h-2.5 w-24" />
      </div>
    </div>
  );
}

/** Project card grid (inline list area of the projects page). */
export function ProjectsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Full projects-page skeleton (header + stat tiles + search + project grid). */
export function ProjectsPageSkeleton() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <StatTilesRow />
      <SearchBarSkeleton />
      <ProjectsGridSkeleton />
    </div>
  );
}

/** ───────────────────────── Tasks ───────────────────────── */

// Mirrors a task card: title + description + status badge, then a footer line.
function TaskCardSkeleton() {
  return (
    <div className="border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Bar className="h-4 w-1/3" />
          <Bar className="h-3 w-2/3" />
        </div>
        <Bar className="h-5 w-20" />
      </div>
      <Bar className="mt-4 h-3 w-56" />
    </div>
  );
}

/** Task card list (inline list area of the tasks page). */
export function TasksListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Full tasks-page skeleton (header + task list). */
export function TasksPageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TasksListSkeleton rows={rows} />
    </div>
  );
}

/** ───────────────────────── PRDs ───────────────────────── */

// Mirrors a PRD row: icon box + title/status, with a status pill on the right.
function PrdRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 border border-border bg-card px-5 py-4">
      <div className="flex min-w-0 items-center gap-4">
        <Box className="size-10 shrink-0" />
        <div className="space-y-2">
          <Bar className="h-3.5 w-48" />
          <Bar className="h-3 w-28" />
        </div>
      </div>
      <Bar className="h-6 w-24" />
    </div>
  );
}

/** Full PRDs-page skeleton (header + PRD rows). */
export function PrdListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <PrdRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** ───────────────────────── Reviews ───────────────────────── */

// Mirrors a review row: title + description, with a verdict pill on the right.
function ReviewCardSkeleton() {
  return (
    <div className="border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Bar className="h-4 w-1/3" />
          <Bar className="h-3 w-2/3" />
        </div>
        <Bar className="h-6 w-28" />
      </div>
    </div>
  );
}

/** Full reviews-page skeleton (header + review rows). */
export function ReviewsListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <ReviewCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
