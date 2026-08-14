"use client";

import { useEffect, useState } from "react";
import { Check, X, Loader2, AlertTriangle, Clock3 } from "lucide-react";
import { isInvalidJob, type Job } from "@/components/jobs/job-store";
import { cn } from "@/lib/cn";

// Humanize raw agent tool names into what the user actually cares about, so a
// multi-minute evaluation reads as progress instead of a cryptic tool dump (#8).
const STEP_LABELS: Record<string, string> = {
  WebFetch: "正在读取岗位信息",
  WebSearch: "正在搜索公开信息",
  Read: "正在读取简历与个人配置",
  Glob: "正在查找本地文件",
  Grep: "正在查找本地文件",
  Write: "正在撰写报告",
  Edit: "正在更新报告",
  NotebookEdit: "正在更新报告",
  Bash: "正在保存求职进度",
  TodoWrite: "正在规划执行步骤",
  Task: "正在执行",
};
const humanizeStep = (label: string): string => STEP_LABELS[label] ?? label;

// Auth/sign-in failures are the most common real error — detect them so we can give
// a concrete next step instead of a dead end (#8).
function isAuthError(job: Job): boolean {
  if (!isInvalidJob(job)) return false;
  const hay = `${job.steps[job.steps.length - 1]?.label ?? ""} ${job.text}`.toLowerCase();
  return /auth|login|sign[ -]?in|credential|api[ -]?key|unauthorized|not authenticated|installed and authenticated/.test(hay);
}

const fmtElapsed = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const fmtTokens = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

// Tick once a second WHILE running so a long evaluation visibly counts up (never
// looks frozen). Stops re-rendering as soon as the job settles.
function useElapsed(running: boolean, startedAt: number): number {
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running, startedAt]);
  return Math.max(0, now - startedAt);
}

// The ONE worker card — a pure function of a Job. Rendered in three surfaces:
// the sidebar tray (variant="tray", inside WorkerPills' Link), inline in the
// assistant chat (variant="inline"), and conceptually the /jobs/[id] timeline.
// Keeping it single is what guarantees the human UI and the agentic UI stay
// visually identical. TONE + pillTone live here (the canonical source).

export const TONE = {
  good: { bar: "bg-success-solid/75", chip: "bg-success-surface text-success", icon: "text-icon-success" },
  warn: { bar: "bg-warning-solid/75", chip: "bg-warning-surface text-warning", icon: "text-icon-warning" },
  bad: { bar: "bg-danger-solid/75", chip: "bg-danger-surface text-danger", icon: "text-icon-danger" },
  muted: { bar: "bg-faint/45", chip: "bg-surface-hover text-muted", icon: "text-icon-muted" },
} as const;

export function pillTone(j: Job): keyof typeof TONE {
  if (isInvalidJob(j)) return "bad";
  if (j.cacheState === "unverified") return "warn";
  if (j.status === "waiting") return "warn";
  if (j.status === "done") return "good";
  return "muted";
}

export function WorkerCard({
  job,
  variant = "tray",
  trailing,
}: {
  job: Job;
  variant?: "tray" | "inline";
  trailing?: React.ReactNode;
}) {
  const statusTone = pillTone(job);
  const tone = TONE[statusTone];
  const resultTone = TONE[job.result?.tone ?? statusTone];
  const invalid = isInvalidJob(job);
  const cachedOnly = job.cacheState === "unverified";
  const running = job.status === "running" && !invalid && !cachedOnly;
  const elapsed = useElapsed(running, job.startedAt);
  const rawLast = job.steps[job.steps.length - 1]?.label;
  const last = rawLast ? humanizeStep(rawLast) : undefined;
  const bottom = cachedOnly
    ? "当前工作区无法验证这条任务记录"
    : !invalid && job.status === "done" && job.result?.summary ? job.result.summary : last;
  const inline = variant === "inline";
  const hasScore = job.result?.score != null;
  const authError = isAuthError(job);
  const tokens = !invalid && job.status === "done" ? job.cost?.tokens ?? 0 : 0;

  return (
    <div className={cn(inline && "rounded-xl border border-border bg-surface/60 p-2.5")}>
      <div className="flex items-center gap-2">
        {cachedOnly ? (
          <AlertTriangle className={cn("size-3 shrink-0", tone.icon)} />
        ) : invalid ? (
          <AlertTriangle className={cn("size-3 shrink-0", tone.icon)} />
        ) : job.status === "running" ? (
          <Loader2 className="size-3 shrink-0 animate-spin text-icon-brand" />
        ) : job.status === "waiting" ? (
          <Clock3 className={cn("size-3 shrink-0", tone.icon)} />
        ) : (
          <Check className={cn("size-3 shrink-0", tone.icon)} />
        )}
        <span className={cn("truncate font-medium", inline ? "text-sm" : "text-xs")}>{job.title}</span>
        {hasScore && (
          <span
            className={cn(
              "ml-auto shrink-0 rounded px-1 py-0.5 font-semibold tabular-nums",
              inline ? "text-xs" : "text-[10px]",
              resultTone.chip,
            )}
          >
            {job.result!.score}
          </span>
        )}
        {trailing != null && (
          <span className={cn("shrink-0", hasScore ? "ml-1" : "ml-auto")}>{trailing}</span>
        )}
      </div>
      <div className={cn("mt-1.5 w-full overflow-hidden rounded-full bg-surface-hover", inline ? "h-1.5" : "h-1")}>
        {running ? (
          <div className="job-indeterminate h-full w-full" />
        ) : (
          <div className={cn("h-full w-full rounded-full", tone.bar)} />
        )}
      </div>
      {(bottom || running || (!invalid && job.status === "waiting")) && (
        <div className={cn("mt-1 truncate text-faint", inline ? "text-xs" : "text-[10px]")}>
          {running
            ? `${last ?? "执行中"} · ${fmtElapsed(elapsed)}`
            : job.status === "waiting"
              ? job.runStatus === "queued" ? "等待 Agent 处理" : job.runStatus === "waiting_input" ? "等待您回复" : "等待您确认修改"
              : bottom}
        </div>
      )}
      {authError && (
        <div className={cn("mt-1 text-warning", inline ? "text-xs" : "text-[10px]")}>
          请先在设置中登录 Agent CLI，然后重新运行。
        </div>
      )}
      {tokens > 0 && (
        <div className={cn("mt-1 text-faint tabular-nums", inline ? "text-xs" : "text-[10px]")}>
          {fmtTokens(tokens)} tokens{job.cost?.usd != null ? ` · $${job.cost.usd.toFixed(2)}` : ""}
        </div>
      )}
    </div>
  );
}

// Re-exported icon used by callers that compose their own trailing affordances.
export { X as DismissIcon };
