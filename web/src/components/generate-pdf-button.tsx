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
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

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
      data-ui-dialog-backdrop
      className="z-[110]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <div
        data-ui-dialog="standard"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleDialogKeyDown}
        className="w-full max-w-xl p-6"
      >
        <div className="flex items-start gap-4">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-icon-brand">
            <Bot className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {handoff.attachmentPaths?.length ? "任务和本地附件已保存" : "任务已加入 Agent 待办"}
            </h2>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">
              Web 已保存{handoff.attachmentPaths?.length ? "任务与本地附件" : "任务"}，但不会替你启动模型。请回到 Codex、WorkBuddy 或其他 Agent，
              粘贴下面的指令继续处理。
            </p>
          </div>
          <Button
            type="button"
            onClick={closeDialog}
            aria-label="关闭"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-icon-muted"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-5 rounded-xl border border-border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-faint">交给 Agent 的指令</p>
          <p className="mt-2 break-words text-sm leading-6 text-foreground">{handoff.instruction}</p>
        </div>

        {handoff.attachmentPaths && handoff.attachmentPaths.length > 0 && (
          <div className="mt-3 rounded-xl border border-success-border bg-success-surface px-4 py-3">
            <p className="text-xs font-semibold text-success">本地附件已保存在当前工作区</p>
            <ul className="mt-2 space-y-1 text-xs text-muted" aria-label="本地附件保存位置">
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
            className={cn(buttonVariants({ variant: "tertiary" }), "px-4")}
          >
            查看 Agent 任务
          </Link>
          <Button
            ref={copyRef}
            type="button"
            onClick={copyInstruction}
            className="px-4 font-semibold"
          >
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? "已复制" : "复制指令"}
          </Button>
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
        className={buttonVariants({ variant: "tertiary", size: "sm" })}
      >
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        Agent 正在生成…
      </Link>
    );
  } else if (job?.runStatus === "queued") {
    trigger = (
      <Button
        ref={triggerRef}
        type="button"
        onClick={showExistingHandoff}
        aria-haspopup="dialog"
        aria-expanded={dialogOpen}
        variant="tertiary"
        size="sm"
      >
        <Bot className="size-3.5 text-icon-brand" aria-hidden="true" />
        等待 Agent 处理
      </Button>
    );
  } else if (job?.status === "error" && !pdfReady) {
    trigger = (
      <Button
        ref={triggerRef}
        type="button"
        onClick={showExistingHandoff}
        aria-haspopup="dialog"
        aria-expanded={dialogOpen}
        variant="tertiary"
        size="sm"
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        回到 Agent 重试
      </Button>
    );
  } else if (pdfReady || job?.status === "done") {
    trigger = (
      <span className="inline-flex items-center gap-1">
        <a
          href={pdfHref}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "tertiary", size: "sm" })}
        >
          <FileText className="size-3.5" aria-hidden="true" />
          查看定制简历
        </a>
        <Button
          ref={triggerRef}
          type="button"
          onClick={beginHandoff}
          title="在 Agent 中重新生成定制简历"
          aria-label="在 Agent 中重新生成定制简历"
          aria-haspopup="dialog"
          aria-expanded={dialogOpen}
          variant="ghost"
          size="icon-sm"
          className="text-icon-muted"
        >
          <RotateCcw className="size-3" aria-hidden="true" />
        </Button>
      </span>
    );
  } else {
    trigger = (
      <span className="inline-flex items-center gap-1.5">
        <Button
          ref={triggerRef}
          type="button"
          onClick={beginHandoff}
          aria-haspopup="dialog"
          aria-expanded={dialogOpen}
          variant="tertiary"
          size="sm"
          title="由你的 Codex、WorkBuddy 或其他 Agent 生成岗位定制简历"
        >
          <Bot className="size-3.5 text-icon-brand" aria-hidden="true" />
          在 Agent 中生成
        </Button>
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
