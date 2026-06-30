import { notFound } from "next/navigation";

import { FeatureDetailTabs } from "~/components/shipflow/feature-detail-tabs";
import { PageHeader } from "~/components/shipflow/ui-kit";
import { api } from "~/trpc/server";

export const dynamic = "force-dynamic";

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ featureId: string }>;
}) {
  const { featureId } = await params;
  const feature = await api.feature.getById.query({ featureId }).catch(() => null);

  if (!feature) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={feature.title}
        description="Feature detail connects the original request to PRD, tasks, GitHub PR, AI review, and release approval."
      />
      <FeatureDetailTabs feature={feature} />
    </div>
  );
}
