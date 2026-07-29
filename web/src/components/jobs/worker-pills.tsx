"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleDot,
  Clock3,
  ExternalLink,
  FileText,
  History,
  Loader2,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { HeroGlow } from "@/components/hero-glow";
import { type Job, type JobArtifact, useJobs } from "@/components/jobs/job-store";
import { WorkerCard, pillTone } from "@/components/jobs/worker-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

const TONE_CHIP = {
  good: "bg-success-surface text-success",
  warn: "bg-warning-surface text-warning",
  bad: "bg-danger-surface text-danger",
  muted: "bg-surface-hover text-muted",
} as const;

const STATUS_LABEL: Record<Job["status"], string> = {
  running: "运行中",
  waiting: "待确认",
  done: "已完成",
  error: "出错",
};

const STATUS_STYLE: Record<Job["status"], string> = {
  running: "text-icon-brand",
  waiting: "text-icon-warning",
  done: "text-icon-success",
  error: "text-icon-danger",
};

function statusLabel(job: Job) {
  if (job.runStatus === "queued") return "待 Agent";
  return STATUS_LABEL[job.status];
}

function formatTaskTime(timestamp: number) {
  const date = new Date(timestamp);
  const twoDigits = (value: number) => String(value).padStart(2, "0");
  return `${twoDigits(date.getMonth() + 1)}/${twoDigits(date.getDate())} ${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

function artifactDisplayLabel(artifact: JobArtifact) {
  const isEvaluationReport =
    artifact.path.startsWith("reports/") &&
    artifact.path.endsWith(".md") &&
    (!artifact.page || /^\/pipeline\/\d+/.test(artifact.page));

  if (isEvaluationReport) return "岗位评估报告";
  return artifact.label;
}

export function findReportArtifact(job: Job) {
  if (job.status !== "done") return null;

  return job.artifacts?.find((artifact) => {
    const searchable = `${artifact.label} ${artifact.path}`;
    return artifact.page && (/报告|report/i.test(searchable) || artifact.path.startsWith("reports/"));
  }) ?? null;
}

export function findReportHref(job: Job) {
  return findReportArtifact(job)?.page ?? null;
}

function contextualAction(page: string) {
  if (/^\/pipeline\/\d+/.test(page)) return "查看评估报告";
  if (page === "/cv") return "打开简历页面";
  if (page === "/interview") return "打开面试故事库";
  if (page === "/config") return "打开设置";
  if (page === "/portals") return "打开岗位来源";
  return "打开相关页面";
}

function ArtifactRows({
  artifacts,
  compact = false,
}: {
  artifacts: JobArtifact[];
  compact?: boolean;
}) {
  return (
    <div className="grid w-full gap-2">
      {artifacts.map((artifact) => (
        artifact.page ? (
          <Link
            key={artifact.path}
            href={artifact.page}
            className={cn(
              "group flex items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-surface-hover",
              compact ? "min-h-12 bg-background/45" : "bg-surface/45",
            )}
          >
            <FileText className="size-4 text-icon-brand" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{artifactDisplayLabel(artifact)}</p>
              <p className="truncate text-xs text-faint">{artifact.path}</p>
            </div>
            <ArrowRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
          </Link>
        ) : (
          <div
            key={artifact.path}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-border px-4 py-3",
              compact ? "min-h-12 bg-background/45" : "bg-surface/45",
            )}
          >
            <FileText className="size-4 text-icon-brand" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{artifactDisplayLabel(artifact)}</p>
              <p className="truncate text-xs text-faint">{artifact.path}</p>
            </div>
          </div>
        )
      ))}
    </div>
  );
}

type AgentTaskDetailPanelProps = {
  job: Job;
  titleLevel?: "h1" | "h2";
  children?: ReactNode;
  artifactPlacement?: "summary" | "after-steps";
};

export function AgentTaskDetailPanel({
  job,
  titleLevel = "h2",
  children,
  artifactPlacement = "after-steps",
}: AgentTaskDetailPanelProps) {
  const Title = titleLevel;
  const artifacts = job.artifacts ?? [];
  const hasMatchingPageArtifact = job.artifacts?.some((artifact) => artifact.page === job.page) ?? false;

  return (
    <div data-agent-task-detail>
      <section className="dot-bg relative overflow-hidden rounded-2xl border border-border bg-surface/40 px-6 py-7">
        {(job.status === "running" || job.status === "waiting") && <HeroGlow />}
        <div className="relative z-10">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-faint">
            {job.status === "running" ? (
              <><Loader2 className="size-3 animate-spin text-icon-brand" aria-hidden="true" /> 执行中</>
            ) : job.status === "waiting" ? (
              <><Clock3 className="size-3 text-icon-warning" aria-hidden="true" /> {job.runStatus === "queued" ? "等待 Agent 接手" : "等待确认"}</>
            ) : job.status === "done" ? (
              <><Check className="size-3 text-icon-success" aria-hidden="true" /> 已完成</>
            ) : (
              <><X className="size-3 text-icon-danger" aria-hidden="true" /> 出错</>
            )}
          </p>
          <Title className="mt-2 font-display text-2xl tracking-tight text-landing">{job.title}</Title>
          {job.subtitle && <p className="mt-1 text-sm text-muted">{job.subtitle}</p>}
          <p className="mt-3 text-xs text-faint">
            {job.source === "agent" ? "由 Agent 原生入口发起" : "由 Web 工作台发起"}
          </p>
          {job.result?.score != null && (
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <Badge tone={job.result.tone}>{job.result.score}/5</Badge>
              {job.result.summary && <span className="text-sm leading-6 text-muted">{job.result.summary}</span>}
            </div>
          )}
          {artifactPlacement === "summary" && artifacts.length > 0 && (
            <div data-task-summary-artifacts className="mt-4 border-t border-border pt-4">
              <ArtifactRows artifacts={artifacts} compact />
            </div>
          )}
        </div>
      </section>

      {job.page && !hasMatchingPageArtifact && (
        <Link
          href={job.page}
          className="group mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface/45 px-4 py-3 transition-colors hover:bg-surface-hover"
        >
          <FileText className="size-4 text-icon-brand" aria-hidden="true" />
          <span className="flex-1 text-sm font-medium text-foreground">{contextualAction(job.page)}</span>
          <ArrowRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
        </Link>
      )}

      {children}

      <ol className="mt-6 space-y-2" aria-label="任务执行步骤">
        {job.steps.map((step, index) => (
          <li key={`${step.ts}-${index}`} className="flex items-start gap-2.5 text-sm">
            {step.kind === "tool" ? (
              <Wrench className="mt-0.5 size-3.5 shrink-0 text-icon-brand" aria-hidden="true" />
            ) : (
              <CircleDot className="mt-0.5 size-3.5 shrink-0 text-icon-muted" aria-hidden="true" />
            )}
            <span className={step.kind === "tool" ? "font-medium text-foreground" : "text-muted"}>
              {step.kind === "tool" ? `调用 ${step.label}` : step.label}
            </span>
          </li>
        ))}
        {job.status === "running" && (
          <li className="flex items-center gap-2.5 text-sm text-muted">
            <Loader2 className="size-3.5 animate-spin text-icon-brand" aria-hidden="true" />
            思考中…
          </li>
        )}
      </ol>

      {artifactPlacement === "after-steps" && artifacts.length > 0 && (
        <section className="mt-8">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">生成结果</h3>
          <div className="mt-3">
            <ArtifactRows artifacts={artifacts} />
          </div>
        </section>
      )}
    </div>
  );
}

export function AgentTaskListCard({ job }: { job: Job }) {
  const tone = pillTone(job);
  const reportHref = findReportHref(job);

  return (
    <Card
      data-agent-task-card
      className="flex flex-col gap-3 bg-surface/50 px-5 py-5 transition-colors hover:bg-surface/70 sm:flex-row sm:items-center sm:gap-5 sm:px-6"
    >
      <Link
        href={`/jobs/${job.id}`}
        className="group min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-outline-border-hover focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        aria-label={`查看任务：${job.title}`}
      >
        <div data-task-title className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-[15px] font-semibold text-foreground transition-colors group-hover:text-landing">
            {job.title}
          </h2>
          {job.result?.score != null && (
            <span
              className={cn(
                "shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                TONE_CHIP[tone],
              )}
            >
              {job.result.score}/5
            </span>
          )}
        </div>
        <div data-task-meta className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
          <span
            className={cn(
              "inline-flex min-h-7 items-center gap-1.5 rounded-md border border-border bg-surface/65 px-2 font-medium",
              STATUS_STYLE[job.status],
            )}
          >
            {job.status === "running" && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
            {statusLabel(job)}
          </span>
          <time dateTime={new Date(job.endedAt ?? job.startedAt).toISOString()} className="tabular-nums text-faint">
            {formatTaskTime(job.endedAt ?? job.startedAt)}
          </time>
        </div>
      </Link>

      {reportHref && (
        <Link
          href={reportHref}
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-surface/60 px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-border-hover focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:w-auto"
          aria-label={`打开报告：${job.title}`}
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          打开报告
        </Link>
      )}
    </Card>
  );
}

export function ClearFinishedButton() {
  const { jobs, clearFinished } = useJobs();
  const finishedCount = jobs.filter((job) => job.status === "done" || job.status === "error").length;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => cancelRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (finishedCount === 0) return null;

  function closeDialog() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function confirmClear() {
    setOpen(false);
    clearFinished();
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setOpen(true)}
      aria-haspopup="dialog"
      aria-expanded={open}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-border-hover focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
          <Trash2 className="size-3.5 text-icon-danger" aria-hidden="true" />
          清除历史任务
    </button>
  );

  return (
    <>
      {trigger}
      {open && createPortal(
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            onKeyDown={handleDialogKeyDown}
            className="w-full max-w-md rounded-panel border border-border bg-surface p-6 shadow-overlay"
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-outline-bg text-icon-danger">
                <AlertTriangle className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-semibold text-foreground">清除历史任务？</h2>
                <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">
                  将从 Agent 任务列表中归档并隐藏 {finishedCount} 条已完成或出错的历史任务记录。
                  报告和已生成文件不会被删除，但任务记录在当前工作台中无法恢复。
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={closeDialog}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-outline-border bg-outline-bg px-4 text-sm font-medium text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-border-hover focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmClear}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-icon-danger px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-icon-danger focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                确认清除
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

// Collapsed "worker" pills in the sidebar — each the shared <WorkerCard> wrapped
// in a Link to its detail. Same component the assistant chat renders inline.
export function WorkerPills() {
  const { jobs } = useJobs();
  const pathname = usePathname();
  if (jobs.length === 0) return null;
  const recentJobs = jobs.slice(0, 10);
  const running = jobs.filter((job) => job.status === "running").length;
  const waiting = jobs.filter((job) => job.status === "waiting").length;

  return (
    <div data-agent-task-tray className="mt-4 flex min-h-0 flex-1 flex-col border-t border-border pt-3">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Agent 任务</span>
        {running > 0 && <span className="text-[10px] tabular-nums text-brand">{running} 个运行中</span>}
        {running === 0 && waiting > 0 && <span className="text-[10px] tabular-nums text-icon-warning">{waiting} 个待确认</span>}
        <Link href="/jobs" className="ml-auto text-faint transition-colors hover:text-foreground" title="历史记录" aria-label="Agent 任务历史">
          <History className="size-3.5" />
        </Link>
      </div>
      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pb-3 pr-1">
        {recentJobs.map((j) => {
          const active = pathname === `/jobs/${j.id}`;
          return (
            <li key={j.id}>
              <Link
                href={`/jobs/${j.id}`}
                className={cn(
                  "group block rounded-lg border px-2.5 py-2 transition-colors",
                  active ? "border-brand/50 bg-brand-soft" : "border-border bg-surface/60 hover:bg-surface-hover",
                )}
              >
                <WorkerCard job={j} variant="tray" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
