"use client";

import { useMemo, useRef, useState } from "react";
import { Bot, Sparkles } from "lucide-react";
import { AgentTaskHandoffDialog } from "@/components/generate-pdf-button";
import {
  buildQueuedTaskInstruction,
  isInvalidJob,
  type AgentTaskHandoff,
  useJobs,
} from "@/components/jobs/job-store";
import { CostBadge } from "@/components/cost/cost-badge";

// Paste a job URL, persist a task, then hand the instruction to the user's
// current Agent product. Web never starts a model or a CLI process.
export function QuickEvaluate({ page = "/" }: { page?: string }) {
  const { jobs, queueAgentTask } = useJobs();
  const [url, setUrl] = useState("");
  const [hint, setHint] = useState("");
  const [handoff, setHandoff] = useState<AgentTaskHandoff | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const queuingRef = useRef(false);
  const normalizedUrl = url.trim();
  const taskOpts = useMemo(() => ({
    title: "评估 · 粘贴的网址",
    subtitle: normalizedUrl,
    kind: "evaluate",
    input: normalizedUrl,
    page,
  }), [normalizedUrl]);
  const job = useMemo(
    () => jobs
      .filter((item) => item.kind === "evaluate" && item.input === normalizedUrl)
      .sort((a, b) => b.startedAt - a.startedAt)[0],
    [jobs, normalizedUrl],
  );

  function run() {
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      setHint("请粘贴完整的岗位网址（https://…）。");
      return;
    }
    if (queuingRef.current) return;
    if (job) {
      setHandoff({
        id: job.id,
        instruction: buildQueuedTaskInstruction(taskOpts, job.id),
      });
      setHandoffOpen(true);
      if (isInvalidJob(job)) setHint("将继续使用原任务记录，不会创建重复任务。");
      return;
    }
    queuingRef.current = true;
    setHandoff(queueAgentTask(taskOpts));
    setHandoffOpen(true);
    setHint("任务已保存。复制指令后回到你的 Agent 继续评估。");
    window.setTimeout(() => {
      queuingRef.current = false;
    }, 500);
  }

  return (
    <div className="mt-7">
      <div className="flex max-w-xl items-center gap-2 rounded-full border border-border bg-surface/70 py-1.5 pl-4 pr-1.5 shadow-sm focus-within:border-brand/50">
        <Sparkles className="size-4 shrink-0 text-icon-brand" />
        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (hint) setHint("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") run();
          }}
          placeholder="粘贴岗位网址进行评估…"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-faint"
        />
        <button
          ref={triggerRef}
          type="button"
          onClick={run}
          aria-haspopup="dialog"
          aria-expanded={handoffOpen}
          className="shrink-0 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-200"
        >
          <span className="inline-flex items-center gap-1.5">
            <Bot className="size-4" aria-hidden="true" />
            {job?.runStatus === "queued"
              ? "查看 Agent 指令"
              : job && isInvalidJob(job)
                ? "重新交给 Agent 评估"
                : "交给 Agent 评估"}
          </span>
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <CostBadge kind="spend" size="xs" />
        <span className="text-xs text-faint">Web 只保存任务；评估由你当前的 Agent 产品执行。</span>
      </div>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
      <AgentTaskHandoffDialog
        handoff={handoff}
        open={handoffOpen}
        onClose={() => setHandoffOpen(false)}
        returnFocusRef={triggerRef}
      />
    </div>
  );
}
