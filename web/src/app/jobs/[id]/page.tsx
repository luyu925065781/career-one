"use client";

import { use, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createPortal } from "react-dom";
import { AlertTriangle, ArrowLeft, Bot, Check, Copy, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { copyAgentInstruction } from "@/components/generate-pdf-button";
import {
  buildExistingTaskInstruction,
  buildWaitingInputInstruction,
  isInvalidJob,
  useJobs,
  type Job,
  type JobProposal,
} from "@/components/jobs/job-store";
import { AgentTaskDetailPanel } from "@/components/jobs/worker-pills";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { jobs, jobsReady, refreshJobs } = useJobs();
  const job = jobs.find((j) => j.id === id);

  if (!jobsReady) {
    return (
      <div className="page-shell py-10">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-interactive-hover">
          <ArrowLeft className="size-4" /> Agent 任务
        </Link>
        <p className="mt-8 flex items-center gap-2 text-sm text-muted" aria-live="polite">
          <Loader2 className="size-4 animate-spin text-icon-brand" aria-hidden="true" />
          正在核对当前工作区的任务记录…
        </p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="page-shell py-10">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-interactive-hover">
          <ArrowLeft className="size-4" /> Agent 任务
        </Link>
        <p className="mt-8 text-sm text-muted">
          当前工作区中找不到这项任务。它可能属于其他隔离环境，或服务端任务记录已经不存在。
        </p>
      </div>
    );
  }

  const continuationInstruction = buildExistingTaskInstruction(job);
  const invalid = isInvalidJob(job);
  const isAgentHandoff = Boolean(job.instruction)
    || job.runStatus === "queued"
    || invalid
    || job.id.startsWith("run-web-");
  const canContinue = isAgentHandoff
    && continuationInstruction
    && (job.runStatus === "queued" || job.runStatus === "running" || job.runStatus === "waiting_input" || invalid);
  const canDelete = job.runStatus === "queued" && !invalid;

  return (
    <div className="page-shell py-8">
      <div className="flex items-center justify-between gap-4">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-interactive-hover">
          <ArrowLeft className="size-4" /> Agent 任务
        </Link>
        {canDelete && <QueuedTaskArchiveButton job={job} />}
      </div>

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
                <ProposalReview
                  key={proposal.id}
                  proposal={proposal}
                  resultPage={job.page}
                  onSettled={refreshJobs}
                />
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

function QueuedTaskArchiveButton({ job }: { job: Job }) {
  const router = useRouter();
  const { removeJob } = useJobs();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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

  function closeDialog() {
    if (busy) return;
    setOpen(false);
    setError("");
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function confirmArchive() {
    setBusy(true);
    setError("");
    try {
      await removeJob(job.id);
      router.replace("/jobs");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除任务失败");
      setBusy(false);
    }
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

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="danger-ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="shrink-0"
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        删除任务
      </Button>

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
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-surface text-icon-danger">
                <AlertTriangle className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-semibold text-foreground">删除这项待确认任务？</h2>
                <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">
                  任务会从待确认列表和当前工作台中隐藏，但只进行逻辑删除。
                  底层任务记录、任务 ID 和已生成产物都会保留。
                </p>
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-danger-surface px-3 py-2 text-sm text-danger" role="alert">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                ref={cancelRef}
                type="button"
                variant="tertiary"
                onClick={closeDialog}
                disabled={busy}
              >
                取消
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={confirmArchive}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
                {busy ? "正在删除…" : "删除任务"}
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function AgentTaskContinuation({ job, instruction }: { job: Job; instruction: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [answer, setAnswer] = useState("");
  const invalid = isInvalidJob(job);
  const running = job.runStatus === "running" && !invalid;
  const waitingInput = job.runStatus === "waiting_input" && !invalid;
  const title = invalid
    ? "重新交给 Agent 处理"
    : waitingInput
      ? "等待您在 Agent 中回复"
      : running
        ? "Agent 已接手这个任务"
        : "交给你的 Agent 继续";
  const actionLabel = invalid
    ? "复制重试指令"
    : waitingInput
      ? "复制回答并继续"
      : running
        ? "复制续接指令"
        : "复制并交给 Agent";

  async function copyInstruction() {
    try {
      await copyAgentInstruction(waitingInput ? buildWaitingInputInstruction(job, answer) : instruction);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2_000);
    } catch {
      setCopyState("error");
    }
  }

  const copyButton = (
    <Button
      type="button"
      className={waitingInput ? "mt-3" : "shrink-0"}
      onClick={copyInstruction}
      disabled={waitingInput && !answer.trim()}
      aria-describedby="agent-task-copy-status"
    >
      {copyState === "copied" ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      {copyState === "copied" ? "已复制" : actionLabel}
    </Button>
  );

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
                : waitingInput
                  ? "Agent 已暂停并等待您的信息。请在下方填写回答，再复制回原 Agent 对话继续同一个任务。"
                : invalid
                  ? "复制下面的指令重新交给 Agent，它会从当前任务继续，而不是重新排队。"
                  : "复制下面的指令交给当前 Agent，让它继续完成这项任务。"}
            </p>
            <p className="mt-2 text-xs text-faint">
              当前任务 ID：
              <code className="break-all font-mono text-muted">{job.id}</code>
              <span className="mx-1.5" aria-hidden="true">·</span>
              继续时会复用当前任务 ID，不会创建新任务。
            </p>
          </div>
        </div>
        {!waitingInput && copyButton}
      </div>
      {waitingInput && (
        <div className="border-t border-warning-border bg-surface/55 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-warning">Agent 等待您的回答</p>
          <p className="mt-2 text-sm font-medium leading-6 text-foreground">{job.question}</p>
          <label className="mt-4 block text-xs font-semibold text-muted" htmlFor="agent-task-answer">
            您的回答
          </label>
          <textarea
            data-ui-control
            id="agent-task-answer"
            aria-label="您的回答"
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              if (copyState !== "idle") setCopyState("idle");
            }}
            rows={3}
            placeholder="请填写您希望告诉 Agent 的信息"
            className="mt-2 w-full resize-y rounded-control border border-input-border bg-background px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
          <p className="mt-2 text-xs leading-5 text-faint">
            回答不会由 Web 自动发送。复制后，请粘贴到原 Agent 对话中。
          </p>
          {copyButton}
        </div>
      )}
      <div className="border-t border-warning-border bg-surface/55 px-5 py-4">
        <p className="break-words text-sm leading-6 text-foreground">
          {waitingInput ? "填写回答后，复制并粘贴到原 Agent 对话中；Web 不会在这里启动 Agent。" : instruction}
        </p>
        <p
          id="agent-task-copy-status"
          className={copyState === "error" ? "mt-2 text-xs text-danger" : copyState === "copied" ? "mt-2 text-xs text-success" : "sr-only"}
          role={copyState === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {copyState === "copied"
            ? waitingInput ? "已复制，请粘贴到原 Agent 对话中。" : "续接指令已复制"
            : copyState === "error"
              ? "复制失败，请手动选择上方指令。"
              : ""}
        </p>
      </div>
    </section>
  );
}

type ProposalDetail = JobProposal & { baseContent: string | null; proposedContent: string };

function ProposalReview({
  proposal,
  resultPage,
  onSettled,
}: {
  proposal: JobProposal;
  resultPage?: string;
  onSettled: () => void;
}) {
  const router = useRouter();
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
      setDetail(result.proposal);
      onSettled();
      if (action === "approve" && result.run?.status === "completed" && resultPage?.startsWith("/") && !resultPage.startsWith("//")) {
        router.replace(resultPage);
        return;
      }
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

      {error && <p className="border-t border-border px-5 py-3 text-sm text-danger" role="alert">{error}</p>}
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
