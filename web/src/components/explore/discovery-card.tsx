"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Plus, Check, Loader2, ShieldQuestion, Sparkles, Coins } from "lucide-react";
import { cn } from "@/lib/cn";
import { ATS_LABEL, type AtsSource, type DiscoveredOffer } from "@/lib/explore";
import { useJobs } from "@/components/jobs/job-store";
import { useExplore } from "./explore-provider";

function freshness(postedAt: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(postedAt)) return "";
  const days = Math.max(0, Math.round((Date.now() - new Date(postedAt + "T00:00:00Z").getTime()) / 86_400_000));
  return days === 0 ? "今天" : days === 1 ? "1 天前" : `${days} 天前`;
}

// Real company logo (favicon) via the localhost proxy, cached on disk FOREVER per
// company — so once it resolves it's instant for this card AND every other card,
// this search or any future one. Falls back to a monogram on miss.
function Logo({ company }: { company: string }) {
  const [failed, setFailed] = useState(false);
  const letter = (company || "?").trim().charAt(0).toUpperCase();
  if (failed || !company.trim()) {
    return <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-semibold text-brand">{letter}</div>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/logo?company=${encodeURIComponent(company)}`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-9 shrink-0 rounded-lg border border-border bg-surface object-contain p-1"
    />
  );
}

// What a running worker is doing on this exact posting → the live CTA label.
const WORKER_LABEL: Record<string, string> = { evaluate: "评估中…", pdf: "准备简历中…", research: "调研中…", apply: "填写中…" };

export function DiscoveryCard({ offer, inPipeline, evaluatedN }: { offer: DiscoveredOffer; inPipeline: boolean; evaluatedN?: string }) {
  const { added, adding, addToPipeline } = useExplore();
  const { jobs, startJob } = useJobs();

  // GLOBAL worker awareness: any worker acting on this URL drives the CTA, here
  // and on every other surface that renders this offer (the jobs store is global).
  const job = useMemo(
    () => jobs.filter((j) => j.input === offer.url).sort((a, b) => b.startedAt - a.startedAt)[0],
    [jobs, offer.url],
  );
  const working = job?.status === "running";
  const doneEval = job?.status === "done" && job.kind === "evaluate";
  const statusLabel = WORKER_LABEL[job?.kind ?? ""] ?? "执行中…";

  const isAdded = added.has(offer.url) || inPipeline || working || doneEval;
  const isAdding = adding.has(offer.url);
  const unverified = offer.verification === "unconfirmed";
  const fresh = freshness(offer.postedAt) || offer.postedHint || "";

  const evaluate = () => {
    addToPipeline([offer]); // evaluating implies it's in the pipeline — record it
    startJob({ title: `评估 · ${offer.company}`, subtitle: offer.title, kind: "evaluate", input: offer.url, page: "/explore" });
  };

  return (
    <div className="co-rise group flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-surface/40 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <Logo company={offer.company} />
        <a href={offer.url} target="_blank" rel="noopener noreferrer" className="block min-w-0 flex-1 max-sm:min-h-[44px]">
          <h3 className={`font-display truncate text-[17px] leading-tight text-foreground transition-colors group-hover:text-brand`}>{offer.title}</h3>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {offer.company}
            {offer.location && <span className="text-faint"> · {offer.location}</span>}
          </p>
        </a>
        <a
          href={offer.url}
          target="_blank"
          rel="noopener noreferrer"
          title="打开岗位页面"
          aria-label="打开岗位页面"
          className="-m-1 inline-flex shrink-0 items-center justify-center rounded p-1 text-faint transition-colors hover:text-foreground max-sm:min-h-[44px] max-sm:min-w-[44px]"
        >
          <ExternalLink className="size-4" />
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded border border-border px-1.5 py-0.5 font-medium text-muted">{ATS_LABEL[offer.ats as AtsSource] ?? offer.ats}</span>
        {fresh && <span className="text-faint">{fresh}</span>}
        {unverified && (
          <span
            className="inline-flex items-center gap-1 rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-600 dark:text-amber-300"
            title="Agent 从公开信息中发现该岗位，评估时会通过真实浏览器确认岗位是否仍有效"
          >
            <ShieldQuestion className="size-3" /> 未验证
          </span>
        )}
        {offer.matchedKeyword && (
          <span className="text-faint" title="仅为关键词匹配，评估后才能得到 A–F 匹配度评分">
            · 匹配 <span className="text-brand/80">{offer.matchedKeyword}</span>
          </span>
        )}
      </div>

      {offer.why && (
        <p className="flex items-start gap-1.5 text-[12px] leading-snug text-brand/80">
          <Sparkles className="mt-0.5 size-3 shrink-0" />
          {offer.why}
        </p>
      )}

      <div className="mt-0.5">
        {evaluatedN || doneEval ? (
          <a
            href={evaluatedN ? `/pipeline/${evaluatedN}` : job ? `/jobs/${job.id}` : "/pipeline"}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-brand-soft px-2.5 py-2 text-xs font-medium text-brand max-sm:min-h-[44px]"
          >
            <Check className="size-3.5" /> 已评估 · 查看报告
          </a>
        ) : working ? (
          <div className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-brand/30 bg-brand-soft/60 px-2.5 py-2 text-xs font-medium text-brand">
            <Loader2 className="size-3.5 animate-spin" />
            {statusLabel}
            <span className="text-brand/60">· 已进入求职进度</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isAdded || isAdding}
              onClick={() => addToPipeline([offer])}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-2 text-xs font-medium transition-colors max-sm:min-h-[44px]",
                isAdded ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-surface-hover text-foreground hover:bg-brand-soft hover:text-brand",
              )}
            >
              {isAdding ? <Loader2 className="size-3.5 animate-spin" /> : isAdded ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
              {isAdded ? "已加入" : "加入求职进度"}
            </button>
            <button
              type="button"
              onClick={evaluate}
              title={unverified ? "执行真实评估并验证岗位有效性，会消耗 tokens" : "执行真实 A–F 评估，会消耗 tokens"}
              className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-outline-border bg-outline-bg px-2.5 py-2 text-xs font-medium text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover max-sm:min-h-[44px]"
            >
              评估 <Coins className="size-3.5 opacity-80" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
