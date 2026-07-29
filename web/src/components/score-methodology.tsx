import { ChevronDown } from "lucide-react";

// Keep the report explanation local and aligned with the scoring rubric in
// modes/_shared.md. Native <details> keeps the disclosure usable without client JS.

const SCORING_FACTORS: [string, string][] = [
  ["简历匹配度", "你的真实经历与岗位要求之间的对应程度"],
  ["职业方向", "这个岗位是否推动你接近已确认的职业目标"],
  ["职级与职责", "岗位的真实职级、职责范围和决策边界是否与你的自然职级匹配"],
  ["薪酬竞争力", "岗位薪资与市场水平的比较；信息缺失时标记资料不足，不虚构数字"],
  ["组织与文化", "团队结构、价值观、工作方式和加班制度等信号"],
];

const REPORT_MODULES = [
  "岗位预览：岗位、公司与角色画像",
  "简历匹配分析：逐项证据、匹配雷达、正向信号与能力缺口",
  "级别判断与求职策略：职级、职责范围和候选人定位",
  "薪酬竞争力与市场需求：薪资、总包和市场水平",
  "职位真实性评估：活跃度、招聘风险与剩余风险",
  "打招呼话术：用于首次联系招聘方的简洁表达",
  "向招聘方追问：需要确认的岗位、团队与招聘信息",
  "你在这个岗位里的最佳表达：最值得强调的候选人定位",
  "沟通后分流规则：根据招聘方反馈决定继续、核实或放弃",
  "针对性定制方案：投递材料的个性化建议",
  "面试备考计划：针对岗位的 STAR 面试故事准备",
];

export function ScoreMethodology() {
  return (
    <details className="group mt-3 overflow-hidden rounded-2xl border border-border bg-surface/30">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors hover:bg-surface-hover">
        择程AI如何评分，以及为什么这是针对<span className="text-landing">你的</span>判断
        <ChevronDown className="ml-auto size-4 text-icon-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-5 border-t border-border px-5 py-4 text-sm">
        <p className="text-muted">
          每个岗位按 5 个评分因子得到 <strong className="text-foreground">1.0–5.0</strong> 的综合匹配分。{" "}
          <strong className="text-brand">4.0</strong> 是默认投递线；低于该分数时，择程AI默认不建议投递。
        </p>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">5 个评分因子</div>
          <ul className="space-y-1.5">
            {SCORING_FACTORS.map(([k, v]) => (
              <li key={k}>
                <span className="font-medium text-foreground">{k}</span> <span className="text-muted">— {v}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <div className="font-medium text-foreground">综合判断</div>
          <p className="mt-1 text-muted">
            先计算五因子匹配分，再结合职位真实性评级形成行动建议。真实性评级不修改数值分，但可以把“投递”调整为“先核实”“谨慎推进”或“放弃”。
          </p>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">报告模块顺序与含义</div>
          <ul className="space-y-2">
            {REPORT_MODULES.map((description, index) => (
              <li key={description} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded bg-brand-soft px-1.5 text-xs font-semibold tabular-nums text-brand"
                >
                  {index + 1}
                </span>
                <span className="text-muted">{description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
