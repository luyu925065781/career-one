"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleDot,
  Clock3,
  FileText,
  History,
  Loader2,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { HeroGlow } from "@/components/hero-glow";
import { isInvalidJob, type Job, type JobArtifact, useJobs } from "@/components/jobs/job-store";
import { WorkerCard } from "@/components/jobs/worker-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

const STATUS_LABEL: Record<Job["status"], string> = {
  running: "运行中",
  waiting: "待确认",
  done: "已完成",
  error: "已失效",
};

const AGENT_TASK_SCROLL_THUMB_PX = 44;

export function statusLabel(job: Job) {
  if (job.cacheState === "unverified") return "历史缓存";
  if (isInvalidJob(job)) return "已失效";
  if (job.runStatus === "queued") return "待 Agent";
  if (job.runStatus === "waiting_input") return "待回复";
  return STATUS_LABEL[job.status];
}

export function formatTaskTime(timestamp: number) {
  const date = new Date(timestamp);
  const twoDigits = (value: number) => String(value).padStart(2, "0");
  return `${twoDigits(date.getMonth() + 1)}/${twoDigits(date.getDate())} ${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

function isEvaluationReportArtifact(artifact: JobArtifact) {
  return (
    artifact.path.startsWith("reports/") &&
    artifact.path.endsWith(".md") &&
    (!artifact.page || /^\/pipeline\/\d+/.test(artifact.page))
  );
}

function artifactDisplayLabel(artifact: JobArtifact) {
  if (isEvaluationReportArtifact(artifact)) return "岗位评估报告";
  return artifact.label;
}

export function reportPageHref(page: string) {
  if (!/^\/pipeline\/\d+(?:[?#]|$)/.test(page) || /(?:[?&])view=report(?:&|$)/.test(page)) {
    return page;
  }
  return `${page}${page.includes("?") ? "&" : "?"}view=report`;
}

export function findReportArtifact(job: Job) {
  if (job.status !== "done" || isInvalidJob(job)) return null;

  return job.artifacts?.find((artifact) => {
    const searchable = `${artifact.label} ${artifact.path}`;
    return artifact.available !== false && artifact.page && (/报告|report/i.test(searchable) || artifact.path.startsWith("reports/"));
  }) ?? null;
}

export function findReportHref(job: Job) {
  const page = findReportArtifact(job)?.page;
  return page ? reportPageHref(page) : null;
}

function contextualAction(page: string) {
  if (/^\/pipeline\/\d+/.test(page)) return "查看评估报告";
  if (page === "/cv") return "打开简历页面";
  if (page === "/profile") return "打开求职画像";
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
      {artifacts.map((artifact) => {
        if (artifact.page && artifact.available !== false) {
          return (
            <Link
              key={artifact.path}
              href={isEvaluationReportArtifact(artifact) ? reportPageHref(artifact.page) : artifact.page}
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
          );
        }

        if (artifact.available === false) {
          return (
            <div
              key={artifact.path}
              aria-disabled="true"
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border bg-surface-hover/55 px-4 py-3",
                compact && "min-h-12",
              )}
            >
              <AlertTriangle className="size-4 shrink-0 text-icon-warning" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted">{artifactDisplayLabel(artifact)}</p>
                <p className="truncate text-xs text-warning">文件已不可用 · {artifact.path}</p>
              </div>
            </div>
          );
        }

        return (
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
        );
      })}
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
  const hasMatchingPageArtifact = job.artifacts?.some((artifact) => artifact.available !== false && artifact.page === job.page) ?? false;
  const invalid = isInvalidJob(job);
  const cachedOnly = job.cacheState === "unverified";

  return (
    <div data-agent-task-detail>
      <section className="dot-bg relative overflow-hidden rounded-2xl border border-border bg-surface/40 px-6 py-7">
        <HeroGlow />
        <div className="relative z-10">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-faint">
            {cachedOnly ? (
              <><AlertTriangle className="size-3 text-icon-warning" aria-hidden="true" /> 历史缓存</>
            ) : invalid ? (
              <><X className="size-3 text-icon-danger" aria-hidden="true" /> 已失效</>
            ) : job.status === "running" ? (
              <><Loader2 className="size-3 animate-spin text-icon-brand" aria-hidden="true" /> 执行中</>
            ) : job.status === "waiting" ? (
              <><Clock3 className="size-3 text-icon-warning" aria-hidden="true" /> {job.runStatus === "queued" ? "等待 Agent 接手" : job.runStatus === "waiting_input" ? "等待您回复" : "等待确认修改"}</>
            ) : (
              <><Check className="size-3 text-icon-success" aria-hidden="true" /> 已完成</>
            )}
          </p>
          <Title className="mt-2 font-display text-2xl tracking-tight text-landing">{job.title}</Title>
          {job.subtitle && <p className="mt-1 text-sm text-muted">{job.subtitle}</p>}
          <p className="mt-3 text-xs text-faint">
            {job.source === "agent" ? "由 Agent 原生入口发起" : "由 Web 工作台发起"}
          </p>
          {cachedOnly && (
            <p className="mt-3 text-sm text-warning">
              当前工作区无法验证这条任务记录；相关文件链接已停用。
            </p>
          )}
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
        {!invalid && job.status === "running" && (
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

export function ClearFinishedButton() {
  const { jobs, clearFinished } = useJobs();
  const finishedCount = jobs.filter((job) => job.status === "done" || isInvalidJob(job)).length;
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
      className="inline-flex min-h-10 items-center gap-1.5 rounded-button border border-border bg-surface/60 px-3 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-border-hover focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                  将从 Agent 任务列表中归档并隐藏 {finishedCount} 条已完成或已失效的历史任务记录。
                  报告和已生成文件不会被删除，但任务记录在当前工作台中无法恢复。
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={closeDialog}
                className="inline-flex min-h-10 items-center justify-center rounded-button border border-outline-border bg-outline-bg px-4 text-sm font-medium text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-border-hover focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmClear}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button bg-icon-danger px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-icon-danger focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
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
  const recentJobs = jobs.slice(0, 10);
  const taskScrollLayoutKey = recentJobs.map((job) => job.id).join("|");
  const taskListRef = useRef<HTMLUListElement>(null);
  const taskScrollThumbRef = useRef<HTMLSpanElement>(null);
  const taskScrollInitializedRef = useRef(false);

  const syncTaskScrollbar = useCallback(() => {
    const scroller = taskListRef.current;
    const thumb = taskScrollThumbRef.current;
    if (!scroller || !thumb) return;

    const viewportHeight = scroller.clientHeight;
    const maxScrollTop = Math.max(0, scroller.scrollHeight - viewportHeight);
    const thumbHeight = Math.min(AGENT_TASK_SCROLL_THUMB_PX, viewportHeight);
    const maxThumbTop = Math.max(0, viewportHeight - thumbHeight);
    const clampedScrollTop = Math.min(maxScrollTop, Math.max(0, scroller.scrollTop));
    const thumbTop = maxScrollTop > 0 ? (clampedScrollTop / maxScrollTop) * maxThumbTop : 0;

    thumb.hidden = maxScrollTop <= 0 || thumbHeight <= 0;
    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${thumbTop}px)`;
  }, []);

  useLayoutEffect(() => {
    const scroller = taskListRef.current;
    if (!scroller) return;

    if (!taskScrollInitializedRef.current) {
      scroller.scrollTop = 0;
      taskScrollInitializedRef.current = true;
    }
    syncTaskScrollbar();

    const resizeObserver = new ResizeObserver(syncTaskScrollbar);
    resizeObserver.observe(scroller);
    Array.from(scroller.children).forEach((child) => resizeObserver.observe(child));
    return () => resizeObserver.disconnect();
  }, [taskScrollLayoutKey, syncTaskScrollbar]);

  if (jobs.length === 0) return null;
  const running = jobs.filter((job) => job.status === "running").length;
  const waiting = jobs.filter((job) => job.status === "waiting").length;

  return (
    <div data-agent-task-tray className="mt-4 flex min-h-0 flex-1 flex-col border-t border-border pt-3">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Agent 任务</span>
        {running > 0 && <span className="text-[10px] tabular-nums text-brand">{running} 个运行中</span>}
        {running === 0 && waiting > 0 && <span className="text-[10px] tabular-nums text-icon-warning">{waiting} 个待处理</span>}
        <Link href="/jobs" className="ml-auto text-faint transition-colors hover:text-foreground" title="历史记录" aria-label="Agent 任务历史">
          <History className="size-3.5" />
        </Link>
      </div>
      <div className="agent-task-scroll-shell relative min-h-0 flex-1">
        <ul
          ref={taskListRef}
          onScroll={syncTaskScrollbar}
          className="agent-task-scrollbar h-full min-h-0 space-y-1.5 overflow-y-auto pb-3 pr-1"
        >
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
        <div className="pointer-events-none absolute inset-y-0 -right-1.5 w-[3px]">
          <span
            ref={taskScrollThumbRef}
            aria-hidden="true"
            hidden
            className="agent-task-scroll-thumb absolute right-0 top-0 block"
            style={{ height: AGENT_TASK_SCROLL_THUMB_PX, transform: "translateY(0px)" }}
          />
        </div>
      </div>
    </div>
  );
}
