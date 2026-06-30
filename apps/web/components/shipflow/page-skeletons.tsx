import { cn } from "~/lib/utils";

/** Square shimmer block — the atom for every page skeleton. */
function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-foreground/[0.06]", className)} />;
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-2.5">
        <Bar className="h-7 w-52" />
        <Bar className="h-3.5 w-80 max-w-full" />
      </div>
      <Bar className="hidden h-9 w-36 sm:block" />
    </div>
  );
}

export function StatTileSkeleton() {
  return (
    <div className="border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <Bar className="h-3 w-24" />
        <Bar className="size-8" />
      </div>
      <Bar className="mt-5 h-9 w-20" />
      <Bar className="mt-2 h-3 w-32" />
    </div>
  );
}

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

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <Bar className="h-5 w-1/2" />
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
      ))}
    </div>
  );
}

/** Full dashboard-shaped skeleton (stat tiles + pipeline + list). */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatTileSkeleton key={i} />
        ))}
      </div>
      <Bar className="h-20 w-full" />
      <div className="space-y-px">
        {Array.from({ length: 5 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Generic list-shaped skeleton for tasks/prd/reviews. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Card-grid-shaped skeleton for the features page. */
export function GridPageSkeleton() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <Bar className="h-20 w-full" />
      <CardGridSkeleton />
    </div>
  );
}
