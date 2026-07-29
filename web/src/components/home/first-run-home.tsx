"use client";

import { HeroGlow } from "@/components/hero-glow";
import { CvIngest } from "@/components/cv/cv-ingest";

// The first-run takeover: when cv.md is missing, the CV-upload hero IS the home.
// One input, value-coming framing (not a form), the same product chrome (HeroGlow
// + dot-bg) so it feels like the app, not a gate. The whole aha (CV → free matches
// → first score) flows from here.
export function FirstRunHome() {
  return (
    <div className="page-shell py-10 md:py-16">
      <section className="dot-bg relative overflow-hidden rounded-2xl border border-border bg-surface/40 px-7 py-10 md:px-10 md:py-12">
        <HeroGlow />
        <div className="relative z-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            <span className="text-faint">//</span> 本地优先 · 你的电脑
          </p>
          <h1 className={`font-display mt-3 text-4xl leading-[1.05] text-landing md:text-5xl`}>
            导入简历，60 秒发现值得关注的岗位。
          </h1>
          <p className="mt-4 w-full text-[15px] leading-relaxed text-muted">
            无需注册账号。你的 Agent 在本机解析简历，再从实时招聘市场寻找匹配岗位。
            <span className="text-foreground">发现岗位不消耗 tokens</span>，只有在你主动诊断岗位时才调用模型。
          </p>
          <div className="mt-7">
            <CvIngest />
          </div>
        </div>
      </section>
    </div>
  );
}
