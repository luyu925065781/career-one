"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CircleHelp, Sparkles, ArrowRight, BarChart3 } from "lucide-react";
import { HeroGlow } from "@/components/hero-glow";
import type { Application, InboxJob } from "@/lib/career-one";
import type { DiscoveredOffer } from "@/lib/explore";
import { DiscoveryCard } from "@/components/explore/discovery-card";
import { FollowUpCard, type FollowUp } from "@/components/home/follow-up-card";
import { DecisionCard } from "@/components/home/decision-card";
import { QuickEvaluate } from "@/components/quick-evaluate";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { canonStatus, scoreNum } from "@/lib/format";
import { PRIMARY_NAV_ITEMS } from "@/lib/nav-items";

type BarTone = "brand" | "info" | "infoSoft" | "success" | "warning" | "danger" | "dangerSoft";
type StatTone = "brand" | "info" | "success" | "warning" | "danger";
const PageIcon = PRIMARY_NAV_ITEMS.home.icon;

const BAR_TONE_CLASSES: Record<BarTone, string> = {
  brand: "bg-brand-200/80",
  info: "bg-icon-info/80",
  infoSoft: "bg-icon-info/50",
  success: "bg-icon-success/80",
  warning: "bg-icon-warning/80",
  danger: "bg-icon-danger/80",
  dangerSoft: "bg-icon-danger/50",
};

const STAT_TONE_CLASSES: Record<StatTone, { card: string; value: string }> = {
  brand: { card: "border-brand/30 bg-brand-soft/40", value: "text-metric-brand" },
  info: { card: "border-icon-info/25 bg-icon-info/[0.06]", value: "text-metric-info" },
  success: { card: "border-icon-success/25 bg-icon-success/[0.06]", value: "text-metric-success" },
  warning: { card: "border-icon-warning/25 bg-icon-warning/[0.06]", value: "text-metric-warning" },
  danger: { card: "border-icon-danger/25 bg-icon-danger/[0.06]", value: "text-metric-danger" },
};

const STAGES: { key: string; label: string; tone: BarTone }[] = [
  { key: "EVALUATED", label: "已评估", tone: "brand" },
  { key: "APPLIED", label: "已投递", tone: "info" },
  { key: "RESPONDED", label: "已回复", tone: "infoSoft" },
  { key: "INTERVIEW", label: "面试中", tone: "warning" },
  { key: "OFFER", label: "已获 Offer", tone: "success" },
  { key: "REJECTED", label: "被拒", tone: "danger" },
  { key: "DISCARDED", label: "已放弃", tone: "dangerSoft" },
];

