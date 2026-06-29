import Image from "next/image";

import { getServerSession } from "@/features/auth/session";
import { CreateOrgForm } from "~/components/shipflow/create-org-form";
import { OrgSettingsForm } from "~/components/shipflow/org-settings-form";
import { ProjectsSection } from "~/components/shipflow/projects-section";
import { ShipFlowShell } from "~/components/shipflow/shell";
import { api } from "~/trpc/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession();
  const orgs = await api.org.list.query().catch(() => []);
  const currentOrg = await api.org.current.query().catch(() => null);

  return (
    <ShipFlowShell
      active="/settings"
      title="Settings"
      description="Manage your account, organization, and projects."
    >
      <div className="max-w-2xl space-y-6">

        {/* Account */}
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Account</h2>
          <div className="flex items-center gap-3">
            {session?.user.image ? (
              <Image src={session.user.image} alt="" width={40} height={40} className="rounded-full" />
            ) : (
              <div className="grid size-10 place-items-center rounded-full bg-cyan-300 text-sm font-bold text-slate-950">
                {session?.user.name?.slice(0, 1) ?? "S"}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-white">{session?.user.name ?? "Reqraft user"}</p>
              <p className="text-xs text-slate-500">{session?.user.email ?? "No email connected"}</p>
            </div>
          </div>
        </div>

        {/* Active org settings */}
        {currentOrg && (
          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
            <h2 className="mb-1 text-sm font-semibold text-white">Organization settings</h2>
            <p className="mb-4 text-xs text-slate-500">
              Edit the name and slug for <span className="text-slate-300">{currentOrg.name}</span>.
              Only the owner can make changes.
            </p>
            <OrgSettingsForm />
          </div>
        )}

        {/* Projects */}
        <ProjectsSection />

        {/* All orgs + create */}
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Your organizations</h2>
          {orgs.length === 0 ? (
            <p className="mb-4 text-sm text-slate-500">No organizations yet.</p>
          ) : (
            <div className="mb-4 divide-y divide-white/5">
              {orgs.map((org) => (
                <div key={org.id} className="flex items-center justify-between py-3">
                  <span className="text-sm text-slate-200">{org.name}</span>
                  <span className="text-xs text-slate-500">/{org.slug}</span>
                </div>
              ))}
            </div>
          )}
          <CreateOrgForm />
        </div>

      </div>
    </ShipFlowShell>
  );
}
