"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Compass, ChevronDown, RotateCcw, AlertTriangle, Sparkles, Settings, Save, Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Application, InboxJob } from "@/lib/career-one";
import { paramsToFilters, paramsToAi, type ExploreFilters } from "@/lib/explore";
import { FilterBuilder } from "./filter-builder";
import { DiscoveringState } from "./discovering-state";
import { AiHuntView } from "./ai-hunt-view";
import { ExploreModeToggle } from "./explore-mode-toggle";
import { AiSearchBox } from "./ai-search-box";
import { ResultsList, type EnrichedOffer } from "./results-list";
import { useExplore } from "./explore-provider";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const CLI_NAMES: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
  workbuddy: "WorkBuddy",
  trae: "TRAE Agent CLI",
  gemini: "Gemini CLI",
  opencode: "OpenCode",
  copilot: "Copilot CLI",
  qwen: "Qwen CLI",
  antigravity: "Antigravity CLI",
};

export function ExplorerView({
  seed,
  inboxSnapshot,
  appsSnapshot,
  rootExists,
}: {
  seed: { filters: ExploreFilters; seededFrom: string[] };
  inboxSnapshot: InboxJob[];
  appsSnapshot: Application[];
  rootExists: boolean;
}) {
  const { filters, setFilters, initFilters, phase, running, offers, discover, status, error, mode, setMode, aiIntent, setAiIntent, discoverAI, companiesScanned, companiesAvailable, capHit, droppedNoDate, partial } = useExplore();
  const scanNote =
    companiesScanned > 0
      ? `已扫描 ${companiesScanned.toLocaleString()}${companiesAvailable > companiesScanned ? ` / ${companiesAvailable.toLocaleString()}` : ""} 家公司${partial ? " · 部分来源无法访问" : ""}。`
      : undefined;
  const inited = useRef(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [cli, setCli] = useState<{ id: string | null; name?: string }>({ id: null });
  const [firstRun, setFirstRun] = useState(false);

  useEffect(() => {
    try {
      const id = JSON.parse(localStorage.getItem("career-one:config") || "{}").cliId || null;
      setCli({ id, name: id ? CLI_NAMES[id] || id : undefined });
    } catch {
      setCli({ id: null });
    }
  }, []);

  // Initialize once from the URL (shareable search) or the server seed — without
  // clobbering anything the assistant set before this mount.
  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    const sp = new URLSearchParams(window.location.search);
    const ai = paramsToAi(sp);
    if (ai !== null) {
      setMode("ai");
      setAiIntent(ai);
    } else {
      initFilters(sp.toString() ? paramsToFilters(sp) : seed.filters);
      // Onboarding hand-off: ?run=1 auto-fires the free scan + flags the first-run
      // banner (the "matches found from your CV, free" reveal).
      if (sp.get("run") === "1") {
        setFirstRun(true);
        void discover();
      }
    }
  }, [seed.filters, initFilters, setMode, setAiIntent, discover]);

  const inboxUrls = useMemo(() => new Set(inboxSnapshot.map((j) => j.url)), [inboxSnapshot]);
  const enriched: EnrichedOffer[] = useMemo(
    () =>
      offers.map((o) => {
        const inPipeline = inboxUrls.has(o.url);
        const c = norm(o.company);
        const t = norm(o.title);
        const ev = appsSnapshot.find((a) => {
          if (norm(a.company) !== c) return false;
          const ar = norm(a.role);
          return ar.length > 3 && (t.includes(ar) || ar.includes(t.split(" ").slice(0, 3).join(" ")));
        });
        return { ...o, inPipeline, evaluatedN: ev?.n };
      }),
    [offers, inboxUrls, appsSnapshot],
  );

  const isAi = mode === "ai";
  if (running) return isAi ? <AiHuntView cliName={cli.name} /> : <DiscoveringState />;

  const canDiscover = filters.ats.length > 0;
  const isResults = phase === "results";

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <Compass className="size-6 text-icon-brand" />
            <h1 className={`font-display text-3xl text-foreground`}>发现岗位</h1>
            <span className="rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-text">新</span>
          </div>
          <div className="w-full sm:ml-auto sm:w-auto">
            <ExploreModeToggle mode={mode} onChange={setMode} cliConfigured={!!cli.id} />
          </div>
        </div>
        {!isResults && (
          <p className="mt-3 w-full text-[15px] leading-relaxed text-muted">
            {isAi
              ? "用自然语言描述目标岗位，择程AI会调用你自己的 Agent 搜索公开信息。搜索结果需要进一步评估后才能确认匹配度。"
              : "算法已根据你的简历智能生成岗位标签，以提高搜索效率。您可以复制标签，去招聘平台搜索。"}
          </p>
        )}
      </header>

      {!rootExists && (
        <div className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          择程AI尚未完成初始化。请先完善简历和目标岗位，再开始发现职位。
        </div>
      )}

      {isAi ? (
        phase === "blocked" ? (
          <BlockedCard />
        ) : (
          <div className="space-y-6">
            <AiSearchBox
              intent={aiIntent}
              onIntent={setAiIntent}
              onSubmit={() => void discoverAI()}
              cliConfigured={!!cli.id}
              cliName={cli.name}
              onRunScan={() => setMode("scan")}
            />
            {phase === "results" && <ResultsList offers={enriched} />}
            {phase === "empty-loose" && (
              <EmptyState
                tone="loose"
                title="暂未找到公开匹配岗位"
                body="AI 搜索基于公开信息。可以扩大目标范围，或改用目标公司官网扫描。"
                onRerun={() => setMode("scan")}
                rerunLabel="运行算法扫描"
              />
            )}
            {phase === "failed" && <FailedCard msg={error || status} onRetry={() => void discoverAI()} />}
          </div>
        )
      ) : (
        <>
          {isResults ? (
            <div className="mb-6 rounded-xl border border-border bg-surface/30">
              <button type="button" onClick={() => setRefineOpen((v) => !v)} className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-foreground">
                <Compass className="size-4 text-icon-brand" /> 调整搜索条件
                <ChevronDown className={cn("ml-auto size-4 text-icon-muted transition-transform", refineOpen && "rotate-180")} />
              </button>
              {refineOpen && (
                <div className="space-y-4 border-t border-border p-4">
                  <FilterBuilder filters={filters} onChange={setFilters} seededFrom={seed.seededFrom} />
                  <DiscoverBar canDiscover={canDiscover} onDiscover={discover} label="重新扫描（免费）" />
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 rounded-2xl border border-border bg-surface/30 p-5">
              <FilterBuilder filters={filters} onChange={setFilters} seededFrom={seed.seededFrom} />
              <div className="mt-5">
                <SaveSettingsBar filters={filters} />
              </div>
            </div>
          )}

          {isResults && firstRun && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-icon-success" />
              <p className="text-[13px] leading-relaxed text-foreground">
                这些是与简历匹配的在招岗位。<span className="text-emerald-600 dark:text-emerald-400">发现过程没有消耗 tokens。</span>选择最感兴趣的岗位进行评估，即可查看匹配度和原因。
              </p>
            </div>
          )}

          {isResults && capHit && (
            <CappedBanner companiesScanned={companiesScanned} companiesAvailable={companiesAvailable} onRefine={() => setRefineOpen(true)} />
          )}
          {isResults && <ResultsList offers={enriched} />}

          {phase === "empty-current" && (
            <EmptyState
              tone="good"
              title="已查看全部新岗位"
              body="自上次扫描后没有新增结果，当前求职进度已是最新状态。"
              note={scanNote}
              onRerun={() => {
                setFilters({ ...filters, sinceDays: Math.max(filters.sinceDays, 30) });
                void discover();
              }}
              rerunLabel="查看最近 30 天"
            />
          )}
          {phase === "empty-loose" && (
            <EmptyState
              tone="loose"
              title="暂未发现新匹配"
              body="发现岗位免费，可以放宽条件并重新扫描。"
              note={scanNote}
              onRerun={() => {
                setFilters({ ...filters, sinceDays: 30, block: [], allow: [] });
                void discover();
              }}
              rerunLabel="扩大到 30 天 · 清除地区限制"
            />
          )}
          {phase === "degraded" && (
            <DegradedCard
              onRetry={() => void discover()}
              companiesScanned={companiesScanned}
              companiesAvailable={companiesAvailable}
              capHit={capHit}
              droppedNoDate={droppedNoDate}
              partial={partial}
            />
          )}
          {phase === "failed" && <FailedCard msg={error || status} onRetry={() => void discover()} />}
        </>
      )}
    </div>
  );
}

