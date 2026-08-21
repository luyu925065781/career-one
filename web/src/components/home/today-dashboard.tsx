"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CircleCheck, CircleHelp, Sparkles, ArrowRight, BarChart3 } from "lucide-react";
import { HeroGlow } from "@/components/hero-glow";
import type { Application, InboxJob } from "@/lib/career-one";
import type { DiscoveredOffer } from "@/lib/explore";
import { DiscoveryCard } from "@/components/explore/discovery-card";
import { FollowUpCard, type FollowUp } from "@/components/home/follow-up-card";
import { DecisionCard } from "@/components/home/decision-card";
import { ProfileSetupChecklist } from "@/components/onboarding-banner";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { canonStatus, scoreNum } from "@/lib/format";
import { PRIMARY_NAV_ITEMS } from "@/lib/nav-items";

type ChartTone = "yellow" | "orange" | "red" | "green" | "blue" | "purple" | "neutral";
type StatTone = "brand" | "info" | "success" | "warning" | "danger";
const PageIcon = PRIMARY_NAV_ITEMS.home.icon;

const CHART_TONE_CLASSES: Record<ChartTone, string> = {
  yellow: "bg-accent-yellow",
  orange: "bg-accent-orange",
  red: "bg-accent-red",
  green: "bg-accent-green",
  blue: "bg-accent-blue",
  purple: "bg-accent-purple",
  neutral: "bg-faint",
};

const STAT_TONE_CLASSES: Record<StatTone, { card: string; value: string }> = {
  brand: { card: "border-brand/30 bg-brand-soft", value: "text-metric-brand" },
  info: { card: "border-info-border bg-info-surface", value: "text-metric-info" },
  success: { card: "border-success-border bg-success-surface", value: "text-metric-success" },
  warning: { card: "border-warning-border bg-warning-surface", value: "text-metric-warning" },
  danger: { card: "border-danger-border bg-danger-surface", value: "text-metric-danger" },
};

