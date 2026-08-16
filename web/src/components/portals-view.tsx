"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  Radar,
  Save,
  SlidersHorizontal,
  Trash2,
  Wrench,
} from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { useJobs, type Job } from "@/components/jobs/job-store";
import { cn } from "@/lib/cn";

type TabId = "platforms" | "companies" | "rules";
type Platform = {
  id: string;
  name: string;
  url: string;
  description: string;
  access: string;
  enabled: boolean;
};
type Company = {
  name: string;
  industry: string;
  careersUrl: string;
  provider: string;
  scanMethod: string;
  scanQuery: string;
  enabled: boolean;
};
type Recommendation = {
  name: string;
  industry: string;
  reason: string;
  scanQuery: string;
};
type SearchQuery = { name: string; query: string; enabled: boolean };
type Rules = {
  positive: string[];
  negative: string[];
  allow: string[];
  block: string[];
  alwaysAllow: string[];
  queries: SearchQuery[];
  contentFilterGroups: number;
  automatedBoards: { name: string; provider: string; enabled: boolean }[];
};
type PortalData = {
  configured: boolean;
  platforms: Platform[];
  companies: Company[];
  recommendations: Recommendation[];
  rules: Rules;
};
type HealthCompany = { name: string; status: string; detail: string };
type HealthResult = { available: boolean; configured: boolean; companies: HealthCompany[] };
type RuleText = { positive: string; negative: string; allow: string; block: string; alwaysAllow: string };

const TABS = [
  { id: "platforms" as const, label: "招聘平台", icon: BriefcaseBusiness },
  { id: "companies" as const, label: "目标公司", icon: Building2 },
  { id: "rules" as const, label: "搜索规则", icon: SlidersHorizontal },
];

const EMPTY_RULE_TEXT: RuleText = { positive: "", negative: "", allow: "", block: "", alwaysAllow: "" };

function listText(values: string[]): string {
  return values.join("\n");
}

function parseList(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(/[,，;；\n\t\r]+/)
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 48);
}