function DiscoverBar({ canDiscover, onDiscover, label }: { canDiscover: boolean; onDiscover: () => void; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={!canDiscover}
        onClick={onDiscover}
        className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition-all hover:bg-brand-200 disabled:opacity-50 max-sm:min-h-[44px]"
      >
        <Compass className="size-4" /> {label}
      </button>
      <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        发现岗位免费，只有后续评估会消耗 tokens。
      </span>
    </div>
  );
}

function SaveSettingsBar({ filters }: { filters: ExploreFilters }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  const save = async () => {
    if (state === "saving" || filters.positive.length === 0) return;
    setState("saving");
    try {
      const response = await fetch("/api/portals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-rules",
          rules: {
            positive: filters.positive,
            negative: filters.negative,
            allow: filters.allow,
            block: filters.block,
            alwaysAllow: filters.alwaysAllow,
          },
        }),
      });
      if (!response.ok) throw new Error("save failed");
      setState("saved");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 1800);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={filters.positive.length === 0 || state === "saving"}
        onClick={() => void save()}
        className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition-all hover:bg-brand-200 disabled:opacity-50 max-sm:min-h-[44px]"
      >
        {state === "saved" ? <Check className="size-4" /> : <Save className="size-4" />}
        {state === "saving" ? "保存中…" : state === "saved" ? "已保存" : "保存设置"}
      </button>
      <span className={cn("text-[12px]", state === "failed" ? "text-red-600 dark:text-red-400" : "text-muted")}>
        {state === "failed" ? "保存失败，请稍后重试。" : "如需改变求职方向，可以让你的Agent修改，自动更新信息"}
      </span>
    </div>
  );
}

