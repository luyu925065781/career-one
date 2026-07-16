"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronsUpDown, X, Compass, ArrowRight } from "lucide-react";
import type { Application, InboxJob } from "@/lib/career-one";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/company-logo";
import { StatusSelect } from "@/components/status-select";
import { canonStatus, scoreNum, scoreTone } from "@/lib/format";
import { InboxTriage } from "@/components/inbox/inbox-triage";
import { cn } from "@/lib/cn";

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

const SORT_KEYS = ["company", "role", "score", "status", "date"] as const;
type SortKey = (typeof SORT_KEYS)[number];

const SORT_LABELS: Record<SortKey, string> = {
  company: "公司",
  role: "岗位",
  score: "评分",
  status: "状态",
  date: "日期",
};

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
      rows = rows.filter((r) => `${r.company} ${r.role}`.toLowerCase().includes(needle));
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
    <div className="mx-auto max-w-6xl px-6 py-8 max-sm:pb-24">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl tracking-tight text-landing">求职进度</h1>
          <p className="mt-1 w-full text-sm text-muted">
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
              {filtered.map((r, i) => (
                <tr key={`${r.n}-${i}`} className="group transition-colors hover:bg-surface/40">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/pipeline/${r.n}`} className="flex items-center gap-2.5 transition-colors group-hover:text-brand">
                      <CompanyLogo name={r.company} size={20} />
                      {r.company}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    <Link href={`/pipeline/${r.n}`}>{r.role}</Link>
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
                      ariaLabel={`更新 ${r.company} · ${r.role} 的求职状态`}
                    />
                  </td>
                  <td className="px-4 py-3 text-faint tabular-nums">{r.date}</td>
                </tr>
              ))}
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
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">免费发现与简历匹配的岗位，不消耗 tokens。</p>
            <Link
              href="/explore?run=1"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground shadow-sm transition-all duration-200 hover:bg-brand-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <Compass className="size-4" /> 开始第一次算法扫描 <ArrowRight className="size-4" />
            </Link>
            <p className="mx-auto mt-4 max-w-sm text-xs text-muted">
              也可以在终端运行 <code className="rounded bg-surface-hover px-1 py-0.5 font-mono">career-one scan</code>，或把岗位链接加入{" "}
              <code className="rounded bg-surface-hover px-1 py-0.5 font-mono">data/pipeline.md</code>。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
