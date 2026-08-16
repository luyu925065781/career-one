"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  ChevronsUpDown,
  X,
  ScanSearch,
  ArrowRight,
  ArrowLeft,
  CalendarDays,
  Check,
  ExternalLink,
  FileText,
  ListChecks,
} from "lucide-react";
import type { Application, InboxJob } from "@/lib/career-one";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CompanyLogo } from "@/components/company-logo";
import { StatusSelect } from "@/components/status-select";
import { GeneratePdfButton } from "@/components/generate-pdf-button";
import { ApplyButton } from "@/components/apply-button";
import { DeleteFromTracker } from "@/components/delete-from-tracker";
import { canonStatus, scoreNum, scoreTone } from "@/lib/format";
import { InboxTriage } from "@/components/inbox/inbox-triage";
import { cn } from "@/lib/cn";
import { PRIMARY_NAV_ITEMS } from "@/lib/nav-items";
import { resolveCompanyIdentity } from "@/lib/company";

const PageIcon = PRIMARY_NAV_ITEMS.pipeline.icon;

// ALL leads the navigation and is the default at the bare /pipeline route;
// INBOX stays explicit so the pending-job triage flow remains directly addressable.
const TABS = [
  "ALL",
  "INBOX",
  "EVALUATED",
  "APPLIED",
  "RESPONDED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "DISCARDED",
  "SKIP",
] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  INBOX: "待处理",
  ALL: "全部",
  EVALUATED: "已评估",
  APPLIED: "已投递",
  RESPONDED: "已回复",
  INTERVIEW: "面试中",
  OFFER: "Offer",
  REJECTED: "被拒",
  DISCARDED: "已放弃",
  SKIP: "跳过",
};

const SORT_KEYS = ["role", "company", "score", "status", "date"] as const;
type SortKey = (typeof SORT_KEYS)[number];

const SORT_LABELS: Record<SortKey, string> = {
  company: "公司",
  role: "岗位",
  score: "评分",
  status: "状态",
  date: "日期",
};

export function ReportBackButton() {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.replace("/pipeline");
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="返回上一页"
      className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      返回
    </button>
  );
}

const APPLICATION_STAGES = [
  { key: "EVALUATED", label: "已评估" },
  { key: "APPLIED", label: "已投递" },
  { key: "RESPONDED", label: "已回复" },
  { key: "INTERVIEW", label: "面试中" },
  { key: "OFFER", label: "已获 Offer" },
] as const;

const DETAIL_STATUS_LABEL: Record<string, string> = {
  EVALUATED: "已评估",
  APPLIED: "已投递",
  RESPONDED: "已回复",
  INTERVIEW: "面试中",
  OFFER: "已获 Offer",
  REJECTED: "被拒",
  DISCARDED: "已放弃",
  SKIP: "跳过",
};

const NEXT_STEP_COPY: Record<string, { title: string; description: string }> = {
  EVALUATED: {
    title: "确认是否投递",
    description: "先查看岗位评估报告，再准备定制简历。确认材料无误后，由你亲自完成投递。",
  },
  APPLIED: {
    title: "等待回复并安排跟进",
    description: "记录招聘方的回复；如果一段时间没有进展，按你的跟进节奏主动沟通。",
  },
  RESPONDED: {
    title: "确认下一步沟通安排",
    description: "补充沟通结果、面试时间和准备重点，并把状态推进到真实所在阶段。",
  },
  INTERVIEW: {
    title: "准备下一轮面试",
    description: "围绕岗位要求整理故事与问题清单，面试结束后及时更新结果。",
  },
  OFFER: {
    title: "核对 Offer 并做决定",
    description: "确认薪资、合同条款、入职条件和接受期限，再记录最终决定。",
  },
  REJECTED: {
    title: "复盘这次机会",
    description: "记录明确反馈和可改进点，完成复盘后把注意力转向更匹配的岗位。",
  },
  DISCARDED: {
    title: "保留记录，继续寻找",
    description: "这条机会已由你放弃。保留判断依据，避免以后重复投入。",
  },
  SKIP: {
    title: "保留记录，继续寻找",
    description: "这条机会已跳过。继续筛选更符合目标方向和边界条件的岗位。",
  },
};

