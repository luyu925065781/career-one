"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { CostBadge } from "@/components/cost/cost-badge";

const EXAMPLES = [
  "深圳 AI 创业公司的 Agent 产品负责人",
  "从 0 搭建 AI Native 团队的创业伙伴",
  "面向创始人推动 AI 转型落地的岗位",
];

// The "magic" natural-language box: a soft contained halo at rest that intensifies
// on focus (erupts into the full-viewport hunt on submit). Effect CSS co-located
// per the Tailwind v4 stale-CSS HMR gotcha.
const STYLE = `
.co-aibox{position:relative;border-radius:1.1rem;border:1px solid var(--co-border,hsl(0 0% 50% /.22));background:color-mix(in srgb, var(--bg) 55%, transparent);transition:border-color .3s,box-shadow .3s}
.co-aibox::before{content:"";position:absolute;inset:-1px;border-radius:1.1rem;padding:1px;background:radial-gradient(70% 140% at 28% -10%,color-mix(in srgb,var(--color-brand) 45%,transparent),transparent 62%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:.45;transition:opacity .3s;pointer-events:none}
.co-aibox:focus-within::before{opacity:1}
.co-aibox:focus-within{border-color:color-mix(in srgb,var(--color-brand) 50%,transparent);box-shadow:none}
.co-aibox textarea{width:100%;resize:none;background:transparent;border:none;outline:none;font-size:16px;line-height:1.5;color:inherit}
.co-aibox textarea::placeholder{color:var(--co-faint,hsl(0 0% 58%))}
@media(prefers-reduced-motion:reduce){.co-aibox,.co-aibox::before{transition:none}}
`;

export function AiSearchBox({
  intent,
  onIntent,
  onSubmit,
  cliConfigured,
  cliName,
  onRunScan,
}: {
  intent: string;
  onIntent: (s: string) => void;
  onSubmit: () => void;
  cliConfigured: boolean;
  cliName?: string;
  onRunScan: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const grow = () => {
    const t = ref.current;
    if (t) {
      t.style.height = "auto";
      t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
    }
  };

  return (
    <div>
      <style>{STYLE}</style>
      <div className="co-aibox p-4">
        <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-brand">
          <Sparkles className="size-3.5" /> 描述目标岗位，Agent 将搜索公开信息
        </div>
        <textarea
          ref={ref}
          rows={2}
          value={intent}
          onChange={(e) => {
            onIntent(e.target.value);
            grow();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (intent.trim()) onSubmit();
            }
          }}
          placeholder="例如：深圳 AI 创业公司，负责 Agent 产品与团队从 0 到 1"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
            {cliConfigured ? (
              <span className="text-muted">
                使用 <span className="text-foreground">{cliName || "你的 Agent CLI"}</span> 搜索公开信息，会消耗 tokens。
              </span>
            ) : (
              <>
                <span className="text-icon-danger">请先在设置中连接 Agent CLI，再使用 AI 搜索。</span>
                <Link
                  href="/config"
                  className="inline-flex min-h-7 items-center gap-1 font-medium text-muted transition-colors hover:text-brand focus-visible:text-brand max-sm:min-h-[44px]"
                >
                  去设置 <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            disabled={!intent.trim()}
            onClick={onSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-sm transition hover:brightness-110 disabled:opacity-50"
          >
            搜索公开信息
            <CostBadge kind="spend" size="xs" />
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => onIntent(ex)}
            className="rounded-full border border-border bg-surface/40 px-3 py-1.5 text-[12px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            {ex}
          </button>
        ))}
        <button type="button" onClick={onRunScan} className="ml-auto inline-flex items-center gap-1 text-[12px] text-faint transition hover:text-foreground">
          或改用算法扫描 →
        </button>
      </div>
    </div>
  );
}