export function PortalsView() {
  const [tab, setTab] = useState<TabId>("platforms");
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState("");
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [ruleText, setRuleText] = useState<RuleText>(EMPTY_RULE_TEXT);
  const [queries, setQueries] = useState<SearchQuery[]>([]);
  const { jobs, startJob } = useJobs();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/portals", { cache: "no-store" });
      const payload = (await response.json()) as PortalData & { error?: string };
      if (!response.ok) throw new Error(payload.error || "无法读取岗位来源配置");
      setData(payload);
      setRuleText({
        positive: listText(payload.rules.positive),
        negative: listText(payload.rules.negative),
        allow: listText(payload.rules.allow),
        block: listText(payload.rules.block),
        alwaysAllow: listText(payload.rules.alwaysAllow),
      });
      setQueries(payload.rules.queries);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "无法读取岗位来源配置");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const mutate = async (key: string, body: Record<string, unknown>, success: string): Promise<boolean> => {
    setSaving(key);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/portals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "保存失败");
      await load();
      setNotice(success);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败");
      return false;
    } finally {
      setSaving("");
    }
  };

  const healthByCompany = useMemo(
    () => new Map((health?.companies ?? []).map((company) => [company.name.toLowerCase(), company])),
    [health],
  );

  const fixByCompany = useMemo(() => {
    const map = new Map<string, (typeof jobs)[number]>();
    for (const job of jobs) {
      if (job.kind !== "fix-portal" || !job.input) continue;
      const existing = map.get(job.input);
      if (!existing || job.startedAt > existing.startedAt) map.set(job.input, job);
    }
    return map;
  }, [jobs]);

  const checkHealth = async () => {
    setHealthLoading(true);
    try {
      const response = await fetch("/api/portals/verify", { cache: "no-store" });
      setHealth((await response.json()) as HealthResult);
    } catch {
      setHealth({ available: false, configured: false, companies: [] });
    } finally {
      setHealthLoading(false);
    }
  };

  if (loading && !data) {
    return <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" /> 正在读取本地配置…</div>;
  }

  if (!data) {
    return <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error || "岗位来源配置不可用"}</div>;
  }

  const savePlatforms = () => mutate(
    "platforms",
    { action: "save-platforms", platforms: data.platforms.map(({ id, enabled }) => ({ id, enabled })) },
    "招聘平台设置已保存到本机",
  );

  const addCompany = async (company: Recommendation | null = null) => {
    const target = company ?? {
      name: companyName,
      industry: companyIndustry || "用户自定义",
      reason: "",
      scanQuery: "",
    };
    const ok = await mutate(
      `add:${target.name}`,
      {
        action: "add-company",
        company: {
          name: target.name,
          industry: target.industry,
          careersUrl: company ? "" : companyUrl,
          scanQuery: target.scanQuery,
        },
      },
      `已添加目标公司：${target.name}`,
    );
    if (ok && !company) {
      setCompanyName("");
      setCompanyIndustry("");
      setCompanyUrl("");
    }
  };

  const saveRules = () => mutate(
    "rules",
    {
      action: "save-rules",
      rules: {
        positive: parseList(ruleText.positive),
        negative: parseList(ruleText.negative),
        allow: parseList(ruleText.allow),
        block: parseList(ruleText.block),
        alwaysAllow: parseList(ruleText.alwaysAllow),
        queries,
      },
    },
    "搜索规则已保存，后续扫描将使用新规则",
  );

  return (
    <div>
      <div role="tablist" aria-label="岗位来源分类" className="grid grid-cols-3 border-b border-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "relative flex min-h-12 items-center justify-center gap-2 px-3 text-sm font-medium transition-colors",
              tab === id ? "text-brand" : "text-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
            {tab === id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand" />}
          </button>
        ))}
      </div>

      {(notice || error) && (
        <div className={cn("mt-4 flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm", error ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400")}>
          {error ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
          {error || notice}
        </div>
      )}

      <div className="mt-6">
        {tab === "platforms" && (
          <PlatformPanel
            platforms={data.platforms}
            saving={saving === "platforms"}
            onToggle={(id) => setData((current) => current ? { ...current, platforms: current.platforms.map((platform) => platform.id === id ? { ...platform, enabled: !platform.enabled } : platform) } : current)}
            onSave={() => void savePlatforms()}
          />
        )}

        {tab === "companies" && (
          <CompanyPanel
            companies={data.companies}
            recommendations={data.recommendations}
            health={health}
            healthByCompany={healthByCompany}
            healthLoading={healthLoading}
            saving={saving}
            fixByCompany={fixByCompany}
            onHealth={() => void checkHealth()}
            onAdd={(company) => void addCompany(company)}
            onToggle={(company) => void mutate(`toggle:${company.name}`, { action: "toggle-company", name: company.name, enabled: !company.enabled }, `${company.name} 已${company.enabled ? "暂停" : "启用"}`)}
            onRemove={(company) => void mutate(`remove:${company.name}`, { action: "remove-company", name: company.name }, `已移除目标公司：${company.name}`)}
            onFix={(company) => startJob({ title: `修复 · ${company}`, subtitle: "修复公司招聘源", kind: "fix-portal", input: company, page: "/portals" })}
            companyName={companyName}
            companyIndustry={companyIndustry}
            companyUrl={companyUrl}
            onCompanyName={setCompanyName}
            onCompanyIndustry={setCompanyIndustry}
            onCompanyUrl={setCompanyUrl}
            onAddCustom={() => void addCompany()}
          />
        )}

        {tab === "rules" && (
          <RulesPanel
            ruleText={ruleText}
            onRuleText={setRuleText}
            queries={queries}
            onQueries={setQueries}
            meta={data.rules}
            saving={saving === "rules"}
            onSave={() => void saveRules()}
          />
        )}
      </div>
    </div>
  );
}

function PlatformPanel({ platforms, saving, onToggle, onSave }: { platforms: Platform[]; saving: boolean; onToggle: (id: string) => void; onSave: () => void }) {
  const enabled = platforms.filter((platform) => platform.enabled).length;
  return (
    <section aria-labelledby="platforms-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="platforms-title" className="text-lg font-semibold text-foreground">中国大陆招聘平台</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">这些是求职入口，不代表平台提供稳定公开 API。择程AI会保留搜索条件和岗位链接，登录、沟通与最终投递仍由你完成。</p>
        </div>
        <span className="text-xs text-faint">已启用 {enabled}/{platforms.length}</span>
      </div>

      <div className="mt-5 divide-y divide-border border-y border-border">
        {platforms.map((platform) => (
          <div key={platform.id} className="flex items-center gap-3 py-4">
            <CompanyLogo name={platform.name} size={22} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{platform.name}</span>
                <span className="rounded bg-surface-hover px-1.5 py-0.5 text-[10px] text-muted">{platform.access}</span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{platform.description}</p>
            </div>
            <a href={platform.url} target="_blank" rel="noreferrer" aria-label={`打开${platform.name}`} title={`打开${platform.name}`} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-button text-muted transition-colors hover:bg-surface-hover hover:text-brand">
              <ExternalLink className="size-4" />
            </a>
            <Toggle checked={platform.enabled} label={`${platform.name}${platform.enabled ? "已启用" : "已停用"}`} onClick={() => onToggle(platform.id)} />
          </div>
        ))}
      </div>

      <button type="button" onClick={onSave} disabled={saving} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:brightness-110 disabled:opacity-50">
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} 保存平台设置
      </button>
    </section>
  );
}

