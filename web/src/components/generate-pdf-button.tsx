"use client";

import { useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bot, Check, Copy, FileText, Loader2, RotateCcw, X } from "lucide-react";
import {
  buildQueuedTaskInstruction,
  type AgentTaskHandoff,
  useJobs,
} from "@/components/jobs/job-store";
import { CostBadge } from "@/components/cost/cost-badge";

type Props = {
  n: string;
  company: string;
  pdfReady: boolean;
  reportNumber?: string;
};

export async function copyAgentInstruction(value: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {
    // Clipboard permissions vary across local browsers; fall back to a
    // temporary selection so the handoff remains usable.
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("无法复制 Agent 指令");
}

export function AgentTaskHandoffDialog({
  handoff,
  open,
  onClose,
  returnFocusRef,
}: {
  handoff: AgentTaskHandoff | null;
  open: boolean;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
}) {
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLButtonElement>(null);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => copyRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function closeDialog() {
    onClose();
    setCopied(false);
    window.requestAnimationFrame(() => returnFocusRef?.current?.focus());
  }

  async function copyInstruction() {
    if (!handoff) return;
    await copyAgentInstruction(handoff.instruction);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  }

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), a[href]",
    );
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

  if (!open || !handoff) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleDialogKeyDown}
        className="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-start gap-4">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-icon-brand">
            <Bot className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {handoff.attachmentPaths?.length ? "截图和任务已保存" : "任务已加入 Agent 待办"}
            </h2>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">
              Web 已保存{handoff.attachmentPaths?.length ? "任务与本地附件" : "任务"}，但不会替你启动模型。请回到 Codex、WorkBuddy 或其他 Agent，
              粘贴下面的指令继续处理。
            </p>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            aria-label="关闭"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-border-hover"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-faint">交给 Agent 的指令</p>
          <p className="mt-2 break-words text-sm leading-6 text-foreground">{handoff.instruction}</p>
        </div>

        {handoff.attachmentPaths && handoff.attachmentPaths.length > 0 && (
          <div className="mt-3 rounded-xl border border-success-border bg-success-surface px-4 py-3">
            <p className="text-xs font-semibold text-success">招聘截图已保存在当前工作区</p>
            <ul className="mt-2 space-y-1 text-xs text-muted" aria-label="招聘截图本地保存位置">
              {handoff.attachmentPaths.map((attachmentPath) => (
                <li key={attachmentPath}><code className="break-all text-foreground">{attachmentPath}</code></li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`/jobs/${handoff.id}`}
            onClick={closeDialog}
            className="inline-flex min-h-10 items-center justify-center rounded-button border border-outline-border bg-outline-bg px-4 text-sm font-medium text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-border-hover"
          >
            查看 Agent 任务
          </Link>
          <button
            ref={copyRef}
            type="button"
            onClick={copyInstruction}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button bg-brand px-4 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? "已复制" : "复制指令"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function GeneratePdfButton({ n, company, pdfReady, reportNumber }: Props) {
  const { jobs, queueAgentTask } = useJobs();
  const job = useMemo(
    () => jobs.filter((item) => item.kind === "pdf" && item.input === n).sort((a, b) => b.startedAt - a.startedAt)[0],
    [jobs, n],
  );
  const [handoff, setHandoff] = useState<AgentTaskHandoff | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const queuingRef = useRef(false);
  const taskOpts = {
    title: `生成定制简历 · ${company}`,
    subtitle: "等待用户自己的 Agent 处理",
    kind: "pdf",
    input: n,
    page: `/pipeline/${n}`,
  };
  const pdfHref = reportNumber
    ? `/api/cv-pdf?report=${encodeURIComponent(reportNumber)}`
    : `/api/cv-pdf?company=${encodeURIComponent(company)}`;

  function showExistingHandoff() {
    if (!job) return;
    setHandoff({
      id: job.id,
      instruction: buildQueuedTaskInstruction(taskOpts, job.id),
    });
    setDialogOpen(true);
  }

  function beginHandoff() {
    if (queuingRef.current) return;
    if (job?.runStatus === "queued" || job?.status === "running") {
      showExistingHandoff();
      return;
    }
    queuingRef.current = true;
    const next = queueAgentTask(taskOpts);
    setHandoff(next);
    setDialogOpen(true);
    window.setTimeout(() => {
      queuingRef.current = false;
    }, 500);
  }

  let trigger: React.ReactNode;
  if (job?.status === "running") {
    trigger = (
      <Link
        href={`/jobs/${job.id}`}
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-outline-border bg-outline-bg px-3 py-1 text-xs font-medium text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover max-sm:min-h-[44px]"
      >
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        Agent 正在生成…
      </Link>
    );
  } else if (job?.runStatus === "queued") {
    trigger = (
      <button
        ref={triggerRef}
        type="button"
        onClick={showExistingHandoff}
        aria-haspopup="dialog"
        aria-expanded={dialogOpen}
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-outline-border bg-outline-bg px-3 py-1 text-xs font-medium text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover max-sm:min-h-[44px]"
      >
        <Bot className="size-3.5 text-icon-brand" aria-hidden="true" />
        等待 Agent 处理
      </button>
    );
  } else if (job?.status === "error" && !pdfReady) {
    trigger = (
      <button
        ref={triggerRef}
        type="button"
        onClick={showExistingHandoff}
        aria-haspopup="dialog"
        aria-expanded={dialogOpen}
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-outline-border bg-outline-bg px-3 py-1 text-xs font-medium text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover max-sm:min-h-[44px]"
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        回到 Agent 重试
      </button>
    );
  } else if (pdfReady || job?.status === "done") {
    trigger = (
      <span className="inline-flex items-center gap-1">
        <a
          href={pdfHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/15 dark:text-emerald-400 max-sm:min-h-[44px]"
        >
          <FileText className="size-3.5" aria-hidden="true" />
          查看定制简历
        </a>
        <button
          ref={triggerRef}
          type="button"
          onClick={beginHandoff}
          title="在 Agent 中重新生成定制简历"
          aria-label="在 Agent 中重新生成定制简历"
          aria-haspopup="dialog"
          aria-expanded={dialogOpen}
          className="inline-flex items-center justify-center rounded-full p-1 text-faint transition-colors hover:text-brand max-sm:min-h-[44px] max-sm:min-w-[44px]"
        >
          <RotateCcw className="size-3" aria-hidden="true" />
        </button>
      </span>
    );
  } else {
    trigger = (
      <span className="inline-flex items-center gap-1.5">
        <button
          ref={triggerRef}
          type="button"
          onClick={beginHandoff}
          aria-haspopup="dialog"
          aria-expanded={dialogOpen}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-outline-border bg-outline-bg px-3 py-1 text-xs font-medium text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover max-sm:min-h-[44px]"
          title="由你的 Codex、WorkBuddy 或其他 Agent 生成岗位定制简历"
        >
          <Bot className="size-3.5 text-icon-brand" aria-hidden="true" />
          在 Agent 中生成
        </button>
        <CostBadge kind="spend" size="xs" />
      </span>
    );
  }

  return (
    <>
      {trigger}
      <AgentTaskHandoffDialog
        handoff={handoff}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        returnFocusRef={triggerRef}
      />
    </>
  );
}
