"use client";

import { useMemo } from "react";
import Link from "next/link";
import { FileDown, Loader2, FileText, RotateCcw } from "lucide-react";
import { useJobs } from "@/components/jobs/job-store";
import { CostBadge } from "@/components/cost/cost-badge";

// Fires the real career-one `pdf` mode (worker kind "pdf") to generate an
// ATS-optimized CV tailored to THIS offer → output/cv-… + marks the tracker.
// Once a tailored CV exists (tracker PDF ✅, or a pdf worker just finished), it
// becomes a "View tailored CV" link (served by /api/cv-pdf) + a regenerate icon.
export function GeneratePdfButton({ n, company, pdfReady }: { n: string; company: string; pdfReady: boolean }) {
  const { jobs, startJob } = useJobs();
  const job = useMemo(
    () => jobs.filter((j) => j.kind === "pdf" && j.input === n).sort((a, b) => b.startedAt - a.startedAt)[0],
    [jobs, n],
  );
  const generate = () =>
    startJob({ title: `简历 PDF · ${company}`, subtitle: "针对该岗位定制", kind: "pdf", input: n, page: `/pipeline/${n}` });

  if (job?.status === "running")
    return (
      <Link href={`/jobs/${job.id}`} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-outline-border bg-outline-bg px-3 py-1 text-xs font-medium text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover max-sm:min-h-[44px]">
        <Loader2 className="size-3.5 animate-spin" /> 正在生成简历…
      </Link>
    );

  const ready = pdfReady || job?.status === "done";
  if (ready)
    return (
      <span className="inline-flex items-center gap-1">
        <a
          href={`/api/cv-pdf?company=${encodeURIComponent(company)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/15 dark:text-emerald-400 max-sm:min-h-[44px]"
        >
          <FileText className="size-3.5" /> 查看定制简历
        </a>
        <button
          onClick={generate}
          title="重新生成定制简历"
          className="inline-flex items-center justify-center rounded-full p-1 text-faint transition-colors hover:text-brand max-sm:min-h-[44px] max-sm:min-w-[44px]"
        >
          <RotateCcw className="size-3" />
        </button>
      </span>
    );

  // Point-of-action cost affordance: generating a tailored CV runs the user's
  // AI (spends tokens). Surface it right on the trigger so cost is never a
  // surprise — the community's #1 pain (mirrors Explore's token-honesty).
  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        onClick={generate}
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-outline-border bg-outline-bg px-3 py-1 text-xs font-medium text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover max-sm:min-h-[44px]"
        title="生成针对该岗位的 ATS 优化简历"
      >
        <FileDown className="size-3.5" /> 生成定制简历（PDF）
      </button>
      <CostBadge kind="spend" size="xs" />
    </span>
  );
}
