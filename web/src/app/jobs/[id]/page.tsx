"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Loader2, Wrench, CircleDot, Check, X, Clock3, FileText, ArrowRight, ShieldCheck } from "lucide-react";
import { useJobs, type JobProposal } from "@/components/jobs/job-store";
import { HeroGlow } from "@/components/hero-glow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function contextualAction(page: string) {
  if (/^\/pipeline\/\d+/.test(page)) return "查看诊断报告";
  if (page === "/cv") return "打开简历页面";
  if (page === "/interview") return "打开面试故事库";
  if (page === "/config") return "打开设置";
  if (page === "/portals") return "打开岗位来源";
  return "打开相关页面";
}

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { jobs, refreshJobs } = useJobs();
  const job = jobs.find((j) => j.id === id);

  if (!job) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-brand">
          <ArrowLeft className="size-4" /> Agent 任务
        </Link>
        <p className="mt-8 text-sm text-muted">
          该任务已不在当前会话中，可能已结束或页面已重新加载。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-brand">
        <ArrowLeft className="size-4" /> Agent 任务
      </Link>

      <section className="dot-bg relative mt-5 overflow-hidden rounded-2xl border border-border bg-surface/40 px-6 py-7">
        {(job.status === "running" || job.status === "waiting") && <HeroGlow />}
        <div className="relative z-10">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-faint">
            {job.status === "running" ? (
              <><Loader2 className="size-3 animate-spin text-icon-brand" /> 执行中</>
            ) : job.status === "waiting" ? (
              <><Clock3 className="size-3 text-icon-warning" /> 等待确认</>
            ) : job.status === "done" ? (
              <><Check className="size-3 text-icon-success" /> 已完成</>
            ) : (
              <><X className="size-3 text-icon-danger" /> 出错</>
            )}
          </p>
          <h1 className="mt-2 font-display text-2xl tracking-tight text-landing">{job.title}</h1>
          {job.subtitle && <p className="mt-1 text-sm text-muted">{job.subtitle}</p>}
          <p className="mt-3 text-xs text-faint">{job.source === "agent" ? "由 Agent 原生入口发起" : "由 Web 工作台发起"}</p>
          {job.result?.score != null && (
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <Badge tone={job.result.tone}>{job.result.score}/5</Badge>
              {job.result.summary && <span className="text-sm text-muted">{job.result.summary}</span>}
            </div>
          )}
        </div>
      </section>

      {job.page && (
        <Link
          href={job.page}
          className="group mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface/45 px-4 py-3 transition-colors hover:bg-surface-hover"
        >
          <FileText className="size-4 text-icon-brand" />
          <span className="flex-1 text-sm font-medium text-foreground">{contextualAction(job.page)}</span>
          <ArrowRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
      )}

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

      <ol className="mt-6 space-y-2">
        {job.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            {s.kind === "tool" ? (
              <Wrench className="mt-0.5 size-3.5 shrink-0 text-icon-brand" />
            ) : (
              <CircleDot className="mt-0.5 size-3.5 shrink-0 text-icon-muted" />
            )}
            <span className={s.kind === "tool" ? "font-medium" : "text-muted"}>
              {s.kind === "tool" ? `调用 ${s.label}` : s.label}
            </span>
          </li>
        ))}
        {job.status === "running" && (
          <li className="flex items-center gap-2.5 text-sm text-muted">
            <Loader2 className="size-3.5 animate-spin text-icon-brand" /> 思考中…
          </li>
        )}
      </ol>

      {!!job.artifacts?.length && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">生成结果</h2>
          <div className="mt-3 grid gap-2">
            {job.artifacts.map((artifact) => (
              artifact.page ? (
                <Link key={artifact.path} href={artifact.page} className="group flex items-center gap-3 rounded-xl border border-border bg-surface/45 px-4 py-3 transition-colors hover:bg-surface-hover">
                  <FileText className="size-4 text-icon-brand" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{artifact.label}</p>
                    <p className="truncate text-xs text-faint">{artifact.path}</p>
                  </div>
                  <ArrowRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Link>
              ) : (
                <div key={artifact.path} className="flex items-center gap-3 rounded-xl border border-border bg-surface/45 px-4 py-3">
                  <FileText className="size-4 text-icon-brand" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{artifact.label}</p>
                    <p className="truncate text-xs text-faint">{artifact.path}</p>
                  </div>
                </div>
              )
            ))}
          </div>
        </section>
      )}

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
          <Button variant="outline" onClick={() => decide("reject")} disabled={busy !== null}>
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
