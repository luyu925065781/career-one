"use client";

import { useJobs } from "@/components/jobs/job-store";
import { AgentTaskListCard, ClearFinishedButton } from "@/components/jobs/worker-pills";

export default function JobsHistory() {
  const { jobs } = useJobs();

  return (
    <div className="page-shell py-8">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl tracking-tight text-landing">Agent 任务</h1>
          <p className="mt-1 w-full text-sm text-muted">
            持久记录每次 Agent 执行，重新打开工作台仍可查看。
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm tabular-nums text-faint">{jobs.length} 条</span>
          <ClearFinishedButton />
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface/30 px-6 py-14 text-center text-sm text-muted">
          还没有 Agent 任务。请在 Codex 等 Agent 产品中使用择程AI发起任务。
        </div>
      ) : (
        <ul className="mt-6 space-y-4" aria-label="Agent 任务历史">
          {jobs.map((job) => (
            <li key={job.id}>
              <AgentTaskListCard job={job} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
