import { Suspense } from "react";
import { pipelineSummary } from "@/lib/career-one";
import { PipelineView } from "@/components/pipeline-view";

export const dynamic = "force-dynamic"; // always read fresh local files

export default function PipelinePage() {
  const { inbox, applications } = pipelineSummary();
  return (
    <Suspense>
      <PipelineView applications={applications} inbox={inbox} />
    </Suspense>
  );
}