function EmptyState({ tone, title, body, note, onRerun, rerunLabel }: { tone: "good" | "loose"; title: string; body: string; note?: string; onRerun: () => void; rerunLabel: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/30 px-6 py-12 text-center">
      <div className={cn("mx-auto grid size-12 place-items-center rounded-full", tone === "good" ? "bg-emerald-500/12 text-emerald-500" : "bg-brand-soft text-brand")}>
        <Sparkles className="size-6" />
      </div>
      <h2 className={`font-display mt-4 text-2xl text-foreground`}>{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">{body}</p>
      {note && <p className="mx-auto mt-1 max-w-md text-[12px] text-faint">{note}</p>}
      <button onClick={onRerun} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-outline-border bg-outline-bg px-3.5 py-2 text-sm font-medium text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover">
        <RotateCcw className="size-4" /> {rerunLabel}
      </button>
    </div>
  );
}

function DegradedCard({
  onRetry,
  companiesScanned,
  companiesAvailable,
  capHit,
  droppedNoDate,
  partial,
}: {
  onRetry: () => void;
  companiesScanned: number;
  companiesAvailable: number;
  capHit: boolean;
  droppedNoDate: number;
  partial: boolean;
}) {
  let title = "尚未配置可扫描的目标公司官网。";
  let body = "请先在“岗位来源”中为目标公司添加公开招聘网址；需要登录或授权的来源不会参与扫描。";
  if (companiesScanned > 0 && capHit) {
    title = "当前扫描范围内没有匹配结果。";
    body = `本次检查了 ${companiesScanned.toLocaleString()}${companiesAvailable > companiesScanned ? ` / ${companiesAvailable.toLocaleString()}` : ""} 家目标公司。`;
  } else if (companiesScanned > 0 && droppedNoDate > 0) {
    title = "部分岗位缺少发布日期。";
    body = `${droppedNoDate.toLocaleString()} 个岗位没有明确发布日期。`;
  } else if (companiesScanned > 0 && partial) {
    title = "部分公司官网无法访问。";
    body = `已检查 ${companiesScanned.toLocaleString()} 家公司，但部分公开招聘页没有响应，因此当前结果不完整。`;
  }
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
      <AlertTriangle className="mx-auto size-6 text-icon-warning" />
      <p className="mt-2 text-sm font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[13px] text-muted">{body}</p>
      <button onClick={onRetry} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand">
        <RotateCcw className="size-4" /> 重新扫描
      </button>
    </div>
  );
}

