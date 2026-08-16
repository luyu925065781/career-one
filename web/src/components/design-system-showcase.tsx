"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleHelp,
  Component,
  Copy,
  Info,
  LoaderCircle,
  Palette,
  Ruler,
  Search,
  Settings2,
  Sparkles,
  Type,
  X,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type TypographyToken = {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: string | number;
  letterSpacing: string;
};

type ComponentToken = Record<string, string | number>;

export type DesignDocument = {
  version: string;
  name: string;
  description: string;
  colors: Record<string, string>;
  typography: Record<string, TypographyToken>;
  rounded: Record<string, string>;
  elevation: Record<string, string>;
  spacing: Record<string, string>;
  components: Record<string, ComponentToken>;
};

export type DesignPrinciple = {
  do: string;
  dont: string;
};

type TabId = "colors" | "typography" | "scale" | "components" | "principles";

const TABS: Array<{
  id: TabId;
  label: string;
  description: string;
  icon: typeof Palette;
}> = [
  { id: "colors", label: "颜色", description: "品牌、中性与语义色", icon: Palette },
  { id: "typography", label: "字体", description: "双字体信息层级", icon: Type },
  { id: "scale", label: "尺度", description: "间距、圆角与层级", icon: Ruler },
  { id: "components", label: "组件", description: "真实交互状态", icon: Component },
  { id: "principles", label: "原则", description: "约束与可访问性", icon: BookOpenCheck },
];

const COLOR_LABELS: Record<string, string> = {
  primary: "认知黄",
  secondary: "明亮黄",
  background: "暖白画布",
  surface: "工作表面",
  "on-surface": "表面正文",
  "on-surface-variant": "次级正文",
  muted: "弱化正文",
  faint: "元数据",
  "accent-yellow": "强调黄",
  "accent-orange": "强调橙",
  "accent-red": "强调红",
  "accent-green": "强调绿",
  "accent-blue": "强调蓝",
  "accent-purple": "强调紫",
  "metric-brand": "品牌指标琥珀",
  "metric-purple": "紫色指标",
  outline: "默认边框",
  "outline-strong": "强调边框",
  success: "成功",
  warning: "警告",
  error: "错误",
  info: "信息",
  "dark-background": "深色画布",
  "dark-surface": "深色表面",
  "dark-primary": "深色主色",
};

const TYPE_SAMPLES: Record<string, string> = {
  "display-lg": "求职决策，清晰推进",
  "display-md": "择程AI",
  "headline-lg": "AI Native, by design",
  "headline-md": "高频工作流，安静地完成",
  "headline-sm": "任务进度与关键证据",
  "title-lg": "AI 岗位诊断",
  "body-lg": "清晰、可靠、敏捷，并保留恰到好处的人格温度。",
  "body-md": "界面以内容和工作流为中心，装饰必须服从任务。",
  "body-sm": "报告保存在当前工作区，数据默认留在本地。",
  "label-md": "开始诊断",
  "label-sm": "正在分析岗位要求",
  "code-md": "markets/china-mainland/output/",
};

function displayTokenName(name: string) {
  return COLOR_LABELS[name] ?? name.replaceAll("-", " ");
}

function parseNumber(value: string) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

function fontFamilyValue(value: string) {
  if (value.includes("SF Pro Display")) return '"SF Pro Display", "Source Han Sans SC", "Noto Sans CJK SC", -apple-system, BlinkMacSystemFont, "PingFang SC", system-ui, sans-serif';
  if (value.includes("SF Pro Text")) return '"SF Pro Text", "Source Han Sans SC", "Noto Sans CJK SC", -apple-system, BlinkMacSystemFont, "PingFang SC", system-ui, sans-serif';
  return "ui-monospace, SFMono-Regular, Menlo, monospace";
}

function resolveReference(value: string | number, document: DesignDocument) {
  if (typeof value === "number") return String(value);
  const reference = value.match(/^\{(colors|typography|rounded|spacing)\.([^}]+)\}$/);
  if (!reference) return value;
  const [, group, key] = reference;
  const source = document[group as "colors" | "typography" | "rounded" | "spacing"] as Record<string, unknown>;
  const resolved = source[key];
  if (typeof resolved === "object" && resolved) {
    return Object.entries(resolved).map(([itemKey, itemValue]) => `${itemKey} ${itemValue}`).join(" · ");
  }
  return String(resolved ?? value);
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-7 max-w-3xl">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand">{eyebrow}</p>
      <h2 className="text-4xl font-semibold leading-tight text-landing">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

