"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Loader2, Sparkles } from "lucide-react";
import { CostBadge } from "@/components/cost/cost-badge";
import { AgentTaskHandoffDialog } from "@/components/generate-pdf-button";
import {
  buildQueuedTaskInstruction,
  type AgentTaskHandoff,
  useJobs,
} from "@/components/jobs/job-store";
import { aiToParams } from "@/lib/explore";

const EXAMPLES = [
  "深圳 AI 创业公司的 Agent 产品负责人",
  "从 0 搭建 AI Native 团队的创业伙伴",
  "面向创始人推动 AI 转型落地的岗位",
];

// Agent handoff surface. Web records the task and gives the user a copyable
// instruction; the user's current Agent owns all model/search execution.
const STYLE = `
.co-aibox{position:relative;border-radius:1.1rem;border:1px solid var(--co-border,hsl(0 0% 50% /.22));background:color-mix(in srgb, var(--bg) 55%, transparent);transition:border-color .3s,box-shadow .3s}
.co-aibox::before{content:"";position:absolute;inset:-1px;border-radius:1.1rem;padding:1px;background:radial-gradient(70% 140% at 28% -10%,color-mix(in srgb,var(--color-brand) 45%,transparent),transparent 62%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:.45;transition:opacity .3s;pointer-events:none}
.co-aibox:focus-within::before{opacity:1}
.co-aibox:focus-within{border-color:color-mix(in srgb,var(--color-brand) 50%,transparent);box-shadow:none}
.co-aibox textarea{width:100%;resize:none;background:transparent;border:none;outline:none;font-size:16px;line-height:1.5;color:inherit}
.co-aibox textarea::placeholder{color:var(--co-faint,hsl(0 0% 58%))}
@media(prefers-reduced-motion:reduce){.co-aibox,.co-aibox::before{transition:none}}
`;

export function AiSearchBox({
  intent,
  onIntent,
  onRunScan,
}: {
  intent: string;
  onIntent: (s: string) => void;
  onRunScan: () => void;
}) {
  const { jobs, queueAgentTask } = useJobs();
  const ref = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const queuingRef = useRef(false);
  const [handoff, setHandoff] = useState<AgentTaskHandoff | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const normalizedIntent = intent.trim();
  const taskOpts = useMemo(() => {
    const shortIntent = normalizedIntent.length > 28
      ? `${normalizedIntent.slice(0, 28)}…`
      : normalizedIntent;
    return {
      title: shortIntent ? `搜索公开岗位 · ${shortIntent}` : "搜索公开岗位",
      subtitle: "等待用户自己的 Agent 处理",
      kind: "discover",
      input: normalizedIntent,
      page: normalizedIntent ? `/explore?${aiToParams(normalizedIntent)}` : "/explore?mode=ai",
    };
  }, [normalizedIntent]);
  const job = useMemo(
    () => jobs
      .filter((item) => item.kind === taskOpts.kind && item.input === taskOpts.input)
      .sort((a, b) => b.startedAt - a.startedAt)[0],
    [jobs, taskOpts],
  );

  const grow = () => {
    const t = ref.current;
    if (t) {
      t.style.height = "auto";
      t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
    }
  };

  function showExistingHandoff() {
    if (!job) return;
    setHandoff({
      id: job.id,
      instruction: buildQueuedTaskInstruction(taskOpts, job.id),
    });
    setHandoffOpen(true);
  }

  function beginAgentHandoff() {
    if (!normalizedIntent || queuingRef.current) return;
    if (
      job?.runStatus === "queued"
      || job?.runStatus === "waiting_approval"
      || job?.status === "running"
      || job?.status === "error"
    ) {
      showExistingHandoff();
      return;
    }
    queuingRef.current = true;
    const next = queueAgentTask(taskOpts);
    setHandoff(next);
    setHandoffOpen(true);
    window.setTimeout(() => {
      queuingRef.current = false;
    }, 500);
  }

  const completed = job?.runStatus === "completed" || job?.status === "done";
  const waitingApproval = job?.runStatus === "waiting_approval";

  return (
    <div>
      <style>{STYLE}</style>
      <div className="co-aibox p-4">
        <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-brand">
          <Sparkles className="size-3.5" aria-hidden="true" />
          告诉 Agent 你想找什么岗位
        </div>
        <textarea
          ref={ref}
          aria-label="目标岗位描述"
          rows={2}
          maxLength={500}
          value={intent}
          onChange={(e) => {
            onIntent(e.target.value);
            grow();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              beginAgentHandoff();
            }
          }}
          placeholder="例如：深圳 AI 创业公司，负责 Agent 产品与团队从 0 到 1"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-[12px] leading-5 text-muted">
            Web 只负责保存待办并生成交接指令，不会在这里启动搜索。复制指令交给当前 Agent 后，由它继续完成。
          </p>
          {completed || waitingApproval ? (
            <Link
              href={`/jobs/${job.id}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-button border border-outline-border bg-outline-bg px-4 text-sm font-medium text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover"
            >
              <Bot className="size-4 text-icon-brand" aria-hidden="true" />
              {waitingApproval ? "查看待确认结果" : "查看搜索结果"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : job?.status === "running" ? (
            <Link
              href={`/jobs/${job.id}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-button border border-outline-border bg-outline-bg px-4 text-sm font-medium text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover"
            >
              <Loader2 className="size-4 animate-spin text-icon-brand" aria-hidden="true" />
              Agent 正在搜索
            </Link>
          ) : (
            <button
              ref={triggerRef}
              type="button"
              disabled={!normalizedIntent}
              onClick={beginAgentHandoff}
              aria-haspopup="dialog"
              aria-expanded={handoffOpen}
              className="inline-flex min-h-10 items-center gap-2 rounded-button bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-sm transition hover:brightness-110 disabled:opacity-50"
            >
              <Bot className="size-4" aria-hidden="true" />
              {job?.runStatus === "queued"
                ? "等待 Agent 处理"
                : job?.status === "error"
                  ? "回到 Agent 重试"
                  : "交给 Agent 搜索"}
              {!job && (
                <CostBadge
                  kind="spend"
                  size="xs"
                  tip="搜索会在你当前的 Agent 中执行，可能消耗该 Agent 的 tokens；Web 工作台不会启动模型。"
                />
              )}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => onIntent(ex)}
            className="rounded-full border border-border bg-surface/40 px-3 py-1.5 text-[12px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            {ex}
          </button>
        ))}
        <button type="button" onClick={onRunScan} className="ml-auto inline-flex items-center gap-1 text-[12px] text-faint transition hover:text-foreground">
          或改用算法扫描 →
        </button>
      </div>
      <AgentTaskHandoffDialog
        handoff={handoff}
        open={handoffOpen}
        onClose={() => setHandoffOpen(false)}
        returnFocusRef={triggerRef}
      />
    </div>
  );
}
