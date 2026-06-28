import { requireAuth } from "@/features/auth/session";
import { ProjectProvider } from "~/components/shipflow/project-context";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return <ProjectProvider>{children}</ProjectProvider>;
}
