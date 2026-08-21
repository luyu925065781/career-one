import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  BriefcaseBusiness,
  ContactRound,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { ProfileAgentAction } from "@/components/onboarding-banner";
import { CopyTagValuesButton } from "@/components/explore/explorer-view";
import { doctorState, readCareerProfileSnapshot, readStoryBank } from "@/lib/career-one";
import { cn } from "@/lib/cn";
import { PRIMARY_NAV_ITEMS } from "@/lib/nav-items";
import { assessStoryReadiness } from "@/lib/story-bank.mjs";

export const dynamic = "force-dynamic";

const PageIcon = PRIMARY_NAV_ITEMS.profile.icon;
const PENDING_PATTERN = /待填写|待确认|待补充|未填写|未确认|\b(?:todo|tbc)\b/i;

type Dict = Record<string, unknown>;
type ProfileStatus = "confirmed" | "partial" | "pending";
type ProfileRowData = {
  label: string;
  values: string[];
  compact?: boolean;
  copyable?: boolean;
};

function asRecord(value: unknown): Dict {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Dict
    : {};
}

function asValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(asValues);
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text ? [text] : [];
  }
  return [];
}

function rowStatus(values: string[]): ProfileStatus {
  if (values.length === 0 || values.every((value) => PENDING_PATTERN.test(value))) return "pending";
  return values.some((value) => PENDING_PATTERN.test(value)) ? "partial" : "confirmed";
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function stripDocumentTitle(markdown: string): string {
  return markdown.replace(/^#\s+[^\n]+\n+/, "").trim();
}

export default function CareerProfilePage() {
  const { config, strategyMarkdown, sources } = readCareerProfileSnapshot();
  const { missing, profileReady } = doctorState();
  const { stories } = readStoryBank();
  const storyBankComplete = stories.length > 0 && stories.every((story) => assessStoryReadiness(story).ready);
  const candidate = asRecord(config.candidate);
  const targetRoles = asRecord(config.target_roles);
  const narrative = asRecord(config.narrative);
  const compensation = asRecord(config.compensation);
  const location = asRecord(config.location);
  const jobSearch = asRecord(config.job_search);
  const archetypes = Array.isArray(targetRoles.archetypes)
    ? targetRoles.archetypes.map(asRecord)
    : [];

  const roleValues = unique([
    ...asValues(targetRoles.primary),
    ...archetypes.flatMap((item) => asValues(item.name)),
  ]);
  const levelValues = unique(archetypes.flatMap((item) => asValues(item.level)));
  const locationValues = unique([
    ...asValues(candidate.location),
    ...asValues(location.city),
    ...asValues(location.country),
  ]);
  const contactValues = unique([
    ...asValues(candidate.email),
    ...asValues(candidate.phone),
    ...asValues(candidate.wechat).map((value) => `微信：${value}`),
  ]);
  const publicWorkValues = unique([
    ...asValues(candidate.portfolio_url),
    ...asValues(candidate.github),
    ...asValues(candidate.linkedin),
  ]);
  const headline = asValues(narrative.headline).find((value) => !PENDING_PATTERN.test(value));
  const name = asValues(candidate.full_name).find((value) => !PENDING_PATTERN.test(value));

  const sections: Array<{
    title: string;
    description: string;
    icon: typeof BriefcaseBusiness;
    rows: ProfileRowData[];
  }> = [
    {
      title: "目标岗位与职级",
      description: "决定岗位筛选、职级判断和故事优先级。",
      icon: BriefcaseBusiness,
      rows: [
        { label: "目标岗位", values: roleValues, compact: true, copyable: true },
        { label: "目标职级", values: levelValues, compact: true },
        { label: "职业定位", values: asValues(narrative.headline) },
      ],
    },
    {
      title: "地点与工作方式",
      description: "用于判断城市、远程、混合办公和迁居匹配。",
      icon: MapPin,
      rows: [
        { label: "所在地点", values: locationValues, compact: true },
        { label: "办公方式", values: asValues(location.onsite_availability) },
        { label: "地点与迁居策略", values: asValues(compensation.location_flexibility) },
        { label: "时区", values: asValues(location.timezone), compact: true },
      ],
    },
    {
      title: "岗位发现偏好",
      description: "岗位推荐与公开来源扫描统一读取这里，不再依赖单独的渠道配置才能开始。",
      icon: SlidersHorizontal,
      rows: [
        { label: "排除岗位", values: asValues(jobSearch.excluded_titles), compact: true, copyable: true },
        { label: "优先地点", values: asValues(jobSearch.preferred_locations), compact: true, copyable: true },
        { label: "排除地点", values: asValues(jobSearch.excluded_locations), compact: true },
        { label: "始终包含", values: asValues(jobSearch.always_include_locations), compact: true },
      ],
    },
    {
      title: "薪酬边界",
      description: "岗位评估会同时比较目标区间和最低接受值。",
      icon: BadgeDollarSign,
      rows: [
        { label: "目标薪资", values: asValues(compensation.target_range) },
        { label: "最低接受值", values: asValues(compensation.minimum) },
        { label: "币种", values: asValues(compensation.currency), compact: true },
      ],
    },
    {
      title: "核心优势与成果",
      description: "用于简历表达、岗位匹配和面试故事取材。",
      icon: Sparkles,
      rows: [
        { label: "核心优势", values: asValues(narrative.superpowers) },
        { label: "代表成果", values: asValues(narrative.proof_points) },
        { label: "转型叙事", values: asValues(narrative.exit_story) },
        { label: "定位假设", values: asValues(narrative.positioning_hypotheses) },
      ],
    },
    {
      title: "工作偏好与求职红线",
      description: "帮助 Agent 判断一份工作是否长期适合你，而不只看技能匹配。",
      icon: ShieldCheck,
      rows: [
        { label: "动力来源", values: asValues(narrative.motivation) },
        { label: "理想工作方式", values: asValues(narrative.ideal_work_style) },
        { label: "求职红线", values: asValues(narrative.red_lines) },
      ],
    },
    {
      title: "联系方式与公开作品",
      description: "只展示本地画像中已经保存的信息。",
      icon: ContactRound,
      rows: [
        { label: "姓名", values: asValues(candidate.full_name) },
        { label: "联系方式", values: contactValues },
        { label: "公开作品", values: publicWorkValues },
        { label: "公开作品状态", values: asValues(narrative.public_work_status) },
      ],
    },
  ];
  const coreRows = sections.flatMap((section) => section.rows);
  const confirmedCount = coreRows.filter((row) => rowStatus(row.values) === "confirmed").length;
  const strategy = stripDocumentTitle(strategyMarkdown);

  return (
    <div className="page-shell py-8 max-sm:pb-24">
      <header data-ui-page-header>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <PageIcon className="size-6 shrink-0 text-icon-brand" aria-hidden="true" />
            <h1 className="page-title">求职画像</h1>
          </div>
          <p className="mt-1.5 max-w-3xl pl-9 text-sm leading-6 text-muted">
            把岗位方向、职级、地点、薪酬和个人优势放在同一处，作为岗位评估与面试准备的共同依据。
          </p>
        </div>
        <ProfileAgentAction
          missing={missing}
          label={profileReady ? "在 Agent 中更新画像" : "在 Agent 中完善画像"}
          className="min-h-11 px-5"
        />
      </header>

      {profileReady && !storyBankComplete && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand/20 bg-brand-soft/35 px-4 py-3">
          <p className="text-sm text-foreground">求职画像已准备好，可以继续整理面试故事库。</p>
          <Link href="/interview" className={cn("min-h-11", "font-semibold", "text-brand-text", "underline", "underline-offset-4")}>
            继续整理面试故事 <ArrowRight className="inline size-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      <section data-ui-card="solid" className="mt-8 overflow-hidden" aria-labelledby="profile-summary-title">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-text">本地求职画像</p>
            <h2 id="profile-summary-title" className="mt-2 font-display text-2xl text-landing sm:text-3xl">
              {name || "你的求职方向"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
              {headline || roleValues.join(" · ") || "画像中仍有关键内容待确认，可以交给 Agent 一次性补全。"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <span className="rounded-full bg-success-surface px-3 py-1.5 text-xs font-semibold text-success">
              {confirmedCount} / {coreRows.length} 项已确认
            </span>
            <span className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              profileReady ? "bg-brand-soft text-brand-text" : "bg-warning-surface text-warning",
            )}>
              {profileReady ? "画像文件已准备" : "画像文件待完善"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border bg-surface/45 px-5 py-3 text-xs text-faint sm:px-6">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-icon-success" aria-hidden="true" />
            数据保存在当前电脑
          </span>
          <span>更新必须经过 Agent 草稿和你的确认</span>
          <Link href="/portals" className="font-medium text-interactive hover:underline">
            高级岗位来源（可选）
          </Link>
          {sources.config === "invalid" && <span className="font-semibold text-warning">结构化画像格式需要检查</span>}
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <ProfileSection key={section.title} {...section} />
        ))}
      </div>

      <section data-ui-card="solid" className="mt-6 p-5 sm:p-6" aria-labelledby="profile-strategy-title">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-text">策略层</p>
            <h2 id="profile-strategy-title" className="mt-1 text-lg font-semibold text-foreground">个性化求职策略</h2>
            <p className="mt-1 text-xs leading-5 text-muted">展示角色偏好、表达侧重、评分边界和面试角度。</p>
          </div>
          <StatusBadge status={sources.strategy === "ready" && strategy ? "confirmed" : "pending"} />
        </div>
        {strategy ? (
          <article className="report-prose mt-5 max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{strategy}</ReactMarkdown>
          </article>
        ) : (
          <p data-ui-empty-state="panel" className="mt-5 p-5 text-sm">
            个性化策略仍待确认。Agent 会根据你的真实经历和目标岗位生成候选稿。
          </p>
        )}
      </section>

      {!storyBankComplete && (
        <nav className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="求职材料流程">
          <Link href="/cv" data-ui-card="solid" data-card-interactive="true" className="group p-4">
            <span className="flex items-center gap-2 text-xs text-faint"><ArrowLeft className="size-3.5" /> 上一环节</span>
            <span className="mt-1 block text-sm font-semibold text-foreground">我的简历</span>
          </Link>
          <Link href="/interview" data-ui-card="solid" data-card-interactive="true" className="group p-4 text-right">
            <span className="flex items-center justify-end gap-2 text-xs text-faint">下一环节 <ArrowRight className="size-3.5" /></span>
            <span className="mt-1 block text-sm font-semibold text-foreground">面试故事库</span>
          </Link>
        </nav>
      )}
    </div>
  );
}

function ProfileSection({
  title,
  description,
  icon: Icon,
  rows,
}: {
  title: string;
  description: string;
  icon: typeof BriefcaseBusiness;
  rows: ProfileRowData[];
}) {
  return (
    <section data-ui-card="solid" className="p-5 sm:p-6" aria-labelledby={`profile-section-${title}`}>
      <div className="flex items-start gap-3 border-b border-border pb-4">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-icon-brand">
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id={`profile-section-${title}`} className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
        </div>
      </div>
      <dl className="divide-y divide-border">
        {rows.map((row) => <ProfileRow key={row.label} {...row} />)}
      </dl>
    </section>
  );
}

function ProfileRow({ label, values, compact, copyable }: ProfileRowData) {
  const status = rowStatus(values);
  return (
    <div className="grid gap-2 py-4 first:pt-4 last:pb-0 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-start sm:gap-4">
      <dt className="flex items-center justify-between gap-2 text-xs font-semibold text-muted">
        <span>{label}</span>
        {copyable && <CopyTagValuesButton label={label} values={values} />}
      </dt>
      <dd className="min-w-0">
        {values.length === 0 ? (
          <span className="text-sm text-faint">待确认</span>
        ) : compact ? (
          <div className="flex flex-wrap gap-1.5">
            {values.map((value, index) => (
              <span key={`${value}-${index}`} className={cn(
                "rounded-full border px-2.5 py-1 text-xs",
                PENDING_PATTERN.test(value)
                  ? "border-warning-border bg-warning-surface text-warning"
                  : "border-outline-border bg-outline-bg text-outline-text",
              )}>
                {value}
              </span>
            ))}
          </div>
        ) : (
          <ul className="space-y-1.5 text-sm leading-6 text-foreground">
            {values.map((value, index) => (
              <li key={`${value}-${index}`} className="flex gap-2">
                {values.length > 1 && <span className="text-faint" aria-hidden="true">•</span>}
                <span className={PENDING_PATTERN.test(value) ? "text-warning" : undefined}>{value}</span>
              </li>
            ))}
          </ul>
        )}
      </dd>
      <dd className="sm:justify-self-end"><StatusBadge status={status} /></dd>
    </div>
  );
}

function StatusBadge({ status }: { status: ProfileStatus }) {
  const label = status === "confirmed" ? "已确认" : status === "partial" ? "部分待确认" : "待确认";
  return (
    <span className={cn(
      "inline-flex shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold",
      status === "confirmed"
        ? "border-success-border bg-success-surface text-success"
        : "border-warning-border bg-warning-surface text-warning",
    )}>
      {label}
    </span>
  );
}
