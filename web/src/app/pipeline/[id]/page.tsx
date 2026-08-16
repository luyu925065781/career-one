import { notFound } from "next/navigation";
import { readReport, findApplication, trackerCanDelete } from "@/lib/career-one";
import { parseReport } from "@/lib/format";
import { ReportView } from "@/components/report-view";
import { ApplicationProgressDetail } from "@/components/pipeline-view";

export const dynamic = "force-dynamic";

export default async function PipelineDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const [{ id }, { view }] = await Promise.all([params, searchParams]);
  const app = findApplication(id);
  const report = readReport(id);
  if (!app && !report) notFound();

  if (view === "report" || !app) {
    return (
      <ReportView
        id={id}
        app={app}
        report={report?.content ?? null}
        file={report?.file ?? null}
      />
    );
  }

  const reportMeta = report ? parseReport(report.content) : null;
  const jobUrl = reportMeta?.fields.find((field) => field.label === "URL")?.value;

  return (
    <ApplicationProgressDetail
      app={app}
      reportAvailable={Boolean(report)}
      jobUrl={jobUrl && /^https?:\/\//i.test(jobUrl) ? jobUrl : undefined}
      canDelete={trackerCanDelete()}
    />
  );
}
