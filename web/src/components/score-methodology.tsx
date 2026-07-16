import { ChevronDown } from "lucide-react";

// Keep the report explanation local and aligned with the scoring rubric in
// modes/_shared.md. Native <details> keeps the disclosure usable without client JS.

const DIMENSIONS: [string, string][] = [
  ["简历匹配度", "你的真实经历与岗位要求之间的对应程度"],
  ["职业方向", "这个岗位是否推动你接近已确认的职业目标"],
  ["薪酬竞争力", "岗位薪资与市场水平的比较；信息缺失时标记资料不足，不虚构数字"],
  ["组织与文化", "团队、价值观、工作方式和加班制度等信号"],
  ["风险信号", "幽灵岗位、诈骗、职责错配和信息不透明等风险"],
  ["综合判断", "汇总以上维度形成的最终建议"],
];

const BLOCKS: [string, string][] = [
  ["A", "岗位与公司摘要"],
  ["B", "简历逐项匹配证据与能力缺口"],
  ["C", "针对该岗位的候选人定位策略"],
  ["D", "薪资、总包与市场水平分析"],
  ["E", "投递材料的个性化建议"],
  ["F", "针对岗位的 STAR 面试故事准备"],
  ["G", "岗位真实性、活跃度与招聘风险检查"],
];

export function ScoreMethodology() {
  return (
    <details className="group mt-10 overflow-hidden rounded-2xl border border-border bg-surface/30">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors hover:bg-surface-hover">
        择程AI如何评分，以及为什么这是针对<span className="text-landing">你的</span>判断
        <ChevronDown className="ml-auto size-4 text-icon-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-5 border-t border-border px-5 py-4 text-sm">
        <p className="text-muted">
          每个岗位按六个维度得到 <strong className="text-foreground">1.0–5.0</strong> 的综合评分。{" "}
          <strong className="text-brand">4.0</strong> 是默认投递线；低于该分数时，择程AI默认不建议投递。
        </p>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">六个评分维度</div>
          <ul className="space-y-1.5">
            {DIMENSIONS.map(([k, v]) => (
              <li key={k}>
                <span className="font-medium text-foreground">{k}</span> <span className="text-muted">— {v}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">报告各模块含义</div>
          <ul className="space-y-2">
            {BLOCKS.map(([k, v]) => (
              <li key={k} className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded bg-brand-soft text-xs font-semibold text-brand">
                  {k}
                </span>
                <span className="text-muted">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
