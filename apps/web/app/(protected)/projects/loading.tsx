import {
  CardGridSkeleton,
  PageHeaderSkeleton,
  StatTileSkeleton,
} from "~/components/shipflow/page-skeletons";

export default function Loading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatTileSkeleton key={i} />
        ))}
      </div>
      <CardGridSkeleton />
    </div>
  );
}