function CappedBanner({ companiesScanned, companiesAvailable, onRefine }: { companiesScanned: number; companiesAvailable: number; onRefine: () => void }) {
  // Results ARE present, but the scan was capped — tell the user there's more, so a
  // partial list never reads as "everything there is".
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-2.5 text-[13px]">
      <span className="text-foreground">
        当前仅展示受限范围：已扫描 {companiesScanned.toLocaleString()}
        {companiesAvailable > companiesScanned ? ` / ${companiesAvailable.toLocaleString()}` : ""} 家公司。
      </span>
      <button onClick={onRefine} className="font-medium text-brand hover:underline">
        提高扫描深度
      </button>
    </div>
  );
}

function FailedCard({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  // The scanner-missing 400 (data-only / pre-scan-ats-full checkout) must NOT
  // offer a "Try again" that re-fails forever — give a real next step instead.
  const scannerMissing = /isn'?t available|data only|complete career-(?:one|ops) checkout|scanner|扫描器不可用/i.test(msg);
  if (scannerMissing) {
    return (
      <div className="rounded-2xl border border-border bg-surface/30 px-6 py-10 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
          <Compass className="size-6" />
        </div>
        <h2 className={`font-display mt-4 text-2xl text-foreground`}>岗位发现需要完整工作区</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
          当前择程AI工作区可能只有数据文件，或版本较旧。请先更新完整工具，或者直接在求职进度中粘贴岗位链接进行评估。
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/pipeline" className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-brand-foreground transition hover:brightness-110">
            打开求职进度
          </Link>
          <Link href="/config" className="inline-flex items-center gap-1.5 rounded-lg border border-outline-border bg-outline-bg px-3.5 py-2 text-sm font-medium text-outline-text transition hover:border-outline-border-hover hover:bg-outline-bg-hover">
            打开设置
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
      <AlertTriangle className="mx-auto size-6 text-icon-warning" />
      <p className="mt-2 text-sm font-medium text-foreground">未能完成搜索。</p>
      <p className="mt-1 text-[13px] text-muted">{msg}</p>
      <button onClick={onRetry} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand">
        <RotateCcw className="size-4" /> 重试
      </button>
    </div>
  );
}

function BlockedCard() {
  return (
    <div className="rounded-2xl border border-border bg-surface/30 px-6 py-12 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
        <Sparkles className="size-6" />
      </div>
      <h2 className={`font-display mt-4 text-2xl text-foreground`}>AI 搜索需要 Agent CLI</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
        请连接 Codex、Claude Code、OpenCode 等 Agent CLI。没有 CLI 时仍可使用算法扫描。
      </p>
      <Link href="/config" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-brand-foreground transition hover:brightness-110">
        <Settings className="size-4" /> 打开设置
      </Link>
    </div>
  );
}
