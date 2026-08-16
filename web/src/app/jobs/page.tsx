"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { isInvalidJob, type Job, useJobs } from "@/components/jobs/job-store";
import {
  ClearFinishedButton,
  findReportHref,
  formatTaskTime,
  statusLabel,
} from "@/components/jobs/worker-pills";
import { pillTone } from "@/components/jobs/worker-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const TASK_STATUS_TABS = [
  { key: "all", label: "全部" },
  { key: "waiting", label: "待处理" },
  { key: "running", label: "运行中" },
  { key: "done", label: "已完成" },
  { key: "invalid", label: "已失效" },
] as const;

type TaskStatusFilter = (typeof TASK_STATUS_TABS)[number]["key"];

const TASK_TYPE_LABELS = {
  all: "全部类型",
  discovery: "岗位搜索",
  evaluation: "岗位评估",
  resume: "定制简历",
  interview: "面试准备",
  research: "公司调研",
  application: "投递辅助",
  sources: "岗位来源",
  other: "其他任务",
} as const;

type TaskType = keyof typeof TASK_TYPE_LABELS;

const TASK_TYPE_ORDER: TaskType[] = [
  "all",
  "discovery",
  "evaluation",
  "resume",
  "interview",
  "research",
  "application",
  "sources",
  "other",
];

function taskType(job: Job): Exclude<TaskType, "all"> {
  const kind = (job.kind ?? "").toLowerCase();
  if (/^(discover|scan|explore)/.test(kind)) return "discovery";
  if (/^(evaluate|diagnos)/.test(kind)) return "evaluation";
  if (/^(pdf|resume|cv)/.test(kind)) return "resume";
  if (/^(story|interview)/.test(kind)) return "interview";
  if (/^(research|deep)/.test(kind)) return "research";
  if (/^(apply|application)/.test(kind)) return "application";
  if (/portal|source/.test(kind)) return "sources";
  return "other";
}

function taskResult(job: Job) {
  if (job.cacheState === "unverified") return "当前工作区无法验证这条任务记录，相关文件链接已停用";
  if (isInvalidJob(job)) {
    if (job.text) return job.text;
    return job.runStatus === "cancelled"
      ? "任务已取消，流程已终止"
      : "任务未完成，流程已终止";
  }
  if (job.result?.score != null) return `${job.result.score}/5`;
  if (job.status === "done") return job.result?.summary || job.artifacts?.[0]?.label || "任务已完成";
  return job.steps.at(-1)?.label || "—";
}

function TaskStatusBadge({ job }: { job: Job }) {
  const invalid = isInvalidJob(job);
  return (
    <Badge
      tone={pillTone(job)}
      className="inline-flex items-center gap-1.5 px-2 py-1 font-medium"
    >
      {job.cacheState === "unverified" ? (
        <AlertTriangle className="size-3" aria-hidden="true" />
      ) : invalid ? (
        <AlertTriangle className="size-3" aria-hidden="true" />
      ) : job.status === "running" ? (
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
      ) : job.status === "waiting" ? (
        <Clock3 className="size-3" aria-hidden="true" />
      ) : (
        <Check className="size-3" aria-hidden="true" />
      )}
      {statusLabel(job)}
    </Badge>
  );
}

function TaskTypeBadge({ job }: { job: Job }) {
  return (
    <span className="inline-flex rounded-md bg-surface-hover px-2 py-1 text-xs font-medium text-muted">
      {TASK_TYPE_LABELS[taskType(job)]}
    </span>
  );
}

const TASK_ACTION_CLASS = cn(
  buttonVariants({ variant: "ghost", size: "sm" }),
  "whitespace-nowrap text-muted",
);