function CompanyPanel({
  companies,
  recommendations,
  health,
  healthByCompany,
  healthLoading,
  saving,
  fixByCompany,
  onHealth,
  onAdd,
  onToggle,
  onRemove,
  onFix,
  companyName,
  companyIndustry,
  companyUrl,
  onCompanyName,
  onCompanyIndustry,
  onCompanyUrl,
  onAddCustom,
}: {
  companies: Company[];
  recommendations: Recommendation[];
  health: HealthResult | null;
  healthByCompany: Map<string, HealthCompany>;
  healthLoading: boolean;
  saving: string;
  fixByCompany: Map<string, Job>;
  onHealth: () => void;
  onAdd: (company: Recommendation) => void;
  onToggle: (company: Company) => void;
  onRemove: (company: Company) => void;
  onFix: (company: string) => void;
  companyName: string;
  companyIndustry: string;
  companyUrl: string;
  onCompanyName: (value: string) => void;
  onCompanyIndustry: (value: string) => void;
  onCompanyUrl: (value: string) => void;
  onAddCustom: () => void;
}) {
  return (
    <section aria-labelledby="companies-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="companies-title" className="text-lg font-semibold text-foreground">我的目标公司</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">根据目标岗位优先推荐中国 AI Native、企业 AI 与协作软件公司。列表保存在本机，可随时启停、添加或移除。</p>
        </div>
        <button type="button" onClick={onHealth} disabled={healthLoading} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-outline-border bg-outline-bg px-3 py-2 text-sm text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover disabled:opacity-50">
          {healthLoading ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />} 检查招聘官网
        </button>
      </div>

      {health && !health.available && <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">当前工作区缺少招聘官网检查脚本，Agent 搜索模式仍可使用。</p>}

      <div className="mt-5 divide-y divide-border border-y border-border">
        {companies.length === 0 && <p className="py-8 text-center text-sm text-muted">还没有目标公司，可以从下方推荐中添加。</p>}
        {companies.map((company) => {
          const state = healthByCompany.get(company.name.toLowerCase());
          return (
            <div key={company.name} className="flex items-center gap-3 py-3.5">
              <CompanyLogo name={company.name} size={22} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{company.name}</span>
                  <CompanyStatus company={company} health={state} />
                </div>
                <p className="mt-0.5 truncate text-xs text-muted">{company.industry}{company.careersUrl ? ` · ${company.careersUrl}` : " · 根据公开信息搜索"}</p>
              </div>
              {state?.status === "broken" && company.scanMethod !== "websearch" && <FixAffordance company={company.name} job={fixByCompany.get(company.name)} onFix={() => onFix(company.name)} />}
              <Toggle checked={company.enabled} label={`${company.name}${company.enabled ? "已启用" : "已停用"}`} onClick={() => onToggle(company)} disabled={saving === `toggle:${company.name}`} />
              <button type="button" onClick={() => onRemove(company)} disabled={saving === `remove:${company.name}`} aria-label={`移除${company.name}`} title={`移除${company.name}`} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-faint transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50">
                {saving === `remove:${company.name}` ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">根据目标岗位推荐</h3>
          <span className="text-xs text-faint">由本地画像和搜索关键词计算</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {recommendations.map((company) => (
            <article key={company.name} className="rounded-md border border-border bg-surface/30 p-4">
              <div className="flex items-start gap-3">
                <CompanyLogo name={company.name} size={22} />
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-foreground">{company.name}</h4>
                  <p className="text-xs text-muted">{company.industry}</p>
                </div>
                <button type="button" onClick={() => onAdd(company)} disabled={saving === `add:${company.name}`} aria-label={`添加${company.name}`} title={`添加${company.name}`} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md bg-brand-soft text-brand transition hover:bg-brand/15 disabled:opacity-50">
                  {saving === `add:${company.name}` ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">{company.reason}</p>
            </article>
          ))}
        </div>
      </div>

      <form className="mt-8 border-t border-border pt-6" onSubmit={(event) => { event.preventDefault(); onAddCustom(); }}>
        <h3 className="text-sm font-semibold text-foreground">添加自定义公司</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-muted">公司名称
            <input required value={companyName} onChange={(event) => onCompanyName(event.target.value)} placeholder="例如：某家 AI 创业公司" className="mt-1.5 w-full rounded-md border border-border bg-surface/40 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-faint focus:border-brand/50" />
          </label>
          <label className="text-xs font-medium text-muted">行业方向
            <input value={companyIndustry} onChange={(event) => onCompanyIndustry(event.target.value)} placeholder="例如：企业 AI / 智能体" className="mt-1.5 w-full rounded-md border border-border bg-surface/40 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-faint focus:border-brand/50" />
          </label>
        </div>
        <label className="mt-3 block text-xs font-medium text-muted">招聘官网（选填）
          <input type="url" value={companyUrl} onChange={(event) => onCompanyUrl(event.target.value)} placeholder="https://…；留空则使用 Agent 公开搜索" className="mt-1.5 w-full rounded-md border border-border bg-surface/40 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-faint focus:border-brand/50" />
        </label>
        <button type="submit" disabled={!companyName.trim() || saving === `add:${companyName}`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:brightness-110 disabled:opacity-50">
          {saving === `add:${companyName}` ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} 添加公司
        </button>
      </form>
    </section>
  );
}

function RulesPanel({ ruleText, onRuleText, queries, onQueries, meta, saving, onSave }: { ruleText: RuleText; onRuleText: (value: RuleText) => void; queries: SearchQuery[]; onQueries: (value: SearchQuery[]) => void; meta: Rules; saving: boolean; onSave: () => void }) {
  const patchRule = (key: keyof RuleText, value: string) => onRuleText({ ...ruleText, [key]: value });
  const patchQuery = (index: number, patch: Partial<SearchQuery>) => onQueries(queries.map((query, position) => position === index ? { ...query, ...patch } : query));
  return (
    <section aria-labelledby="rules-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="rules-title" className="text-lg font-semibold text-foreground">搜索与筛选规则</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">这些规则已经由扫描内核使用。修改后会影响算法扫描、Agent 搜索和目标公司岗位筛选。</p>
        </div>
        <span className="rounded bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-400">已接入扫描内核</span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ListEditor label="目标岗位关键词" hint="每行一个；至少保留一个" value={ruleText.positive} onChange={(value) => patchRule("positive", value)} placeholder="AI创业管家\nAI产品负责人\n智能体产品" />
        <ListEditor label="排除岗位关键词" hint="匹配后直接排除" value={ruleText.negative} onChange={(value) => patchRule("negative", value)} placeholder="实习\n初级\n个人助理" />
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-foreground">地区规则</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <ListEditor label="始终包含" value={ruleText.alwaysAllow} onChange={(value) => patchRule("alwaysAllow", value)} placeholder="全国\n远程" compact />
          <ListEditor label="仅包含" value={ruleText.allow} onChange={(value) => patchRule("allow", value)} placeholder="深圳\n上海\n北京" compact />
          <ListEditor label="排除地区" value={ruleText.block} onChange={(value) => patchRule("block", value)} placeholder="海外" compact />
        </div>
      </div>

      <div className="mt-7 border-t border-border pt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">搜索查询</h3>
          <span className="text-xs text-faint">Agent 搜索模式使用</span>
        </div>
        <div className="mt-3 space-y-3">
          {queries.map((query, index) => (
            <div key={`${query.name}-${index}`} className="grid gap-2 border-b border-border pb-3 sm:grid-cols-[auto_11rem_1fr_auto] sm:items-center">
              <input type="checkbox" checked={query.enabled} onChange={(event) => patchQuery(index, { enabled: event.target.checked })} aria-label={`${query.name || "搜索规则"}是否启用`} className="size-4 accent-brand" />
              <input value={query.name} onChange={(event) => patchQuery(index, { name: event.target.value })} placeholder="规则名称" className="rounded-md border border-border bg-surface/40 px-2.5 py-2 text-sm outline-none focus:border-brand/50" />
              <input value={query.query} onChange={(event) => patchQuery(index, { query: event.target.value })} placeholder="搜索表达式" className="min-w-0 rounded-md border border-border bg-surface/40 px-2.5 py-2 font-mono text-xs outline-none focus:border-brand/50" />
              <button type="button" onClick={() => onQueries(queries.filter((_, position) => position !== index))} aria-label={`删除${query.name || "搜索规则"}`} title="删除搜索规则" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-faint hover:bg-red-500/10 hover:text-red-600"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => onQueries([...queries, { name: "", query: "", enabled: true }])} className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm text-brand hover:underline"><Plus className="size-4" /> 添加搜索查询</button>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-y border-border py-3 text-xs text-muted">
        <span>内容过滤规则：{meta.contentFilterGroups} 组</span>
        <span>结构化国际数据源：{meta.automatedBoards.filter((board) => board.enabled).length}/{meta.automatedBoards.length} 已启用</span>
        <span>高级内容过滤继续保存在 portals.yml 中</span>
      </div>

      <button type="button" onClick={onSave} disabled={saving || parseList(ruleText.positive).length === 0} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:brightness-110 disabled:opacity-50">
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} 保存搜索规则
      </button>
    </section>
  );
}

function ListEditor({ label, hint, value, onChange, placeholder, compact = false }: { label: string; hint?: string; value: string; onChange: (value: string) => void; placeholder: string; compact?: boolean }) {
  return (
    <label className="block text-xs font-medium text-muted">
      <span className="flex items-baseline justify-between gap-2"><span>{label}</span>{hint && <span className="font-normal text-faint">{hint}</span>}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={compact ? 4 : 6} placeholder={placeholder} className="mt-1.5 w-full resize-y rounded-md border border-border bg-surface/40 px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-faint focus:border-brand/50" />
    </label>
  );
}

function Toggle({ checked, label, onClick, disabled = false }: { checked: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} title={label} onClick={onClick} disabled={disabled} className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-brand" : "bg-surface-hover ring-1 ring-border")}>
      <span className={cn("absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform", checked && "translate-x-5")} />
    </button>
  );
}

function CompanyStatus({ company, health }: { company: Company; health?: HealthCompany }) {
  if (company.scanMethod === "websearch") return <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-medium text-brand">Agent 搜索</span>;
  if (!health) return <span className="rounded bg-surface-hover px-1.5 py-0.5 text-[10px] text-muted">待检查</span>;
  const tone = health.status === "live" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : health.status === "empty" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : health.status === "broken" ? "bg-red-500/10 text-red-700 dark:text-red-400" : "bg-surface-hover text-muted";
  const label = health.status === "live" ? "ATS 可用" : health.status === "empty" ? "暂无岗位" : health.status === "broken" ? "招聘源异常" : "需 Agent 检查";
  return <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", tone)} title={health.detail}>{label}</span>;
}

function FixAffordance({ company, job, onFix }: { company: string; job?: Job; onFix: () => void }) {
  if (job?.status === "running") return <Link href={`/jobs/${job.id}`} className="inline-flex min-h-10 items-center gap-1 text-xs font-medium text-brand"><Loader2 className="size-3 animate-spin text-icon-brand" /> 修复中</Link>;
  if (job?.status === "done") return <Link href={`/jobs/${job.id}`} className="text-xs font-medium text-emerald-600 dark:text-emerald-400">已修复</Link>;
  return <button type="button" onClick={onFix} title={`让 Agent 修复 ${company} 的招聘源`} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-outline-border bg-outline-bg text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover"><Wrench className="size-3.5" /></button>;
}
