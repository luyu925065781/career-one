import { CnDiagnoseView } from "@/components/cn-diagnose/cn-diagnose-view";
import { readApplications } from "@/lib/career-one";

export const dynamic = "force-dynamic";

export default function CnDiagnosePage() {
  const reportIdentities = readApplications().map((application) => ({
    reportNumber: application.n,
    company: application.company,
    role: application.role,
  }));

  return <CnDiagnoseView reportIdentities={reportIdentities} />;
}