function progressStatusTone(status: string) {
  if (status === "OFFER" || status === "INTERVIEW") {
    return "border-success-border bg-success-surface text-success";
  }
  if (status === "APPLIED" || status === "RESPONDED") {
    return "border-info-border bg-info-surface text-info";
  }
  if (status === "REJECTED" || status === "SKIP") {
    return "border-danger-border bg-danger-surface text-danger";
  }
  if (status === "DISCARDED") {
    return "border-border bg-surface-hover text-muted";
  }
  return "border-warning-border bg-warning-surface text-warning";
}

function progressNote(notes: string) {
  return notes.replace(/\[report-language:\s*[^\]]+\]\s*/gi, "").trim();
}

export function ApplicationProgressDetail({
  app,
  reportAvailable,
  jobUrl,
  canDelete,
}: {
  app: Application;
  reportAvailable: boolean;
  jobUrl?: string;
  canDelete: boolean;
}) {
  const currentStatus = canonStatus(app.status);
  const currentStageIndex = APPLICATION_STAGES.findIndex((stage) => stage.key === currentStatus);
  const nextStep = NEXT_STEP_COPY[currentStatus] ?? {
    title: "确认当前状态",
    description: "核对这条求职记录的真实进度，并选择对应状态。",
  };
  const pdfReady = app.pdf.includes("✅");
  const showApplicationActions = currentStatus === "EVALUATED";
  const showResume = showApplicationActions || pdfReady;
  const showInterviewAction = currentStatus === "RESPONDED" || currentStatus === "INTERVIEW";
  const displayNotes = progressNote(app.notes);
  const companyIdentity = resolveCompanyIdentity(app.company, app.via);

  return (
    <div className="page-shell py-8 max-sm:pb-24">
      <Link
        href="/pipeline"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        求职进度
      </Link>

      <header className="mt-5 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-faint">
            求职进度详情 · #{app.n}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <CompanyLogo name={app.company} size={44} />
            <div className="min-w-0">
              <h1 className="truncate font-display text-3xl tracking-tight text-landing">{companyIdentity.label}</h1>
              <p className="mt-1 truncate text-muted">{app.role}</p>
            </div>
          </div>
        </div>

        {reportAvailable && (
          <Link
            href={`/pipeline/${app.n}?view=report`}
            className={cn(buttonVariants({ variant: "tertiary" }), "shrink-0")}
          >
            <FileText className="size-4 text-icon-muted" aria-hidden="true" />
            查看岗位评估报告
          </Link>
        )}
      </header>

      <section className="mt-8 overflow-hidden rounded-panel border border-border bg-surface/50">
        <div className="flex flex-col justify-between gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-faint">当前进度</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl tracking-tight text-foreground">
                {DETAIL_STATUS_LABEL[currentStatus] ?? app.status}
              </h2>
              <span
                className={cn(
                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                  progressStatusTone(currentStatus),
                )}
              >
                当前状态
              </span>
            </div>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <CalendarDays className="size-4 text-icon-muted" aria-hidden="true" />
            记录于 <span className="tabular-nums">{app.date || "日期未知"}</span>
          </p>
        </div>

        <div className="border-t border-border bg-background/30 px-5 py-5 sm:px-6">
          <h3 className="text-sm font-semibold text-foreground">求职阶段</h3>
          <p className="mt-1 text-xs text-faint">这里只显示阶段路径和当前状态，不虚构尚未记录的历史时间。</p>
          <div className="mt-5 overflow-x-auto pb-1">
            <ol className="grid min-w-[620px] grid-cols-5" aria-label="求职阶段">
              {APPLICATION_STAGES.map((stage, index) => {
                const completed = currentStageIndex >= 0 && index < currentStageIndex;
                const current = currentStageIndex === index;
                return (
                  <li
                    key={stage.key}
                    aria-current={current ? "step" : undefined}
                    className="relative flex flex-col items-center text-center"
                  >
                    {index > 0 && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute right-1/2 top-3.5 h-0.5 w-full",
                          currentStageIndex >= index ? "bg-brand" : "bg-border",
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 flex size-7 items-center justify-center rounded-full border text-xs font-semibold",
                        completed && "border-brand bg-brand text-brand-foreground",
                        current && "border-brand bg-surface text-foreground ring-4 ring-brand/15",
                        !completed && !current && "border-border bg-surface text-faint",
                      )}
                    >
                      {completed ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                    </span>
                    <span className={cn("mt-2 text-xs", current ? "font-semibold text-foreground" : "text-muted")}>
                      {stage.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(19rem,0.9fr)]">
        <Card className="p-0">
          <div className="flex gap-3 p-5 sm:p-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-icon-brand">
              <ListChecks className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-faint">下一步</p>
              <h2 className="mt-2 text-lg font-semibold text-foreground">{nextStep.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{nextStep.description}</p>
              {displayNotes && (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-xs font-medium text-faint">当前记录</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{displayNotes}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-0">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">对应操作</h2>
            <p className="mt-1 text-xs text-faint">操作应与当前真实进度保持一致。</p>
          </div>
          <div className="space-y-4 px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted">更新当前状态</span>
              <StatusSelect
                n={app.n}
                current={app.status}
                showLabel={false}
                ariaLabel={`更新 ${companyIdentity.label} · ${app.role} 的求职状态`}
              />
            </div>

            {(showResume || showApplicationActions) && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <span className="text-sm text-muted">{pdfReady ? "定制简历" : "投递材料"}</span>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {showResume && (
                    <GeneratePdfButton
                      n={app.n}
                      company={companyIdentity.label}
                      pdfReady={pdfReady}
                      reportNumber={app.report.match(/\[(\d+)\]/)?.[1]}
                    />
                  )}
                  {showApplicationActions && (
                    <ApplyButton
                      n={app.n}
                      url={jobUrl}
                      company={companyIdentity.label}
                      pdfReady={pdfReady}
                    />
                  )}
                </div>
              </div>
            )}

            {showInterviewAction && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <span className="text-sm text-muted">面试准备</span>
                <Link href="/interview" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  打开面试故事库
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <span className="text-sm text-muted">相关资料</span>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {reportAvailable && (
                  <Link
                    href={`/pipeline/${app.n}?view=report`}
                    className={buttonVariants({ variant: "tertiary", size: "sm" })}
                  >
                    评估报告
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                )}
                {jobUrl && /^https?:\/\//i.test(jobUrl) && (
                  <a
                    href={jobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: "tertiary", size: "sm" })}
                  >
                    原岗位
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <section className="mt-5 grid gap-3 rounded-card border border-border bg-surface/35 p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs text-faint">评估分数</p>
          <div className="mt-2">{app.score ? <Badge tone={scoreTone(app.score)}>{app.score}</Badge> : <span className="text-sm text-muted">—</span>}</div>
        </div>
        <div>
          <p className="text-xs text-faint">岗位来源</p>
          <p className="mt-2 text-sm text-muted">{app.via || "未记录"}</p>
        </div>
        <div>
          <p className="text-xs text-faint">定制简历</p>
          <p className="mt-2 text-sm text-muted">{pdfReady ? "已生成" : "尚未生成"}</p>
        </div>
      </section>

      {canDelete && (
        <div className="mt-6 border-t border-border pt-5">
          <DeleteFromTracker n={app.n} />
        </div>
      )}
    </div>
  );
}

export function PipelineView({
  applications,
  inbox,
}: {
  applications: Application[];
  inbox: InboxJob[];
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // The URL is the SINGLE source of truth for tab/min/sort/dir, so the home stat
  // tiles' deep links AND the assistant's filterPipeline/navigate actions drive
  // the table identically (no useState mirror → no desync).
  const pTab = (params.get("tab") ?? "").toUpperCase();
  const tab: Tab = (TABS as readonly string[]).includes(pTab) ? (pTab as Tab) : "ALL";
  const pMin = parseFloat(params.get("min") ?? "");
  const minFilter: number | null = Number.isFinite(pMin) ? pMin : null;
  const pSort = params.get("sort") ?? "";
  const sortKey: SortKey = (SORT_KEYS as readonly string[]).includes(pSort) ? (pSort as SortKey) : "date";
  const sort = { key: sortKey, dir: (params.get("dir") === "1" ? 1 : -1) as 1 | -1 };

  // Search stays LOCAL for snappy typing; seeded from the URL and re-synced only
  // when the URL's q changes (i.e. the assistant set it) — never per keystroke.
  const [q, setQ] = useState(params.get("q") ?? "");
  const lastUrlQ = useRef(params.get("q") ?? "");
  useEffect(() => {
    const urlQ = params.get("q") ?? "";
    if (urlQ !== lastUrlQ.current) {
      lastUrlQ.current = urlQ;
      setQ(urlQ);
    }
  }, [params]);

  const setParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v == null || v === "") sp.delete(k);
        else sp.set(k, String(v));
      }
      const qs = sp.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [params, router, pathname],
  );

  // Pending + deduped by URL (pipeline.md can list the same posting twice) so the
  // header count, the tab count and the triage list all agree on one number.
  const pendingInbox = useMemo(() => {
    const seen = new Set<string>();
    const out: InboxJob[] = [];
    for (const j of inbox) {
      if (j.done || seen.has(j.url)) continue;
      seen.add(j.url);
      out.push(j);
    }
    return out;
  }, [inbox]);

  const filtered = useMemo(() => {
    if (tab === "INBOX") return [];
    let rows = applications;
    if (tab !== "ALL") rows = rows.filter((r) => canonStatus(r.status).includes(tab));
    if (minFilter != null) {
      rows = rows.filter((r) => {
        const n = scoreNum(r.score);
        return !Number.isNaN(n) && n >= minFilter;
      });
    }
    if (q.trim()) {
      const needle = q.toLowerCase();
      rows = rows.filter((r) => {
        const companyIdentity = resolveCompanyIdentity(r.company, r.via);
        return `${companyIdentity.label} ${r.company} ${r.role}`.toLowerCase().includes(needle);
      });
    }
    return [...rows].sort((a, b) => {
      if (sort.key === "score") {
        const an = scoreNum(a.score);
        const bn = scoreNum(b.score);
        const av = Number.isNaN(an) ? -Infinity : an;
        const bv = Number.isNaN(bn) ? -Infinity : bn;
        if (av !== bv) return (av - bv) * sort.dir;
      } else {
        const comparison = (a[sort.key] || "").localeCompare(b[sort.key] || "");
        if (comparison !== 0) return comparison * sort.dir;
      }

      // The tracker has day-level dates but no per-row updatedAt. Report
      // numbers are allocated monotonically, so they provide a deterministic
      // newest-first tie-breaker for records created on the same day.
      return a.n.localeCompare(b.n, undefined, { numeric: true }) * sort.dir;
    });
  }, [applications, tab, q, sort, minFilter]);

  return (
    <div className="page-shell py-8 max-sm:pb-24">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <PageIcon className="size-6 shrink-0 text-icon-brand" aria-hidden="true" />
            <h1 className="page-title">求职进度</h1>
          </div>
          <p className="mt-1 w-full pl-9 text-sm text-muted">
            待评估 <span className="tabular-nums">{pendingInbox.length}</span> 个 ·{" "}
            已跟踪 <span className="tabular-nums">{applications.length}</span> 个
          </p>
        </div>
        {/* the tracker has its own search; the inbox brings its own facet filters */}
        {tab !== "INBOX" && (
          <div className="relative w-64 max-w-[40vw]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-icon-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索公司或岗位…"
              className="w-full rounded-md border border-border bg-surface/60 py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-faint focus:border-brand/50"
            />
          </div>
        )}
      </div>

      {/* tabs */}
      <div className="mt-6 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => {
          const count =
            t === "INBOX"
              ? pendingInbox.length
              : t === "ALL"
                ? applications.length
                : applications.filter((r) => canonStatus(r.status).includes(t)).length;
              return (
                <button
                  key={t}
                  data-button-shape="container"
                  onClick={() => setParams({ tab: t === "ALL" ? null : t })}
                  className={cn(
                "-mb-px inline-flex items-center justify-center border-b-2 px-3 py-2 text-xs font-medium transition-colors max-sm:min-h-[44px]",
                tab === t
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {TAB_LABELS[t]} <span className="text-faint tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {tab !== "INBOX" && minFilter != null && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-faint">已筛选：</span>
          <button
            type="button"
            onClick={() => setParams({ min: null })}
            className="inline-flex items-center gap-1.5 rounded-full border border-outline-border bg-outline-bg px-2.5 py-1 text-xs font-medium text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover"
            title="清除评分筛选"
          >
            评分 ≥ {minFilter.toFixed(1)}
            <X className="size-3" />
          </button>
        </div>
      )}

      {tab === "INBOX" ? (
        /* ── Inbox: the triage surface (Abundance → Triage → Shortlist → Score) ── */
        pendingInbox.length > 0 ? (
          <InboxTriage inbox={pendingInbox} />
        ) : (
          <InboxEmpty count={0} filtered={false} />
        )
      ) : filtered.length > 0 ? (
        /* ── Tracker table ── */
        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface/60 text-left text-xs uppercase tracking-wide text-faint">
              <tr>
                {SORT_KEYS.map((k) => (
                  <th
                    key={k}
                    className="cursor-pointer select-none px-4 py-2.5 font-medium hover:text-foreground"
                    onClick={() => setParams({ sort: k, dir: sort.key === k ? sort.dir * -1 : -1 })}
                  >
                    <span className="inline-flex items-center gap-1">
                      {SORT_LABELS[k]}
                      <ChevronsUpDown className="size-3" />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r, i) => {
                const companyIdentity = resolveCompanyIdentity(r.company, r.via);
                return (
                  <tr key={`${r.n}-${i}`} className="group transition-colors hover:bg-surface/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/pipeline/${r.n}`}
                        className="font-semibold leading-5 text-foreground transition-colors group-hover:text-brand"
                      >
                        {r.role}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      <Link href={`/pipeline/${r.n}`} className="flex items-center gap-2.5 whitespace-nowrap transition-colors group-hover:text-brand">
                        <CompanyLogo name={r.company} size={28} />
                        {companyIdentity.label}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={scoreTone(r.score)}>{r.score || "—"}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusSelect
                        n={r.n}
                        current={r.status}
                        showLabel={false}
                        compact
                        ariaLabel={`更新 ${companyIdentity.label} · ${r.role} 的求职状态`}
                      />
                    </td>
                    <td className="px-4 py-3 text-faint tabular-nums">{r.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center">
          <p className="font-display text-lg">没有匹配结果</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">请切换分类或清除搜索条件。</p>
        </div>
      )}
    </div>
  );
}

// Empty inbox. Self-sufficient for the mainstream user (a primary in-web action),
// honest for devs (the CLI/file path stays, demoted to progressive transparency).
function InboxEmpty({ count, filtered }: { count: number; filtered: boolean }) {
  if (filtered) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center">
        <p className="font-display text-lg">没有匹配结果</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">清除搜索条件后查看全部待评估岗位。</p>
      </div>
    );
  }
  return (
    <div className="dot-bg mt-4 overflow-hidden rounded-2xl border border-border bg-surface/50 bg-origin-border bg-gradient-to-tr from-brand/10 via-transparent to-transparent shadow-lg">
      <div className="flex items-center gap-2 border-b border-foreground/10 px-5 py-3">
        <span className="size-2.5 rounded-full bg-foreground/15" aria-hidden="true" />
        <span className="size-2.5 rounded-full bg-foreground/15" aria-hidden="true" />
        <span className="size-2.5 rounded-full bg-foreground/15" aria-hidden="true" />
        <span className="ml-3 text-xs font-medium tracking-normal text-muted">择程AI · 岗位收件箱</span>
      </div>
      <div className="px-6 py-10 text-center">
        <p className="font-display text-lg">
          你的<span className="text-brand">岗位收件箱</span>还是空的。
        </p>
        {count > 0 ? (
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">当前没有待处理岗位。</p>
        ) : (
          <>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">先在招聘网站找到感兴趣的岗位，再带回工作台评估。</p>
            <Link
              href="/cn-diagnose"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground shadow-sm transition-all duration-200 hover:bg-brand-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <ScanSearch className="size-4" /> 去评估岗位 <ArrowRight className="size-4" />
            </Link>
            <p className="mx-auto mt-4 max-w-sm text-xs text-muted">
              在招聘网站找到岗位后，把招聘截图或完整 JD 直接交给你的 Agent 评估。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