function summarizeApplications(applications: Application[]) {
  const total = applications.length;
  const stageCounts = STAGES.map((stage) => ({
    ...stage,
    n: applications.filter((application) => canonStatus(application.status).includes(stage.key)).length,
  }));
  const maxStage = Math.max(1, ...stageCounts.map((stage) => stage.n));

  const scores = applications
    .map((application) => scoreNum(application.score))
    .filter((score) => !Number.isNaN(score));
  const average = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 0;
  const scoreBuckets = ([
    { label: "4.5 – 5.0", tone: "success", test: (score: number) => score >= 4.5 },
    { label: "4.0 – 4.4", tone: "brand", test: (score: number) => score >= 4 && score < 4.5 },
    { label: "3.0 – 3.9", tone: "warning", test: (score: number) => score >= 3 && score < 4 },
    { label: "< 3.0", tone: "danger", test: (score: number) => score < 3 },
  ] satisfies { label: string; tone: BarTone; test: (score: number) => boolean }[]).map((bucket) => ({
    label: bucket.label,
    tone: bucket.tone,
    n: scores.filter(bucket.test).length,
  }));
  const maxScoreBucket = Math.max(1, ...scoreBuckets.map((bucket) => bucket.n));

  const companyCounts = new Map<string, number>();
  for (const application of applications) {
    if (application.company) {
      companyCounts.set(application.company, (companyCounts.get(application.company) ?? 0) + 1);
    }
  }
  const topCompanies = [...companyCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const maxCompany = Math.max(1, ...topCompanies.map(([, count]) => count));

  const interviews = stageCounts.find((stage) => stage.key === "INTERVIEW")?.n ?? 0;
  const offers = stageCounts.find((stage) => stage.key === "OFFER")?.n ?? 0;
  const averageTone: StatTone = !average
    ? "brand"
    : average >= 4
      ? "success"
      : average >= 3
        ? "warning"
        : "danger";

  return {
    total,
    stageCounts,
    maxStage,
    scores,
    average,
    scoreBuckets,
    maxScoreBucket,
    topCompanies,
    maxCompany,
    interviews,
    offers,
    averageTone,
  };
}

// The retention "Today": a dual-loop action queue (the maintainer's
// "N new matches this week · M follow-ups due"). SUPPLY loop = fresh free-scan
// matches (zero tokens); DEMAND loop = follow-ups due. Both are part of the
// server-rendered snapshot, so the hero and its sections cannot disagree during
// hydration. Every action still dispatches a real registry action / route.
export function TodayDashboard({
  applications,
  inbox,
  inBetween,
  initialFollowups,
  initialFollowupCount,
  initialFresh,
}: {
  applications: Application[];
  inbox: InboxJob[];
  inBetween: boolean;
  initialFollowups: FollowUp[];
  initialFollowupCount: number;
  initialFresh: DiscoveredOffer[];
}) {
  const [followups, setFollowups] = useState<FollowUp[]>(initialFollowups);
  const [followupCount, setFollowupCount] = useState(initialFollowupCount);
  const router = useRouter();
  const dateLabel = useMemo(() => new Date().toLocaleDateString("zh-CN", { weekday: "long", month: "short", day: "numeric" }), []);
  const analytics = useMemo(() => summarizeApplications(applications), [applications]);

  useEffect(() => {
    setFollowups(initialFollowups);
    setFollowupCount(initialFollowupCount);
  }, [initialFollowups, initialFollowupCount]);

  useEffect(() => {
    // A worker (evaluate/pdf) just wrote a real tracker row — refresh the server
    // snapshot so every queue advances together without a second client source.
    const onDone = () => router.refresh();
    window.addEventListener("co-job-done", onDone);
    return () => window.removeEventListener("co-job-done", onDone);
  }, [router]);

  // Awaiting decision: scored (Evaluated) but no terminal status yet.
  const awaiting = useMemo(
    () => applications.filter((a) => /^evaluat/i.test(a.status)).slice(0, 6),
    [applications],
  );

  const newThisWeek = initialFresh.length;
  const hasLoopActions = newThisWeek > 0 || followupCount > 0;
  const allClear = !hasLoopActions && awaiting.length === 0;
  const inboxUrls = useMemo(() => new Set(inbox.map((j) => j.url)), [inbox]);

  return (
    <div className="page-shell py-10 max-sm:pb-24">
      <div data-dashboard-stats className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat value={analytics.total} label="已评估" tone="brand" />
        <Stat
          value={analytics.average ? analytics.average.toFixed(2) : "—"}
          label="平均分"
          tone={analytics.averageTone}
        />
        <Stat
          value={analytics.interviews}
          label="面试"
          tone="info"
          hint={analytics.interviews === 0 ? "持续跟进，推动回复转化为面试" : undefined}
        />
        <Stat
          value={analytics.offers}
          label="Offer"
          tone="success"
          hint={analytics.offers === 0 ? "保持面试沟通，持续推动流程" : undefined}
        />
      </div>

      <section className="dot-bg relative mt-6 overflow-hidden rounded-2xl border border-border bg-surface/40 px-7 py-10 md:px-10 md:py-12">
        <HeroGlow />
        <div className="relative z-10">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
            <PageIcon className="size-3.5 shrink-0 text-icon-brand" aria-hidden="true" />
            <span>看板 · <span className="tabular-nums">{dateLabel}</span></span>
          </p>
          <h1 className={`font-display mt-3 text-4xl leading-[1.05] text-landing md:text-5xl`}>
            {allClear ? (
              <>今日待办已清空。</>
            ) : (
              <>
                {newThisWeek > 0 && (
                  <>
                    本周新增 <span className="text-metric-brand tabular-nums">{newThisWeek}</span> 个匹配岗位
                  </>
                )}
                {newThisWeek > 0 && followupCount > 0 && <span className="text-faint"> · </span>}
                {followupCount > 0 && (
                  <>
                    <span className="text-metric-brand tabular-nums">{followupCount}</span> 个跟进待处理
                  </>
                )}
                {!hasLoopActions && <>今日待办</>}
              </>
            )}
          </h1>
          <p className="mt-4 w-full text-sm text-muted">
            {allClear ? "择程AI会继续整理市场机会，并在出现合适岗位时提醒你。" : "今天需要处理的岗位发现、投递决策和跟进都在这里。"}
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href="/portals" className={cn(buttonVariants({ variant: "primary" }), "rounded-full px-5 py-2.5")}>
              发现新岗位 <ArrowRight className="size-4" />
            </Link>
            <Link href="/pipeline" className={cn(buttonVariants({ variant: "secondary" }), "rounded-full px-5 py-2.5")}>
              求职进度
            </Link>
          </div>
          {inBetween && <QuickEvaluate />}
        </div>
      </section>

      {/* A. Follow-ups due (demand loop) */}
      {followups.length > 0 && (
        <Section icon={Bell} title="待跟进" hint="及时跟进，让投递保持活跃">
          <div className="grid gap-2.5">
            {followups.map((f) => (
              <FollowUpCard key={`${f.num}-${f.company}`} followup={f} onLogged={() => setFollowupCount((n) => Math.max(0, n - 1))} />
            ))}
          </div>
        </Section>
      )}

      {/* B. Awaiting your decision */}
      {awaiting.length > 0 && (
        <Section icon={CircleHelp} title="等待你的决定" hint="已完成评分，请决定投递或放弃">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {awaiting.map((a) => (
              <DecisionCard key={a.n} app={a} />
            ))}
          </div>
        </Section>
      )}

      {/* C. Fresh matches this week (supply loop) */}
      {initialFresh.length > 0 && (
        <Section icon={Sparkles} title="本周新匹配" hint="算法扫描发现，不消耗模型额度">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {initialFresh.slice(0, 6).map((o) => (
              <DiscoveryCard key={o.url} offer={o} inPipeline={inboxUrls.has(o.url)} />
            ))}
          </div>
          {initialFresh.length > 6 && (
            <Link href="/explore" className="mt-3 inline-flex items-center text-sm text-muted transition hover:text-brand max-sm:min-h-[44px]">
              查看全部 {initialFresh.length} 个岗位 →
            </Link>
          )}
        </Section>
      )}

      {allClear && (
        <div className="mt-8 rounded-2xl border border-border bg-surface/30 px-6 py-10 text-center">
          <Sparkles className="mx-auto size-6 text-icon-brand" />
          <p className="mx-auto mt-3 max-w-md text-sm text-muted">
            当前没有待处理事项。你可以运行一次<Link href="/explore" className="text-brand hover:underline">算法扫描</Link>，或查看<Link href="/pipeline" className="text-brand hover:underline">求职进度</Link>。
          </p>
        </div>
      )}

      <section className="mt-10" aria-labelledby="dashboard-insights-title">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="size-4 text-icon-brand" />
          <h2 id="dashboard-insights-title" className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
            数据洞察
          </h2>
          <span className="text-xs text-faint">· 共跟踪 {analytics.total} 次岗位评估</span>
        </div>

        <div data-dashboard-charts className="grid gap-4 lg:grid-cols-2">
          <AnalyticsSection title="求职漏斗阶段">
            {analytics.stageCounts.map((stage) => (
              <Bar
                key={stage.key}
                label={stage.label}
                value={stage.n}
                pct={(stage.n / analytics.maxStage) * 100}
                total={analytics.total}
                tone={stage.tone}
              />
            ))}
          </AnalyticsSection>

          <AnalyticsSection title="评分分布">
            {analytics.scoreBuckets.map((bucket) => (
              <Bar
                key={bucket.label}
                label={bucket.label}
                value={bucket.n}
                pct={(bucket.n / analytics.maxScoreBucket) * 100}
                total={analytics.scores.length}
                tone={bucket.tone}
              />
            ))}
          </AnalyticsSection>

          <AnalyticsSection title="重点公司" id="companies">
            {analytics.topCompanies.length > 0 ? (
              analytics.topCompanies.map(([name, count]) => (
                <Bar
                  key={name}
                  label={name}
                  value={count}
                  pct={(count / analytics.maxCompany) * 100}
                  tone="brand"
                />
              ))
            ) : (
              <p className="text-xs text-faint">暂无公司数据</p>
            )}
          </AnalyticsSection>
        </div>
      </section>
    </div>
  );
}

function Section({ icon: Icon, title, hint, children }: { icon: React.ComponentType<{ className?: string }>; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-icon-brand" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">{title}</h2>
        <span className="text-xs text-faint">· {hint}</span>
      </div>
      {children}
    </section>
  );
}

function Stat({
  value,
  label,
  tone,
  hint,
}: {
  value: number | string;
  label: string;
  tone: StatTone;
  hint?: string;
}) {
  const colors = STAT_TONE_CLASSES[tone];

  return (
    <div className={cn("min-h-28 rounded-card border p-4", colors.card)}>
      <span aria-hidden className={cn("mb-3 block h-1 w-8 rounded-full", BAR_TONE_CLASSES[tone])} />
      <div className={cn("text-3xl font-semibold tabular-nums", colors.value)}>{value}</div>
      <div className="mt-1 text-xs text-faint">{label}</div>
      {hint && <p className="mt-2 text-xs leading-5 text-muted">{hint} →</p>}
    </div>
  );
}

function AnalyticsSection({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <Card compact id={id} className="h-full scroll-mt-8">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{title}</h3>
      <div className="mt-4 space-y-2">{children}</div>
    </Card>
  );
}

function Bar({
  label,
  value,
  pct,
  total,
  tone,
}: {
  label: string;
  value: number;
  pct: number;
  total?: number;
  tone: BarTone;
}) {
  const share = total && total > 0 ? Math.round((value / total) * 100) : null;

  return (
    <div
      className="flex items-center gap-2"
      data-analytics-bar={label}
      data-tone={tone}
      aria-label={`${label}：${value}${share === null ? "" : `，占 ${share}%`}`}
    >
      <div className="w-20 shrink-0 truncate text-xs text-muted sm:w-24" title={label}>{label}</div>
      <div aria-hidden className="relative h-2 flex-1 overflow-hidden rounded-control bg-surface-hover/70 ring-1 ring-inset ring-border/70">
        <div
          className={cn("h-full rounded-control", BAR_TONE_CLASSES[tone])}
          style={{ width: `${Math.max(pct, value > 0 ? 5 : 0)}%` }}
        />
      </div>
      <div className="w-14 shrink-0 text-right text-xs tabular-nums">
        {value}
        {share !== null && <span className="ml-1 text-faint">{share}%</span>}
      </div>
    </div>
  );
}