function TaskAction({ job }: { job: Job }) {
  const reportHref = findReportHref(job);
  if (reportHref) {
    return (
      <Link
        href={reportHref}
        className={TASK_ACTION_CLASS}
        aria-label={`打开报告：${job.title}`}
      >
        打开报告
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </Link>
    );
  }
  return (
    <Link
      href={`/jobs/${job.id}`}
      className={TASK_ACTION_CLASS}
      aria-label={`查看任务：${job.title}`}
    >
      查看任务
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

function matchesStatus(job: Job, status: TaskStatusFilter) {
  if (status === "all") return true;
  if (status === "invalid") return isInvalidJob(job);
  return !isInvalidJob(job) && job.status === status;
}

function evaluationTaskKey(job: Job) {
  if (job.kind !== "evaluate" || !job.input?.trim() || !isInvalidJob(job)) return null;
  try {
    const url = new URL(job.input.trim());
    url.hash = "";
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return job.input.trim().replace(/\/+$/, "");
  }
}

function collapseDuplicateFailedEvaluations(jobs: Job[]) {
  const seen = new Set<string>();
  const visibleJobs: Job[] = [];
  let duplicateCount = 0;

  for (const job of [...jobs].sort((a, b) => b.startedAt - a.startedAt)) {
    const key = evaluationTaskKey(job);
    if (key && seen.has(key)) {
      duplicateCount += 1;
      continue;
    }
    if (key) seen.add(key);
    visibleJobs.push(job);
  }

  return { visibleJobs, duplicateCount };
}

export default function JobsHistory() {
  const { jobs, jobsReady } = useJobs();
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TaskType>("all");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const { visibleJobs, duplicateCount } = useMemo(
    () => collapseDuplicateFailedEvaluations(jobs),
    [jobs],
  );

  const availableTypes = useMemo(
    () => TASK_TYPE_ORDER.filter((type) => (
      type === "all" || visibleJobs.some((job) => taskType(job) === type)
    )),
    [visibleJobs],
  );

  useEffect(() => {
    if (!availableTypes.includes(typeFilter)) setTypeFilter("all");
  }, [availableTypes, typeFilter]);

  const typeFilteredJobs = useMemo(
    () => typeFilter === "all"
      ? visibleJobs
      : visibleJobs.filter((job) => taskType(job) === typeFilter),
    [visibleJobs, typeFilter],
  );

  const filteredJobs = useMemo(
    () => typeFilteredJobs.filter((job) => matchesStatus(job, statusFilter)),
    [statusFilter, typeFilteredJobs],
  );

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    let nextIndex = currentIndex;
    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + TASK_STATUS_TABS.length) % TASK_STATUS_TABS.length;
    } else if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % TASK_STATUS_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = TASK_STATUS_TABS.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    const nextTab = TASK_STATUS_TABS[nextIndex];
    setStatusFilter(nextTab.key);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="page-shell py-8 max-sm:pb-24" aria-busy={!jobsReady}>
      <div data-ui-page-header>
        <div className="min-w-0">
          <h1 className="page-title">Agent 任务</h1>
          <p className="mt-1 w-full text-sm text-muted">
            持久记录每次 Agent 执行，重新打开工作台仍可查看。
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
          <span className="text-sm tabular-nums text-faint">{jobsReady ? `${visibleJobs.length} 条` : "加载中"}</span>
          {duplicateCount > 0 && <span className="text-xs text-faint">已折叠 {duplicateCount} 条重复失败记录</span>}
          {jobsReady && <ClearFinishedButton />}
        </div>
      </div>

      {!jobsReady ? (
        <div role="status" aria-atomic="true" className="mt-6 flex min-h-40 items-center justify-center gap-2 rounded-2xl border border-border bg-surface/30 text-sm text-muted">
          <Loader2 className="size-4 animate-spin text-icon-brand" aria-hidden="true" />
          正在加载 Agent 任务…
        </div>
      ) : visibleJobs.length === 0 ? (
        <div data-ui-empty-state="panel" className="mt-6 px-6 py-14 text-center text-sm">
          还没有 Agent 任务。请在 Codex 等 Agent 产品中使用择程AI发起任务。
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="按任务状态筛选"
            className="mt-6 flex overflow-x-auto border-b border-border"
          >
            {TASK_STATUS_TABS.map((tab, index) => {
              const selected = statusFilter === tab.key;
              const count = tab.key === "all"
                ? typeFilteredJobs.length
                : typeFilteredJobs.filter((job) => matchesStatus(job, tab.key)).length;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  data-ui-structural="tab-line"
                  data-density="comfortable"
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  id={`agent-task-tab-${tab.key}`}
                  aria-selected={selected}
                  aria-controls="agent-task-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setStatusFilter(tab.key)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className="-mb-px inline-flex shrink-0 items-center justify-center gap-1 border-b-2 px-3 text-xs font-medium"
                >
                  {tab.label}
                  <span className="tabular-nums text-faint">{count}</span>
                </button>
              );
            })}
          </div>

          <section
            id="agent-task-panel"
            role="tabpanel"
            aria-labelledby={`agent-task-tab-${statusFilter}`}
            tabIndex={0}
            className="mt-4 overflow-hidden rounded-2xl border border-border outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <div className="flex flex-col gap-3 border-b border-border bg-surface/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-faint" aria-live="polite">
                当前显示 <span className="font-medium tabular-nums text-muted">{filteredJobs.length}</span> 条任务
              </p>
              <label className="flex items-center gap-2 text-xs font-medium text-muted">
                <span>任务类型</span>
                <span className="relative block">
                  <select
                    data-ui-control
                    data-density="compact"
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value as TaskType)}
                    className="min-h-10 min-w-[10.5rem] appearance-none rounded-control border border-border bg-surface px-3 pr-10 text-sm text-foreground outline-none transition-colors focus:border-brand/50"
                    >
                      {availableTypes.map((type) => {
                        const count = type === "all"
                          ? visibleJobs.length
                          : visibleJobs.filter((job) => taskType(job) === type).length;
                        return (
                        <option key={type} value={type}>
                          {TASK_TYPE_LABELS[type]}（{count}）
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-icon-muted"
                    aria-hidden="true"
                  />
                </span>
              </label>
            </div>

            {filteredJobs.length > 0 ? (
              <>
                <table className="hidden w-full table-fixed text-sm md:table">
                  <thead className="bg-surface/60 text-left text-xs text-faint">
                    <tr>
                      <th scope="col" className="w-[34%] px-4 py-3 font-medium">任务</th>
                      <th scope="col" className="w-[13%] px-4 py-3 font-medium">类型</th>
                      <th scope="col" className="w-[13%] px-4 py-3 font-medium">状态</th>
                      <th scope="col" className="w-[18%] px-4 py-3 font-medium">结果</th>
                      <th scope="col" className="w-[12%] px-4 py-3 font-medium">时间</th>
                      <th scope="col" className="w-[10%] px-4 py-3 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredJobs.map((job) => {
                      const result = taskResult(job);
                      return (
                        <tr key={job.id} className="group transition-colors hover:bg-surface-hover">
                          <td className="px-4 py-3">
                            <Link
                              href={`/jobs/${job.id}`}
                              className="block min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            >
                              <span className="block truncate font-medium text-foreground transition-colors group-hover:text-interactive-hover">
                                {job.title}
                              </span>
                              {job.subtitle && (
                                <span className="mt-0.5 block truncate text-xs text-faint">{job.subtitle}</span>
                              )}
                            </Link>
                          </td>
                          <td className="px-4 py-3"><TaskTypeBadge job={job} /></td>
                          <td className="px-4 py-3"><TaskStatusBadge job={job} /></td>
                          <td className="px-4 py-3">
                            {job.result?.score != null ? (
                              <Badge tone={pillTone(job)}>{result}</Badge>
                            ) : (
                              <span className="block truncate text-xs text-muted" title={result}>{result}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs tabular-nums text-faint">
                            <time dateTime={new Date(job.endedAt ?? job.startedAt).toISOString()}>
                              {formatTaskTime(job.endedAt ?? job.startedAt)}
                            </time>
                          </td>
                          <td className="px-2 py-1.5 text-right"><TaskAction job={job} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <ul className="divide-y divide-border md:hidden" aria-label="Agent 任务列表">
                  {filteredJobs.map((job) => {
                    const result = taskResult(job);
                    return (
                      <li key={job.id} className="px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/jobs/${job.id}`}
                            className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          >
                            <span className="block font-medium leading-6 text-foreground">{job.title}</span>
                            {job.subtitle && (
                              <span className="mt-0.5 block truncate text-xs text-faint">{job.subtitle}</span>
                            )}
                          </Link>
                          <TaskTypeBadge job={job} />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <TaskStatusBadge job={job} />
                          <time
                            dateTime={new Date(job.endedAt ?? job.startedAt).toISOString()}
                            className="text-xs tabular-nums text-faint"
                          >
                            {formatTaskTime(job.endedAt ?? job.startedAt)}
                          </time>
                        </div>
                        <div className="mt-3 flex min-w-0 items-center justify-between gap-3 border-t border-border pt-2">
                          <span className="min-w-0 truncate text-xs text-muted" title={result}>{result}</span>
                          <TaskAction job={job} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="font-medium text-foreground">没有匹配的任务</p>
                <p className="mt-1 text-sm text-muted">请切换任务状态或任务类型。</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
