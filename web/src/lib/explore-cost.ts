// The cost-honesty taxonomy — a single source for the FREE vs $ boundary that the
// Explorer teaches by repetition. Discovery (finding roles) is structurally free:
// it calls no LLM. Only evaluation (scoring a role against your CV) spends tokens,
// and only when the user chooses it. The framing is always local-first: "your key,
// your AI, your machine."

export type CostClass = "free" | "free-network" | "spend" | "free-gemini";

export const COST_META: Record<CostClass, { label: string; tip: string }> = {
  "free-network": {
    label: "免费",
    tip: "通过 HTTP 检查目标公司的公开招聘官网，不调用模型、不消耗 tokens；只有你选择岗位后才会写入本地数据。",
  },
  free: {
    label: "免费",
    tip: "不消耗 tokens，只读写本地文件。",
  },
  spend: {
    label: "消耗 tokens",
    tip: "使用你自己的 Agent 执行真实 A–F 岗位评估，只有你主动选择岗位后才会运行。",
  },
  "free-gemini": {
    label: "免费 · Gemini",
    tip: "使用 Google Gemini 免费额度进行评估。",
  },
};
