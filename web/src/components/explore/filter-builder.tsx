"use client";

import { useState } from "react";
import {
  X,
  Ban,
  Clock,
  MapPin,
  ChevronDown,
  SlidersHorizontal,
  Building2,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { cleanChips, formatJobSearchKeywords, type ExploreFilters } from "@/lib/explore";

const RECENCY = [
  { label: "24 小时", days: 1 },
  { label: "3 天", days: 3 },
  { label: "7 天", days: 7 },
  { label: "14 天", days: 14 },
  { label: "30 天", days: 30 },
];

const RECRUITMENT_PLATFORMS = [
  { name: "BOSS直聘", href: "https://www.zhipin.com/" },
  { name: "猎聘", href: "https://www.liepin.com/" },
  { name: "脉脉", href: "https://maimai.cn/" },
  { name: "智联招聘", href: "https://www.zhaopin.com/" },
] as const;

const STYLE = `
.co-fb__chip{display:inline-flex;align-items:center;gap:.3rem;border-radius:999px;padding:.2rem .5rem .2rem .6rem;font-size:12.5px;line-height:1.2;border:1px solid transparent}
.co-fb__chip button{display:inline-flex;opacity:.6;transition:opacity .15s}
.co-fb__chip button:hover{opacity:1}
.co-fb__chip.inc{color:var(--brand-text);background:var(--color-brand-soft);border-color:color-mix(in srgb,var(--color-brand) 32%,transparent)}
html.dark .co-fb__chip.inc{color:var(--brand-text);background:var(--color-brand-soft);border-color:color-mix(in srgb,var(--color-brand) 36%,transparent)}
.co-fb__field{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;min-height:2.6rem;padding:.45rem .55rem;border-radius:.7rem}
.co-fb__field input{flex:1;min-width:7rem;background:transparent;border:none;outline:none;font-size:13.5px;color:inherit}
.co-fb__field input::placeholder{color:var(--co-faint,hsl(0 0% 60%))}
@media (max-width:639px){.co-fb__chip button{min-width:44px;min-height:44px;justify-content:center}.co-fb__chip{min-height:44px}.co-fb__field{min-height:44px}.co-fb__field input{min-height:32px}}
`;

function KeywordField({
  values,
  tone,
  placeholder,
  onChange,
}: {
  values: string[];
  tone: "inc" | "exc";
  placeholder: string;
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  // Split only on UNAMBIGUOUS item separators (comma / newline / semicolon) — never
  // bare spaces, which are legitimate inside multi-word entries ("AI platform",
  // "New York", "Costa Rica"). A space-only paste stays one chip on purpose (#1147).
  const commit = (text: string) => {
    const parts = text.split(/[,\n;\t\r]+/);
    const next = cleanChips([...values, ...parts]);
    onChange(next);
    setDraft("");
  };
  return (
    <div className={cn("co-fb__field border border-border bg-surface/40 focus-within:border-brand/40 transition-colors")}>
      {values.map((v) => (
        <span key={v} className={cn("co-fb__chip", tone === "inc" ? "inc" : "border-border bg-surface-hover text-muted")}>
          {tone === "exc" && <Ban className="size-3 opacity-70" />}
          {v}
          <button type="button" aria-label={`移除 ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => {
          const val = e.target.value;
          if (/[,\n;\t\r]$/.test(val)) commit(val);
          else setDraft(val);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text");
          const merged = draft + text;
          // Only commit to chips when the paste contains item separators.
          // A plain-text paste (e.g. pasting "-EMEA" after typing "Remote")
          // stays in the input field so the user can keep editing.
          if (/[,;\n\t\r]/.test(text)) commit(merged);
          else setDraft(merged);
        }}
        onBlur={() => draft.trim() && commit(draft)}
        placeholder={values.length ? "" : placeholder}
      />
    </div>
  );
}

function Label({ children, hint, action }: { children: React.ReactNode; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between">
      <span className="text-[13px] font-medium text-foreground">{children}</span>
      {action ?? (hint && <span className="text-[11px] text-faint">{hint}</span>)}
    </div>
  );
}

function CopyKeywordsButton({ values, label }: { values: string[]; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const copyValue = formatJobSearchKeywords(values);

  const copy = async () => {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 1600);
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      disabled={!copyValue}
      className="inline-flex min-h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 max-sm:min-h-[44px]"
      aria-label={`复制全部${label}`}
      title={`复制全部${label}，可粘贴到其他招聘平台`}
    >
      {state === "copied" ? <Check className="size-3.5 text-icon-success" /> : <Copy className="size-3.5 text-icon-muted" />}
      {state === "copied" ? "已复制" : state === "failed" ? "复制失败" : "复制"}
    </button>
  );
}

export function FilterBuilder({
  filters,
  onChange,
  seededFrom = [],
}: {
  filters: ExploreFilters;
  onChange: (f: ExploreFilters) => void;
  seededFrom?: string[];
}) {
  const [advanced, setAdvanced] = useState(true);
  const set = (patch: Partial<ExploreFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="space-y-4">
      <style>{STYLE}</style>

      <div>
        <Label
          action={<CopyKeywordsButton values={filters.positive} label="目标岗位" />}
        >
          目标岗位
        </Label>
        <KeywordField values={filters.positive} tone="inc" placeholder="AI 产品经理、Agent 产品、AI 创业伙伴…" onChange={(v) => set({ positive: v })} />
        {seededFrom.length > 0 && filters.positive.length > 0 && (
          <p className="mt-1 text-[11px] text-faint">已根据 {seededFrom.join(" + ")} 生成，可自由修改。</p>
        )}
      </div>

      <div>
        <Label action={<CopyKeywordsButton values={filters.negative} label="排除岗位" />}>排除岗位</Label>
        <KeywordField values={filters.negative} tone="exc" placeholder="销售、外包、纯开发…" onChange={(v) => set({ negative: v })} />
      </div>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <Label hint="官网提供日期时按此筛选">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5 text-icon-muted" /> 发布时间
            </span>
          </Label>
          <div className="inline-flex rounded-lg border border-border bg-surface/40 p-0.5">
            {RECENCY.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => set({ sinceDays: r.days })}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors max-sm:min-h-[44px]",
                  filters.sinceDays === r.days ? "bg-brand-soft text-brand" : "text-muted hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <Label hint="推荐渠道">搜索渠道</Label>
          <div className="flex flex-wrap gap-2" aria-label="岗位发现渠道">
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-brand/40 bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
              <Building2 className="size-3.5" />
              目标公司官网
            </span>
            {RECRUITMENT_PLATFORMS.map((platform) => (
              <a
                key={platform.name}
                href={platform.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-brand/40 bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand/15 max-sm:min-h-[44px]"
                aria-label={`前往${platform.name}官网`}
                title={`打开${platform.name}官网`}
              >
                {platform.name}
                <ExternalLink className="size-3 text-icon-brand" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAdvanced((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-foreground transition-colors max-sm:min-h-[44px]"
      >
        <SlidersHorizontal className="size-3.5 text-icon-muted" />
        地区与扫描范围
        <ChevronDown className={cn("size-3.5 text-icon-muted transition-transform", advanced && "rotate-180")} />
      </button>

      {advanced && (
        <div className="space-y-3 rounded-xl border border-border bg-surface/30 p-3">
          <div className="flex items-center gap-1.5 text-[12px] text-muted">
            <MapPin className="size-3.5 text-icon-muted" /> 地区
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label hint="避免遗漏多地点岗位">始终包含</Label>
              <KeywordField values={filters.alwaysAllow} tone="inc" placeholder="全国、远程…" onChange={(v) => set({ alwaysAllow: v })} />
            </div>
            <div>
              <Label>仅包含</Label>
              <KeywordField values={filters.allow} tone="inc" placeholder="深圳、上海、远程…" onChange={(v) => set({ allow: v })} />
            </div>
            <div>
              <Label>排除地区</Label>
              <KeywordField values={filters.block} tone="exc" placeholder="海外…" onChange={(v) => set({ block: v })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
