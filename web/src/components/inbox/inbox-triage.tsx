"use client";

import { useEffect, useMemo, useState } from "react";
import { Undo2 } from "lucide-react";
import { useJobs } from "@/components/jobs/job-store";
import type { InboxJob } from "@/lib/career-one";
import type { AtsSource } from "@/lib/explore";
import { ATS_SOURCES } from "@/lib/explore";
import { daysSince, seniorityFromTitle, sourceFromUrl, SENIORITY_ORDER, type Seniority } from "@/lib/inbox";
import { FacetChips } from "./facet-chips";
import { TriageRow, type RowScore } from "./triage-row";
import { ShortlistTray, type ShortItem } from "./shortlist-tray";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const SHORTLIST_KEY = "career-one:shortlist";
const HIDDEN_KEY = "career-one:hidden";
const CONFIG_KEY = "career-one:config";
const BATCH = 20;

// The inbox as a TRIAGE surface: Abundance → Triage → Shortlist → Opt-in Score.
// Default is a small fresh batch (never the full wall); free facets + Save/Skip narrow
// it; only "Score shortlist" spends tokens. 🔴 The shell is agnostic to what makes a
// role relevant — order is freshness with a single documented plug point.
export function InboxTriage({ inbox }: { inbox: InboxJob[] }) {
  const { jobs, startJob } = useJobs();

  // facets
  const [within, setWithin] = useState<number | null>(null);
  const [sources, setSources] = useState<Set<AtsSource>>(() => new Set());
  const [seniorities, setSeniorities] = useState<Set<Seniority>>(() => new Set());
  const [locQ, setLocQ] = useState("");
  const [kw, setKw] = useState("");
  const [showAll, setShowAll] = useState(false);

  // persisted triage state + ephemeral selection/undo
  const [shortlist, setShortlist] = useState<ShortItem[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [undo, setUndo] = useState<{ label: string; fn: () => void } | null>(null);
  const [hasCli, setHasCli] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(SHORTLIST_KEY);
      if (s) setShortlist(JSON.parse(s));
      const h = localStorage.getItem(HIDDEN_KEY);
      if (h) setHidden(JSON.parse(h));
      const c = localStorage.getItem(CONFIG_KEY);
      setHasCli(!!(c && JSON.parse(c).cliId));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) try { localStorage.setItem(SHORTLIST_KEY, JSON.stringify(shortlist)); } catch { /* quota */ }
  }, [shortlist, loaded]);
  useEffect(() => {
    if (loaded) try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden)); } catch { /* quota */ }
  }, [hidden, loaded]);
  // auto-dismiss the undo toast
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(t);
  }, [undo]);

  // stable "now" for freshness (per mount)
  const now = useMemo(() => Date.now(), []);

  // Dedupe by URL — pipeline.md can list the same posting twice; it's one job, so it
  // triages once (and Save/Skip/score, all keyed by URL, act on it coherently).
  const enriched = useMemo(() => {
    const seen = new Set<string>();
    const out: { job: InboxJob; source: AtsSource | null; seniority: Seniority | null; age: number | null }[] = [];
    for (const job of inbox) {
      if (seen.has(job.url)) continue;
      seen.add(job.url);
      out.push({ job, source: sourceFromUrl(job.url), seniority: seniorityFromTitle(job.role), age: daysSince(job.postedAt, now) });
    }
    return out;
  }, [inbox, now]);

  // EVALUADA lookup: the latest evaluate worker per posting URL (running → badge).
  const scoreByUrl = useMemo(() => {
    const best = new Map<string, (typeof jobs)[number]>();
    for (const j of jobs) {
      if (!j.input || j.kind !== "evaluate") continue;
      const ex = best.get(j.input);
      if (!ex || j.startedAt > ex.startedAt) best.set(j.input, j);
    }
    const m = new Map<string, RowScore>();
    for (const [url, j] of best) {
      m.set(url, { score: j.result?.score ?? null, tone: j.result?.tone ?? "muted", jobId: j.id, running: j.status === "running" });
    }
    return m;
  }, [jobs]);

  // facet options — only surface what's actually present in the (non-hidden) data
  const availSources = useMemo(() => {
    const set = new Set<AtsSource>();
    for (const e of enriched) if (e.source && !hidden.includes(e.job.url)) set.add(e.source);
    return ATS_SOURCES.filter((s) => set.has(s));
  }, [enriched, hidden]);
  const availSeniorities = useMemo(() => {
    const set = new Set<Seniority>();
    for (const e of enriched) if (e.seniority && !hidden.includes(e.job.url)) set.add(e.seniority);
    return SENIORITY_ORDER.filter((s) => set.has(s));
  }, [enriched, hidden]);

  const filtered = useMemo(
    () =>
      enriched.filter((e) => {
        if (hidden.includes(e.job.url)) return false;
        if (within != null && (e.age == null || e.age > within)) return false;
        if (sources.size && (!e.source || !sources.has(e.source))) return false;
        if (seniorities.size && (!e.seniority || !seniorities.has(e.seniority))) return false;
        if (locQ.trim() && !(e.job.location || "").toLowerCase().includes(locQ.trim().toLowerCase())) return false;
        if (kw.trim() && !`${e.job.company} ${e.job.role}`.toLowerCase().includes(kw.trim().toLowerCase())) return false;
        return true;
      }),
    [enriched, hidden, within, sources, seniorities, locQ, kw],
  );

  // 🔴 SINGLE ORDER PLUG POINT — freshness only (newest first_seen first; unknown last).
  // A smarter ranker replaces ONLY this comparator; facets/triage/shortlist/score never
  // touch relevance. This is the whole firewall in one line.
  const ordered = useMemo(() => [...filtered].sort((a, b) => (a.age ?? Infinity) - (b.age ?? Infinity)), [filtered]);

  const anyFacet = within != null || sources.size > 0 || seniorities.size > 0 || locQ.trim() !== "" || kw.trim() !== "";
  const capped = !showAll && !anyFacet;
  const visible = capped ? ordered.slice(0, BATCH) : ordered;
  const hiddenCount = hidden.length;

  const isShortlisted = (url: string) => shortlist.some((s) => s.url === url);

  const save = (job: InboxJob) => {
    if (isShortlisted(job.url)) return;
    setShortlist((s) => [...s, { url: job.url, company: job.company, role: job.role }]);
  };
  const skip = (job: InboxJob) => {
    setHidden((h) => (h.includes(job.url) ? h : [...h, job.url]));
    setUndo({ label: `已跳过 ${job.company}`, fn: () => setHidden((h) => h.filter((u) => u !== job.url)) });
  };
  const toggleSelect = (url: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(url)) n.delete(url);
      else n.add(url);
      return n;
    });
  const saveSelected = () => {
    const add = enriched
      .filter((e) => selected.has(e.job.url) && !isShortlisted(e.job.url))
      .map((e) => ({ url: e.job.url, company: e.job.company, role: e.job.role }));
    if (add.length) setShortlist((s) => [...s, ...add]);
    setSelected(new Set());
  };

  const estimate = useMemo(() => {
    const samples = jobs.filter((j) => j.kind === "evaluate" && j.status === "done" && j.cost?.tokens).map((j) => j.cost!);
    if (!samples.length || shortlist.length === 0) return {};
    const avgT = samples.reduce((a, c) => a + c.tokens, 0) / samples.length;
    const usds = samples.filter((s) => s.usd != null).map((s) => s.usd!);
    const avgUsd = usds.length ? usds.reduce((a, c) => a + c, 0) / usds.length : undefined;
    return { tokens: Math.round(avgT * shortlist.length), usd: avgUsd != null ? +(avgUsd * shortlist.length).toFixed(2) : undefined };
  }, [jobs, shortlist.length]);

  const scoreShortlist = () => {
    const batchId = `shortlist-${Date.now()}`;
    for (const it of shortlist) {
      startJob({ title: `评分 · ${it.company}`, subtitle: it.role, kind: "evaluate", input: it.url, page: "/pipeline", batchId });
    }
    setShortlist([]); // sent — the rows flip to Scoring… → badge via scoreByUrl
  };

  // The parent (PipelineView) renders the rich empty-inbox card; here we always
  // have ≥1 raw posting.
  if (inbox.length === 0) return null;

  return (
    <div className={cn("mx-auto mt-4 max-w-3xl", shortlist.length > 0 && "pb-28 sm:pb-24")}>
      <FacetChips
        within={within}
        setWithin={setWithin}
        sources={sources}
        toggleSource={(s) => setSources((set) => { const n = new Set(set); n.has(s) ? n.delete(s) : n.add(s); return n; })}
        seniorities={seniorities}
        toggleSeniority={(s) => setSeniorities((set) => { const n = new Set(set); n.has(s) ? n.delete(s) : n.add(s); return n; })}
        locQ={locQ}
        setLocQ={setLocQ}
        kw={kw}
        setKw={setKw}
        availSources={availSources}
        availSeniorities={availSeniorities}
        resultCount={filtered.length}
        totalCount={enriched.length - hiddenCount}
        anyActive={anyFacet}
        onClear={() => { setWithin(null); setSources(new Set()); setSeniorities(new Set()); setLocQ(""); setKw(""); }}
      />

      {/* batch header: fresh slice by default, or the full filtered set */}
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          {capped ? "最新岗位 · 值得看看" : anyFacet ? `${filtered.length} 个匹配结果` : "全部岗位"}
        </p>
        {hiddenCount > 0 && (
          <Button type="button" onClick={() => setHidden([])} variant="ghost" size="sm" className="text-faint">
            已隐藏 {hiddenCount} 个 · 恢复
          </Button>
        )}
      </div>

      {/* multi-select action bar */}
      {selected.size > 0 && (
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-brand/30 bg-brand-soft px-3 py-2 text-sm">
          <span className="font-medium text-brand tabular-nums">已选择 {selected.size} 个</span>
          <Button type="button" onClick={saveSelected} size="sm" className="px-2.5">
            保存到候选清单
          </Button>
          <Button type="button" onClick={() => setSelected(new Set())} variant="ghost" size="sm">
            清除
          </Button>
        </div>
      )}

      {visible.length > 0 ? (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/40">
          {visible.map((e) => (
            <TriageRow
              key={e.job.url}
              job={e.job}
              source={e.source}
              age={e.age}
              scored={scoreByUrl.get(e.job.url)}
              selected={selected.has(e.job.url)}
              shortlisted={isShortlisted(e.job.url)}
              onToggleSelect={() => toggleSelect(e.job.url)}
              onSave={() => save(e.job)}
              onSkip={() => skip(e.job)}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-border bg-surface/30 px-6 py-10 text-center">
          <p className="font-display text-lg">没有匹配结果</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">请放宽筛选条件，查看更多待处理岗位。</p>
        </div>
      )}

      {/* "See all N" — only when the fresh batch is capping a larger list */}
      {capped && ordered.length > BATCH && (
        <Button
          type="button"
          onClick={() => setShowAll(true)}
          variant="tertiary"
          size="lg"
          className="mt-3 w-full"
        >
          查看收件箱中的全部 {ordered.length} 个岗位 →
        </Button>
      )}

      {/* empty-shortlist guidance (only once there's nothing saved) */}
      {shortlist.length === 0 && (
        <p className="mt-4 text-center text-xs text-faint">先保存值得关注的岗位，再批量评分，只调用一次 Agent。</p>
      )}

      {/* undo toast (sits above the tray) */}
      {undo && (
        <div className={cn("fixed inset-x-0 z-40 flex justify-center px-4", shortlist.length > 0 ? "bottom-24 sm:bottom-24" : "bottom-6")}>
          <div className="inline-flex items-center gap-3 rounded-full border border-border bg-surface px-4 py-2 text-sm shadow-lg">
            <span className="text-muted">{undo.label}</span>
            <Button type="button" onClick={() => { undo.fn(); setUndo(null); }} variant="ghost" size="sm" className="gap-1 text-interactive-hover">
              <Undo2 className="size-3.5" /> 撤销
            </Button>
          </div>
        </div>
      )}

      <ShortlistTray
        items={shortlist}
        estimate={estimate}
        hasCli={hasCli}
        onRemove={(url) => setShortlist((s) => s.filter((x) => x.url !== url))}
        onClear={() => setShortlist([])}
        onScore={scoreShortlist}
      />
    </div>
  );
}