const STAGES: { key: string; label: string; tone: ChartTone }[] = [
  { key: "EVALUATED", label: "已评估", tone: "yellow" },
  { key: "APPLIED", label: "已投递", tone: "blue" },
  { key: "RESPONDED", label: "已回复", tone: "purple" },
  { key: "INTERVIEW", label: "面试中", tone: "orange" },
  { key: "OFFER", label: "已获 Offer", tone: "green" },
  { key: "REJECTED", label: "被拒", tone: "red" },
  { key: "DISCARDED", label: "已放弃", tone: "neutral" },
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
    { label: "4.5 – 5.0", tone: "green", test: (score: number) => score >= 4.5 },
    { label: "4.0 – 4.4", tone: "yellow", test: (score: number) => score >= 4 && score < 4.5 },
    { label: "3.0 – 3.9", tone: "orange", test: (score: number) => score >= 3 && score < 4 },
    { label: "< 3.0", tone: "red", test: (score: number) => score < 3 },
  ] satisfies { label: string; tone: ChartTone; test: (score: number) => boolean }[]).map((bucket) => ({
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

function averageScoreHint(average: number) {
  if (!average) return "完成首个评估，查看整体岗位匹配度";
  if (average >= 4) return "整体匹配良好，优先推进高分岗位";
  if (average >= 3) return "详尽的岗位分析，提升入职成功率";
  return "收紧目标范围，优先排除低匹配岗位";
}

// The retention "Today": a dual-loop action queue (the maintainer's
// "N new matches this week · M follow-ups due"). SUPPLY loop = fresh free-scan
// matches (zero tokens); DEMAND loop = follow-ups due. Both are part of the
// server-rendered snapshot, so the hero and its sections cannot disagree during
// hydration. Every action still dispatches a real registry action / route.
export function TodayDashboard({
  applications,
  inbox,
  hasCv,
  storyCount,
  setupMissing,
  initialFollowups,
  initialFollowupCount,
  initialFresh,
}: {
  applications: Application[];
  inbox: InboxJob[];
  hasCv: boolean;
  storyCount: number;
  setupMissing: string[];
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
  const profileSetupMissing = setupMissing.filter((file) =>
    ["config/profile.yml", "modes/_profile.md"].includes(file),
  );
  const guideSteps = [
    {
      title: "智能编辑简历",
      description: "让 AI 基于真实经历打磨表达",
      href: "/cv",
      icon: PRIMARY_NAV_ITEMS.cv.icon,
      complete: hasCv,
    },
    {
      title: "完善求职画像",
      description: "确认岗位、地点、薪资与边界，并复制筛选标签",
      href: "/profile",
      icon: PRIMARY_NAV_ITEMS.profile.icon,
      complete: profileSetupMissing.length === 0,
    },
    {
      title: "整理面试故事库",
      description: storyCount === 0
        ? "先整理 1 个可复用的 STAR+R 故事"
        : `已整理 ${storyCount} 个故事，可边评估岗位边继续完善`,
      href: "/interview",
      icon: PRIMARY_NAV_ITEMS.interviewStories.icon,
      complete: storyCount > 0,
    },
  ];
  const guideComplete = guideSteps.every((step) => step.complete);
  const nextGuideStep = guideSteps.find((step) => !step.complete);
  const profileSetupNeeded = nextGuideStep?.href === "/profile" && profileSetupMissing.length > 0;
  const onboardingFocus = Boolean(nextGuideStep && allClear);

  return (
    <div className="page-shell py-10 max-sm:pb-24">
      <div data-dashboard-stats className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          value={analytics.total}
          label="已评估"
          tone="brand"
          hint={analytics.total === 0
            ? "完成首个评估，建立岗位对比基线"
            : "助你理解自己的优势，明确职业方向"}
        />
        <Stat
          value={analytics.average ? analytics.average.toFixed(2) : "—"}
          label="平均分"
          tone={analytics.averageTone}
          hint={averageScoreHint(analytics.average)}
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

      <div
        data-dashboard-primary-grid
        className="mt-6 grid gap-4"
      >
        <section className="dot-bg relative h-full overflow-hidden rounded-2xl bg-surface/40 px-7 py-10 md:px-10 md:py-12">
          <HeroGlow />
          <div className="relative z-10">
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
              <PageIcon className="size-3.5 shrink-0 text-icon-brand" aria-hidden="true" />
              <span>看板 · <span className="tabular-nums">{dateLabel}</span></span>
            </p>
            <h1 className={`font-display mt-3 text-4xl leading-[1.05] text-landing md:text-5xl`}>
              {onboardingFocus && nextGuideStep ? (
                <>
                  下一步：<span className="text-metric-brand">{nextGuideStep.title}</span>
                </>
              ) : allClear ? (
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
              {onboardingFocus && profileSetupNeeded
                ? "简历已准备好；先一次确认求职画像，再按目标整理面试故事。"
                : onboardingFocus && nextGuideStep
                ? `${nextGuideStep.description}。这是当前建议动作，您也可以直接进入其他环节。`
                : allClear
                  ? "找到岗位后，把链接带回工作台，Agent 会帮你判断是否值得投递。"
                  : "今天需要处理的岗位评估、投递决策和跟进都在这里。"}
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {onboardingFocus && profileSetupNeeded ? (
                <Link href="/profile" className={cn(buttonVariants({ variant: "primary" }), "px-5 py-2.5")}>
                  完善求职画像 <ArrowRight className="size-4" />
                </Link>
              ) : onboardingFocus && nextGuideStep ? (
                <Link href={nextGuideStep.href} className={cn(buttonVariants({ variant: "primary" }), "px-5 py-2.5")}>
                  {nextGuideStep.title} <ArrowRight className="size-4" />
                </Link>
              ) : (
                <>
                  <Link href="/cn-diagnose" className={cn(buttonVariants({ variant: "primary" }), "px-5 py-2.5")}>
                    岗位评估 <ArrowRight className="size-4" />
                  </Link>
                  <Link href="/pipeline" className={cn(buttonVariants({ variant: "secondary" }), "px-5 py-2.5")}>
                    求职进度
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {!guideComplete && (
          <GettingStartedCard
            steps={guideSteps}
            complete={guideComplete}
            setupMissing={profileSetupMissing}
          >
            {profileSetupNeeded && <ProfileSetupChecklist missing={profileSetupMissing} />}
          </GettingStartedCard>
        )}
      </div>

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
        <Section icon={Sparkles} title="本周新匹配" hint="来自你的岗位收件箱">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {initialFresh.slice(0, 6).map((o) => (
              <DiscoveryCard key={o.url} offer={o} inPipeline={inboxUrls.has(o.url)} />
            ))}
          </div>
          {initialFresh.length > 6 && (
            <Link href="/pipeline?tab=INBOX" className="mt-3 inline-flex items-center text-sm text-muted transition hover:text-interactive-hover max-sm:min-h-[44px]">
              查看全部 {initialFresh.length} 个岗位 →
            </Link>
          )}
        </Section>
      )}

      {allClear && !nextGuideStep && (
        <div className="mt-8 rounded-2xl border border-border bg-surface/30 px-6 py-10 text-center">
          <Sparkles className="mx-auto size-6 text-icon-brand" />
          <p className="mx-auto mt-3 max-w-md text-sm text-muted">
            当前没有待处理事项。你可以<Link href="/cn-diagnose" className="text-brand hover:underline">评估一个岗位</Link>，或查看<Link href="/pipeline" className="text-brand hover:underline">求职进度</Link>。
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
                  tone="blue"
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

type GuideStep = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  complete: boolean;
};

function GettingStartedCard({
  steps,
  complete,
  setupMissing,
  children,
}: {
  steps: GuideStep[];
  complete: boolean;
  setupMissing: string[];
  children?: React.ReactNode;
}) {
  const currentIndex = steps.findIndex((step) => !step.complete);
  const completedCount = steps.filter((step) => step.complete).length;

  return (
    <Card
      data-dashboard-onboarding-card
      role="region"
      aria-labelledby="getting-started-title"
      className="w-full p-0"
    >
      <div className="px-5 py-5 md:px-7 md:py-6">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-text">新用户教程</p>
            <h2 id="getting-started-title" className="font-display mt-1 text-2xl text-landing">
              {complete ? "求职建档已完成" : "完成三步求职建档"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {complete
                ? "简历、画像和故事库已建立，可以直接评估岗位。"
                : "依次建立简历、画像和故事库；已有完整 JD 时也可以提前评估。"}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold tabular-nums text-brand-text">
            {completedCount} / {steps.length}
          </span>
        </div>
      </div>

      <ol
        aria-label="新用户求职流程"
        className="grid gap-y-2 border-t border-border px-5 py-2 md:px-7 md:py-7 lg:grid-cols-3 lg:gap-x-2 lg:gap-y-0"
      >
        {steps.map((step, index) => {
          const current = index === currentIndex;
          const needsSetup = current && step.href === "/profile" && setupMissing.length > 0;
          const StepIcon = step.icon;
          const status = step.complete ? "已完成" : current ? "当前建议" : "可随时开始";
          return (
            <li key={step.href} className="relative min-w-0">
              <Link
                href={step.href}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "group grid min-h-24 grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 rounded-card py-4 pr-3 transition-colors duration-150 hover:bg-surface-hover/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:block lg:min-h-36 lg:px-3 lg:py-3",
                  current && "bg-brand-soft/55",
                )}
              >
                <div className="relative flex h-full justify-center lg:h-auto lg:items-center lg:justify-start">
                  <span
                    className={cn(
                      "relative z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums",
                      step.complete
                        ? "border-success-border bg-success-surface text-success"
                        : current
                          ? "border-brand/35 bg-brand text-brand-foreground"
                          : "border-border bg-surface text-faint",
                    )}
                  >
                    {step.complete ? (
                      <CircleCheck className="size-4.5" aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  {index < steps.length - 1 && (
                    <span
                      data-step-connector
                      aria-hidden="true"
                      className={cn(
                        "absolute bottom-[-1rem] left-1/2 top-10 w-0.5 -translate-x-1/2 rounded-full lg:static lg:ml-3 lg:h-0.5 lg:flex-1 lg:translate-x-0",
                        step.complete ? "bg-success-solid" : "bg-border",
                      )}
                    />
                  )}
                </div>

                <div className="min-w-0 pb-3 lg:mt-4 lg:pb-0">
                  <p
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-[0.14em]",
                      step.complete ? "text-success" : current ? "text-brand-text" : "text-faint",
                    )}
                  >
                    {status}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <StepIcon
                      className={cn(
                        "size-4 shrink-0",
                        current ? "text-icon-brand" : step.complete ? "text-icon-success" : "text-icon-muted",
                      )}
                      aria-hidden={true}
                    />
                    <h3 className="truncate text-[15px] font-semibold text-foreground">{step.title}</h3>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-muted lg:min-h-10 lg:pr-2">{step.description}</p>
                  <span
                    className={cn(
                      "mt-2 inline-flex min-h-11 items-center gap-1 text-xs font-semibold",
                      current ? "text-brand-text" : step.complete ? "text-success" : "text-faint",
                    )}
                  >
                    {step.complete ? "复盘" : needsSetup ? "先准备" : current ? "开始" : "预览"}
                    <ArrowRight
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
      {children && <div className="border-t border-border px-5 py-5 md:px-7 md:py-6">{children}</div>}
    </Card>
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
      <span aria-hidden className={cn("mb-3 block h-1 w-8 rounded-full", colors.value, "bg-current")} />
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
  tone: ChartTone;
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
          className={cn("h-full rounded-control", CHART_TONE_CLASSES[tone])}
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