function TokenCopyButton({ name, value, onCopy, copied }: {
  name: string;
  value: string;
  onCopy: (name: string, value: string) => void;
  copied: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={() => onCopy(name, value)}
      className="shrink-0 text-icon-muted"
      aria-label={`复制 ${name}`}
      title={`复制 ${name}`}
    >
      {copied ? <Check className="size-4 text-icon-success" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
    </Button>
  );
}

function ColorTokenCard({ name, value, onCopy, copied }: {
  name: string;
  value: string;
  onCopy: (name: string, value: string) => void;
  copied: boolean;
}) {
  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
      <div className="h-24 border-b border-border" style={{ backgroundColor: value }} />
      <div className="flex min-h-20 items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground" title={name}>{displayTokenName(name)}</p>
          <code className="mt-1 block truncate font-mono text-xs text-faint">{name}</code>
          <code className="mt-1 block font-mono text-xs text-muted">{value}</code>
        </div>
        <TokenCopyButton name={name} value={value} onCopy={onCopy} copied={copied} />
      </div>
    </article>
  );
}

function ColorSection({ document, onCopy, copiedKey }: {
  document: DesignDocument;
  onCopy: (name: string, value: string) => void;
  copiedKey: string;
}) {
  const entries = Object.entries(document.colors);
  const groups = [
    {
      title: "品牌与核心表面",
      description: "黄色只承担识别、主操作和关键选中状态；暖白与炭黑承载长期使用。",
      entries: entries.filter(([name]) =>
        name.startsWith("primary") || name.startsWith("on-primary") || name === "secondary" || name === "on-secondary" ||
        ["background", "on-background", "surface", "on-surface", "on-surface-variant", "muted", "faint", "outline", "outline-strong"].includes(name),
      ),
    },
    {
      title: "多色相强调色",
      description: "黄色保持唯一品牌主色；其他色相用于图表、进度条、数据标记和小面积视觉强调。",
      entries: entries.filter(([name]) => name.startsWith("accent-") || name.startsWith("metric-")),
    },
    {
      title: "中性色阶",
      description: "从阅读背景到高对比正文，建立稳定的信息密度与边界。",
      entries: entries.filter(([name]) => name.startsWith("gray-") || name.startsWith("surface-container") || name === "surface-hover"),
    },
    {
      title: "语义状态",
      description: "成功、警告、错误和信息保持独立语义，状态不能只依赖颜色表达。",
      entries: entries.filter(([name]) => /^(success|warning|error|danger|info)/.test(name)),
    },
    {
      title: "深色模式",
      description: "以近黑和中性深灰建立层级，品牌黄保持一致，不转向深蓝或紫色。",
      entries: entries.filter(([name]) => name.startsWith("dark-")),
    },
  ];

  return (
    <div>
      <SectionHeading eyebrow="Color tokens" title="认知之光与暖白画布" description="色值直接来自 DESIGN.md。点击任意 Token 右侧的复制图标即可带走名称和值。" />
      <div className="space-y-10">
        {groups.map((group) => (
          <section key={group.title} aria-labelledby={`color-${group.title}`}>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 id={`color-${group.title}`} className="text-lg font-semibold text-foreground">{group.title}</h3>
                <p className="mt-1 text-sm text-muted">{group.description}</p>
              </div>
              <span className="font-mono text-xs text-faint">{group.entries.length} tokens</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {group.entries.map(([name, value]) => (
                <ColorTokenCard
                  key={name}
                  name={name}
                  value={value}
                  onCopy={onCopy}
                  copied={copiedKey === `${name}:${value}`}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function TypographySection({ document, onCopy, copiedKey }: {
  document: DesignDocument;
  onCopy: (name: string, value: string) => void;
  copiedKey: string;
}) {
  return (
    <div>
      <SectionHeading eyebrow="Typography tokens" title="统一的现代无衬线语言" description="择程AI以英文 SF Pro 风格和中文思源黑体风格为基准；产品使用系统 UI 字体，不额外内嵌品牌字体。" />
      <div className="divide-y divide-border border-y border-border">
        {Object.entries(document.typography).map(([name, token]) => {
          const serialized = `${token.fontFamily} / ${token.fontSize} / ${token.fontWeight} / ${token.lineHeight}`;
          return (
            <article key={name} className="grid gap-5 py-6 md:grid-cols-[210px_minmax(0,1fr)_40px] md:items-center">
              <div className="min-w-0">
                <code className="font-mono text-sm font-semibold text-foreground">{name}</code>
                <p className="mt-2 text-xs leading-5 text-faint">
                  {token.fontFamily} · {token.fontSize} · {token.fontWeight}<br />
                  行高 {token.lineHeight} · 字距 {token.letterSpacing}
                </p>
              </div>
              <p
                className="min-w-0 overflow-hidden text-foreground"
                style={{
                  fontFamily: fontFamilyValue(token.fontFamily),
                  fontSize: token.fontSize,
                  fontWeight: token.fontWeight,
                  lineHeight: token.lineHeight,
                  letterSpacing: token.letterSpacing,
                }}
              >
                {TYPE_SAMPLES[name] ?? "清晰表达，可靠行动"}
              </p>
              <TokenCopyButton name={name} value={serialized} onCopy={onCopy} copied={copiedKey === `${name}:${serialized}`} />
            </article>
          );
        })}
      </div>

      <section className="mt-10 grid gap-4 md:grid-cols-3" aria-label="字体职责">
        <Card className="min-h-44 bg-surface p-5">
          <p className="text-2xl font-semibold text-landing">SF Pro style</p>
          <p className="mt-4 text-sm leading-6 text-muted">英文视觉基准。Display 用于标题，Text 用于正文与控件。</p>
        </Card>
        <Card className="min-h-44 bg-surface p-5">
          <p className="text-2xl font-semibold text-foreground">思源黑体</p>
          <p className="mt-4 text-sm leading-6 text-muted">中文视觉基准。覆盖标题、正文、导航、表单与数据。</p>
        </Card>
        <Card className="min-h-44 bg-surface p-5">
          <p className="text-2xl font-semibold text-foreground">系统 UI 字体</p>
          <p className="mt-4 text-sm leading-6 text-muted">具体产品按平台调用系统字体，不下载或内嵌品牌字体。</p>
        </Card>
      </section>
    </div>
  );
}

function ScaleSection({ document, onCopy, copiedKey }: {
  document: DesignDocument;
  onCopy: (name: string, value: string) => void;
  copiedKey: string;
}) {
  const spacingEntries = Object.entries(document.spacing);
  const scaleEntries = spacingEntries.filter(([, value]) => parseNumber(value) <= 80);
  const layoutEntries = spacingEntries.filter(([, value]) => parseNumber(value) > 80 || value.includes("1280"));

  return (
    <div>
      <SectionHeading eyebrow="Layout tokens" title="四像素基线，稳定而克制" description="固定格式组件使用稳定尺寸；移动端交互目标不小于 44×44px，动态内容不得推动相邻布局。" />
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section aria-labelledby="spacing-heading">
          <div className="mb-4 border-b border-border pb-3">
            <h3 id="spacing-heading" className="text-lg font-semibold text-foreground">间距尺度</h3>
            <p className="mt-1 text-sm text-muted">条形长度按 Token 的像素值等比呈现，上限为 80px。</p>
          </div>
          <div className="divide-y divide-border">
            {scaleEntries.map(([name, value]) => (
              <div key={name} className="grid min-h-16 grid-cols-[100px_minmax(0,1fr)_72px_40px] items-center gap-3">
                <code className="truncate font-mono text-xs text-muted">{name}</code>
                <div className="flex h-8 items-center">
                  <div className="h-3 rounded-sm bg-brand" style={{ width: `${Math.max(4, parseNumber(value))}px` }} />
                </div>
                <code className="text-right font-mono text-xs text-faint">{value}</code>
                <TokenCopyButton name={name} value={value} onCopy={onCopy} copied={copiedKey === `${name}:${value}`} />
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="radius-heading">
          <div className="mb-4 border-b border-border pb-3">
            <h3 id="radius-heading" className="text-lg font-semibold text-foreground">圆角尺度</h3>
            <p className="mt-1 text-sm text-muted">8px 是默认控件圆角，16px 用于独立卡片。</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
            {Object.entries(document.rounded).map(([name, value]) => (
              <article key={name} className="relative min-h-32 border border-border bg-surface p-4" style={{ borderRadius: value }}>
                <code className="font-mono text-xs font-semibold text-foreground">{name}</code>
                <code className="mt-2 block font-mono text-xs text-faint">{value}</code>
                <div className="absolute bottom-3 right-3">
                  <TokenCopyButton name={name} value={value} onCopy={onCopy} copied={copiedKey === `${name}:${value}`} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-10 border-t border-border pt-7" aria-labelledby="layout-heading">
        <h3 id="layout-heading" className="text-lg font-semibold text-foreground">布局边界</h3>
        <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          {layoutEntries.map(([name, value]) => (
            <div key={name} className="bg-surface p-5">
              <code className="font-mono text-xs text-faint">{name}</code>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-border pt-7" aria-labelledby="elevation-heading">
        <h3 id="elevation-heading" className="text-lg font-semibold text-foreground">阴影层级</h3>
        <p className="mt-1 text-sm text-muted">只有脱离页面画布的元素才使用阴影；普通列表与页面结构保持无阴影。</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          {Object.entries(document.elevation)
            .filter(([name]) => !name.startsWith("dark-"))
            .map(([name, value]) => (
              <article
                key={name}
                className="relative min-h-32 rounded-card border border-border bg-surface p-4"
                style={{ boxShadow: value }}
              >
                <code className="font-mono text-xs font-semibold text-foreground">{name}</code>
                <code className="mt-2 block break-words font-mono text-[11px] leading-5 text-faint">{value}</code>
                <div className="absolute bottom-3 right-3">
                  <TokenCopyButton name={name} value={value} onCopy={onCopy} copied={copiedKey === `${name}:${value}`} />
                </div>
              </article>
            ))}
        </div>
      </section>
    </div>
  );
}

function ComponentTokenList({ document }: { document: DesignDocument }) {
  const [open, setOpen] = useState<string | null>("button-primary");

  return (
    <div className="divide-y divide-border border-y border-border">
      {Object.entries(document.components).map(([name, token]) => {
        const isOpen = open === name;
        return (
          <div key={name}>
            <button
              type="button"
              data-button-shape="container"
              data-ui-structural="disclosure-row"
              data-density="spacious"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : name)}
              className="flex w-full items-center justify-between gap-4 px-2 py-3 text-left"
            >
              <code className="font-mono text-sm font-semibold text-foreground">{name}</code>
              <ChevronDown className={cn("size-4 text-icon-muted transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
            </button>
            {isOpen ? (
              <dl className="grid gap-x-5 gap-y-3 pb-5 sm:grid-cols-2">
                {Object.entries(token).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 text-sm">
                    <dt className="font-mono text-xs text-faint">{key}</dt>
                    <dd className="min-w-0 break-words font-mono text-xs text-muted">{resolveReference(value, document)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ComponentsSection({ document }: { document: DesignDocument }) {
  const [mode, setMode] = useState<"规则" | "AI">("AI");
  const [enabled, setEnabled] = useState(true);

  return (
    <div>
      <SectionHeading eyebrow="Component patterns" title="用真实状态验证 Token" description="以下组件直接使用择程AI现有语义类和 UI 基元，不另建页面专属视觉体系。" />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-10">
          <section aria-labelledby="buttons-heading">
            <div className="mb-4 border-b border-border pb-3">
              <h3 id="buttons-heading" className="text-lg font-semibold text-foreground">按钮与命令</h3>
              <p className="mt-1 text-sm text-muted">Primary 使用品牌色，Secondary 使用中性玻璃，Tertiary 使用白底描边；按钮式链接复用同一套变体。</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button><Sparkles className="size-4" aria-hidden="true" />AI 岗位诊断</Button>
              <Button variant="secondary">查看报告<ArrowRight className="size-4" aria-hidden="true" /></Button>
              <Button variant="tertiary">稍后处理</Button>
              <Button variant="ghost"><Settings2 className="size-4" aria-hidden="true" />设置</Button>
              <Button disabled><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />正在分析</Button>
              <Button variant="tertiary" size="icon" title="搜索" aria-label="搜索"><Search className="size-4" aria-hidden="true" /></Button>
            </div>
          </section>

          <section aria-labelledby="selection-heading">
            <div className="mb-4 border-b border-border pb-3">
              <h3 id="selection-heading" className="text-lg font-semibold text-foreground">输入与选择</h3>
              <p className="mt-1 text-sm text-muted">Focus 只改变边框，不增加阴影或发光环。</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-foreground">
                目标岗位
                <input data-ui-control className="mt-2 h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-outline-border-hover" placeholder="例如：AI 产品经理" />
              </label>
              <label className="block text-sm font-medium text-foreground">
                所在城市
                <span className="relative mt-2 block">
                  <select data-ui-control className="h-11 w-full appearance-none rounded-md border border-border bg-surface px-3 pr-10 text-sm text-foreground outline-none focus:border-outline-border-hover">
                    <option>深圳</option>
                    <option>上海</option>
                    <option>北京</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-icon-muted" aria-hidden="true" />
                </span>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div className="inline-grid h-11 grid-cols-2 rounded-lg border border-border bg-surface p-1" role="tablist" aria-label="诊断模式">
                {(["规则", "AI"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    data-ui-structural="segment"
                    aria-selected={mode === item}
                    onClick={() => setMode(item)}
                    className="min-w-24 rounded-md px-3 text-sm font-medium"
                  >
                    {item} 诊断
                  </button>
                ))}
              </div>

              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
                保存诊断历史
                <button
                  type="button"
                  role="switch"
                  data-ui-structural="switch-track"
                  aria-checked={enabled}
                  onClick={() => setEnabled((value) => !value)}
                  className="relative h-7 w-12 rounded-full border"
                >
                  <span data-ui-switch-thumb className="absolute left-0 top-0.5 size-5 rounded-full" />
                </button>
              </label>
            </div>
          </section>

          <section aria-labelledby="status-heading">
            <div className="mb-4 border-b border-border pb-3">
              <h3 id="status-heading" className="text-lg font-semibold text-foreground">状态与反馈</h3>
              <p className="mt-1 text-sm text-muted">颜色、图标和文字共同表达状态。</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge tone="good" className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5" />已完成</Badge>
              <Badge tone="warn" className="inline-flex items-center gap-1.5"><CircleAlert className="size-3.5" />需要确认</Badge>
              <Badge tone="bad" className="inline-flex items-center gap-1.5"><XCircle className="size-3.5" />执行失败</Badge>
              <Badge tone="muted" className="inline-flex items-center gap-1.5"><CircleHelp className="size-3.5" />等待输入</Badge>
            </div>
            <div className="mt-5 overflow-hidden rounded-lg border border-border bg-surface">
              {[
                { icon: CheckCircle2, color: "text-icon-success", title: "读取用户画像", meta: "已完成 · 2 秒" },
                { icon: LoaderCircle, color: "text-icon-brand animate-spin", title: "评估岗位匹配度", meta: "执行中 · 18 秒" },
                { icon: CircleHelp, color: "text-icon-muted", title: "生成沟通话术", meta: "等待上一步" },
              ].map((item, index) => (
                <div key={item.title} className={cn("flex min-h-16 items-center gap-3 px-4", index > 0 && "border-t border-border")}>
                  <item.icon className={cn("size-5 shrink-0", item.color)} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-xs text-faint">{item.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="xl:border-l xl:border-border xl:pl-8" aria-labelledby="component-map-heading">
          <div className="sticky top-24">
            <h3 id="component-map-heading" className="text-lg font-semibold text-foreground">组件 Token 解析</h3>
            <p className="mt-1 text-sm leading-6 text-muted">展开查看 DESIGN.md 中的组件规则如何解析到语义 Token。</p>
            <div className="mt-5">
              <ComponentTokenList document={document} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PrinciplesSection({ principles }: { principles: DesignPrinciple[] }) {
  return (
    <div>
      <SectionHeading eyebrow="Usage principles" title="不是装饰清单，而是决策边界" description="规范的价值在于约束不必要的选择，让每个产品在扩展时仍保持同一套判断逻辑。" />
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="hidden grid-cols-2 border-b border-border bg-surface-hover px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-faint sm:grid">
          <span>Do / 应当</span>
          <span className="border-l border-border pl-5">Don't / 不应</span>
        </div>
        <div className="divide-y divide-border">
          {principles.map((principle, index) => (
            <div key={`${principle.do}-${index}`} className="grid sm:grid-cols-2">
              <div className="flex gap-3 p-5">
                <Check className="mt-0.5 size-5 shrink-0 text-icon-success" aria-hidden="true" />
                <p className="text-sm leading-6 text-foreground">{principle.do}</p>
              </div>
              <div className="flex gap-3 border-t border-border p-5 sm:border-l sm:border-t-0">
                <X className="mt-0.5 size-5 shrink-0 text-icon-danger" aria-hidden="true" />
                <p className="text-sm leading-6 text-muted">{principle.dont}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="mt-10 grid gap-4 lg:grid-cols-3" aria-label="上线前检查">
        {[
          { icon: Info, title: "可访问性", body: "正文对比度至少 4.5:1；黄色表面使用深色文字；状态不只依赖颜色。" },
          { icon: Ruler, title: "响应式", body: "移动端操作目标至少 44×44px；文字完整显示；固定组件不因状态跳动。" },
          { icon: AlertCircle, title: "动效反馈", body: "过渡控制在 100–200ms；长任务显示阶段、耗时和恢复状态。" },
        ].map((item) => (
          <Card key={item.title} className="min-h-44 bg-surface p-5">
            <item.icon className="size-5 text-icon-brand" aria-hidden="true" />
            <h3 className="mt-5 text-base font-semibold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}

export function DesignSystemShowcase({ document, principles }: {
  document: DesignDocument;
  principles: DesignPrinciple[];
}) {
  const [activeTab, setActiveTab] = useState<TabId>("colors");
  const [copiedKey, setCopiedKey] = useState("");
  const counts = useMemo(() => [
    { label: "颜色", value: Object.keys(document.colors).length },
    { label: "字体", value: Object.keys(document.typography).length },
    { label: "尺度", value: Object.keys(document.spacing).length + Object.keys(document.rounded).length + Object.keys(document.elevation).length },
    { label: "组件", value: Object.keys(document.components).length },
  ], [document]);

  async function copyToken(name: string, value: string) {
    const key = `${name}:${value}`;
    const text = `${name}: ${value}`;
    let copied = false;

    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      const fallback = window.document.createElement("textarea");
      fallback.value = text;
      fallback.setAttribute("readonly", "");
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      window.document.body.appendChild(fallback);
      fallback.select();
      copied = window.document.execCommand("copy");
      fallback.remove();
    }

    if (!copied) {
      setCopiedKey("");
      return;
    }

    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((current) => current === key ? "" : current), 1600);
  }

  return (
    <main className="min-w-0 pb-20">
      <header className="border-b border-border bg-surface/35">
        <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex h-7 items-center rounded-full bg-brand-soft px-2.5 font-mono text-xs font-semibold text-brand-text">DESIGN.md</span>
                <span className="font-mono text-xs text-faint">{document.version}</span>
              </div>
              <h1 className="text-5xl font-bold leading-[1.05] text-landing sm:text-6xl">{document.name}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted">{document.description}</p>
            </div>

            <dl className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-border bg-border">
              {counts.map((item) => (
                <div key={item.label} className="min-w-20 bg-surface px-3 py-4 text-center sm:min-w-24">
                  <dd className="text-3xl font-semibold tabular-nums text-landing">{item.value}</dd>
                  <dt className="mt-1 text-xs text-faint">{item.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto max-w-[1280px] overflow-x-auto px-4 sm:px-6">
          <div className="flex min-w-max gap-1 py-2" role="tablist" aria-label="设计系统分区">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  data-ui-structural="segment"
                  data-density="comfortable"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.id)}
                  className="group flex items-center gap-2 rounded-md px-3 text-sm font-medium"
                >
                  <Icon className={cn("size-4", selected ? "text-icon-brand" : "text-icon-muted group-hover:text-icon-default")} aria-hidden="true" />
                  {tab.label}
                  <span className="hidden text-xs font-normal text-faint lg:inline">{tab.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 sm:py-14">
        <div role="tabpanel" tabIndex={0} className="outline-none">
          {activeTab === "colors" ? <ColorSection document={document} onCopy={copyToken} copiedKey={copiedKey} /> : null}
          {activeTab === "typography" ? <TypographySection document={document} onCopy={copyToken} copiedKey={copiedKey} /> : null}
          {activeTab === "scale" ? <ScaleSection document={document} onCopy={copyToken} copiedKey={copiedKey} /> : null}
          {activeTab === "components" ? <ComponentsSection document={document} /> : null}
          {activeTab === "principles" ? <PrinciplesSection principles={principles} /> : null}
        </div>
      </div>
    </main>
  );
}
