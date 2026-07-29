"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Bot, Check, Copy, Loader2, ShieldCheck } from "lucide-react";
import { copyAgentInstruction } from "@/components/generate-pdf-button";
import {
  buildExistingTaskInstruction,
  useJobs,
  type Job,
  type JobProposal,
} from "@/components/jobs/job-store";
import { AgentTaskDetailPanel } from "@/components/jobs/worker-pills";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { jobs, refreshJobs } = useJobs();
  const job = jobs.find((j) => j.id === id);

  if (!job) {
    return (
      <div className="page-shell py-10">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-brand">
          <ArrowLeft className="size-4" /> Agent 任务
        </Link>
        <p className="mt-8 text-sm text-muted">
          该任务已不在当前会话中，可能已结束或页面已重新加载。
        </p>
      </div>
    );
  }

  const continuationInstruction = buildExistingTaskInstruction(job);
  const isAgentHandoff = Boolean(job.instruction)
    || job.runStatus === "queued"
    || job.id.startsWith("run-web-");
  const canContinue = isAgentHandoff
    && continuationInstruction
    && (job.runStatus === "queued" || job.runStatus === "running" || job.runStatus === "failed");

  return (
    <div className="page-shell py-8">
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-brand">
        <ArrowLeft className="size-4" /> Agent 任务
      </Link>

      <div className="mt-5">
        <AgentTaskDetailPanel job={job} titleLevel="h1">
          {!!job.proposals?.length && (
            <section className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-icon-brand" />
                <h2 className="text-sm font-semibold text-foreground">待确认修改</h2>
                <span className="text-xs text-faint">Agent 只提出修改，确认后才会落盘</span>
              </div>
              {job.proposals.map((proposal) => (
                <ProposalReview key={proposal.id} proposal={proposal} onSettled={refreshJobs} />
              ))}
            </section>
          )}
        </AgentTaskDetailPanel>
        {canContinue && (
          <AgentTaskContinuation job={job} instruction={continuationInstruction} />
        )}
      </div>

      {job.text && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">输出结果</h2>
          <div className="report-prose mt-3 rounded-2xl border border-border bg-surface/40 p-5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{job.text}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

function AgentTaskContinuation({ job, instruction }: { job: Job; instruction: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const running = job.runStatus === "running";
  const failed = job.runStatus === "failed";
  const title = failed
    ? "从原任务继续重试"
    : running
      ? "Agent 已接手这个任务"
      : "交给你的 Agent 继续";
  const actionLabel = running || failed ? "复制续接指令" : "复制并交给 Agent";

  async function copyInstruction() {
    try {
      await copyAgentInstruction(instruction);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2_000);
    } catch {
      setCopyState("error");
    }
  }

  return (
    <section
      data-agent-task-handoff
      className="mt-6 overflow-hidden rounded-2xl border border-warning-border bg-warning-surface/35"
      aria-labelledby="agent-task-handoff-title"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-icon-brand">
            <Bot className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="agent-task-handoff-title" className="text-sm font-semibold text-foreground">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              {running
                ? "如果原 Agent 仍在执行，请直接等待；只有原会话中断时，才需要复制下面的续接指令。"
                : failed
                  ? "复制下面的指令重新交给 Agent，它会从当前任务继续，而不是重新排队。"
                  : "复制下面的指令交给当前 Agent，它会接手已经创建的这项待办。"}
            </p>
            <p className="mt-2 text-xs text-faint">
              当前任务 ID：
              <code className="break-all font-mono text-muted">{job.id}</code>
              <span className="mx-1.5" aria-hidden="true">·</span>
              继续时会复用当前任务 ID，不会创建新任务。
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="shrink-0"
          onClick={copyInstruction}
          aria-describedby="agent-task-copy-status"
        >
          {copyState === "copied" ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copyState === "copied" ? "已复制" : actionLabel}
        </Button>
      </div>
      <div className="border-t border-warning-border bg-surface/55 px-5 py-4">
        <p className="break-words text-sm leading-6 text-foreground">{instruction}</p>
        <p
          id="agent-task-copy-status"
          className={copyState === "error" ? "mt-2 text-xs text-danger" : "sr-only"}
          role={copyState === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {copyState === "copied"
            ? "续接指令已复制"
            : copyState === "error"
              ? "复制失败，请手动选择上方指令。"
              : ""}
        </p>
      </div>
    </section>
  );
}

type ProposalDetail = JobProposal & { baseContent: string | null; proposedContent: string };

function ProposalReview({ proposal, onSettled }: { proposal: JobProposal; onSettled: () => void }) {
  const [detail, setDetail] = useState<ProposalDetail | null>(null);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/agent-runs?proposalId=${encodeURIComponent(proposal.id)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((value) => {
        if (value.error) throw new Error(value.error);
        setDetail(value);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "无法读取修改提案"));
  }, [proposal.id, proposal.updatedAt]);

  const decide = async (action: "approve" | "reject") => {
    setBusy(action);
    setError("");
    try {
      const response = await fetch("/api/agent-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, proposalId: proposal.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "操作失败");
      setDetail(result);
      onSettled();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "操作失败");
      onSettled();
    } finally {
      setBusy(null);
    }
  };

  const status = detail?.status ?? proposal.status;
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface/45">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{proposal.title}</p>
          <p className="mt-1 text-sm text-muted">{proposal.summary}</p>
          <p className="mt-1 font-mono text-xs text-faint">{proposal.target}</p>
        </div>
        <Badge tone={status === "pending" ? "warn" : status === "applied" ? "good" : status === "stale" ? "bad" : "muted"}>
          {status === "pending" ? "待确认" : status === "applied" ? "已应用" : status === "stale" ? "文件已变化" : "已拒绝"}
        </Badge>
      </div>

      {detail && (
        <div className="grid border-t border-border lg:grid-cols-2">
          <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
            <p className="mb-2 text-xs font-semibold text-faint">修改前</p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-background/60 p-3 text-xs leading-relaxed text-muted">{detail.baseContent ?? "（新文件）"}</pre>
          </div>
          <div className="p-4">
            <p className="mb-2 text-xs font-semibold text-brand-text">修改后</p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-brand-soft/45 p-3 text-xs leading-relaxed text-foreground">{detail.proposedContent}</pre>
          </div>
        </div>
      )}

      {error && <p className="border-t border-border px-5 py-3 text-sm text-red-600 dark:text-red-300">{error}</p>}
      {status === "pending" && (
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="tertiary" onClick={() => decide("reject")} disabled={busy !== null}>
            {busy === "reject" && <Loader2 className="size-4 animate-spin" />} 暂不修改
          </Button>
          <Button onClick={() => decide("approve")} disabled={busy !== null || !detail}>
            {busy === "approve" && <Loader2 className="size-4 animate-spin" />} 确认并应用
          </Button>
        </div>
      )}
    </article>
  );
}
