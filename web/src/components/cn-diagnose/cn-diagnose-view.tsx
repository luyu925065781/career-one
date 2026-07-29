"use client";

import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { type Job, useJobs } from "@/components/jobs/job-store";
import { AgentTaskDetailPanel, findReportArtifact } from "@/components/jobs/worker-pills";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { isEvaluationIntent } from "@/lib/format";
import { PRIMARY_NAV_ITEMS } from "@/lib/nav-items";

const PageIcon = PRIMARY_NAV_ITEMS.jobDiagnosis.icon;

function isEvaluationJob(job: Job) {
  return isEvaluationIntent(job.kind);
}

type EvaluationReportRecord = {
  id: string;
  href: string;
  title: string;
  path: string;
  score: number | null;
  tone: "good" | "warn" | "bad" | "muted";
  completedAt: number;
};

function evaluationReportFromJob(job: Job): EvaluationReportRecord | null {
  if (!isEvaluationJob(job) || job.status !== "done") return null;

  const artifact = findReportArtifact(job);
  if (
    !artifact?.page ||
    !artifact.path.startsWith("reports/") ||
    !artifact.path.endsWith(".md") ||
    !/^\/pipeline\/\d+/.test(artifact.page)
  ) {
    return null;
  }

  return {
    id: job.id,
    href: artifact.page,
    title: job.title,
    path: artifact.path,
    score: job.result?.score ?? null,
    tone: job.result?.tone ?? "muted",
    completedAt: job.endedAt ?? job.startedAt,
  };
}

function isEvaluationReportRecord(
  report: EvaluationReportRecord | null,
): report is EvaluationReportRecord {
  return report !== null;
}

function formatReportTime(timestamp: number) {
  const date = new Date(timestamp);
  const twoDigits = (value: number) => String(value).padStart(2, "0");
  return `${twoDigits(date.getMonth() + 1)}/${twoDigits(date.getDate())} ${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

function EvaluationReportCard({ report }: { report: EvaluationReportRecord }) {
  return (
    <Link
      data-evaluation-report-card
      href={report.href}
      aria-label={`打开评估报告：${report.title}`}
      className="group flex min-h-28 items-center gap-5 rounded-2xl border border-border bg-surface/50 px-5 py-5 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-border-hover focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-6"
    >
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-icon-brand">
        <FileText className="size-5" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-foreground transition-colors group-hover:text-landing">
            {report.title}
          </span>
          {report.score != null && <Badge tone={report.tone}>{report.score}/5</Badge>}
        </span>
        <span className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span>岗位评估报告</span>
          <span aria-hidden="true">·</span>
          <time dateTime={new Date(report.completedAt).toISOString()} className="tabular-nums text-faint">
            {formatReportTime(report.completedAt)}
          </time>
          <span aria-hidden="true">·</span>
          <span className="max-w-full truncate text-faint">{report.path}</span>
        </span>
      </span>

      <span className="hidden shrink-0 items-center gap-2 text-sm font-medium text-foreground sm:inline-flex">
        打开报告
        <ArrowRight
          className="size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

function CurrentEvaluationTaskDetail({ job }: { job: Job | null }) {
  if (!job) {
    return (
      <Card elevated data-latest-evaluation className="bg-surface/55 px-5 py-6 sm:px-6">
        <h2 className="text-lg font-semibold text-foreground">当前岗位评估</h2>
        <div className="mt-5 rounded-xl border border-dashed border-border bg-background/35 px-5 py-9 text-center">
          <p className="text-sm font-medium text-foreground">还没有岗位评估任务</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            请在 Agent 产品中发起岗位评估，任务进度和正式报告会自动同步到这里。
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div data-latest-evaluation>
      <h2 className="font-display text-2xl tracking-tight text-landing">当前岗位评估</h2>
      <p className="mt-1 text-sm text-muted">展示当前评估的任务状态、执行过程与生成结果。</p>

      <div className="mt-4">
        <AgentTaskDetailPanel job={job} artifactPlacement="summary" />
      </div>
    </div>
  );
}

export function CnDiagnoseView() {
  const { jobs } = useJobs();
  const evaluationJobs = jobs
    .filter(isEvaluationJob)
    .sort((a, b) => b.startedAt - a.startedAt);
  const reportRecords = evaluationJobs
    .map(evaluationReportFromJob)
    .filter(isEvaluationReportRecord);
  const currentEvaluation = evaluationJobs[0] ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div className="page-shell py-8">
        <header>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <PageIcon className="size-6 shrink-0 text-icon-brand" aria-hidden="true" />
              <h1 className="font-display text-3xl tracking-tight text-landing">岗位评估</h1>
            </div>
            <p className="mt-2 w-full pl-9 text-sm leading-7 text-muted">
              集中查看由 Agent 完成的岗位评估进度和正式报告。
            </p>
          </div>
        </header>

        <section className="mt-7" aria-label="当前岗位评估任务详情">
          <CurrentEvaluationTaskDetail job={currentEvaluation} />
        </section>

        <section className="mt-8" aria-labelledby="evaluation-reports-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="evaluation-reports-title" className="font-display text-2xl tracking-tight text-landing">
                历史评估报告
              </h2>
              <p className="mt-1 text-sm text-muted">
                只显示评估成功后生成的正式报告；执行记录请在 Agent 任务中查看。
              </p>
            </div>
            <span className="shrink-0 text-sm tabular-nums text-faint">{reportRecords.length} 条</span>
          </div>

          {reportRecords.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center">
              <FileText className="mx-auto size-5 text-icon-muted" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-foreground">还没有正式评估报告</p>
              <p className="mt-1 text-sm text-muted">评估成功并生成正式报告后，报告会自动出现在这里。</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-4" aria-label="历史评估报告">
              {reportRecords.map((report) => (
                <li key={report.id}>
                  <EvaluationReportCard report={report} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
