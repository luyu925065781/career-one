import path from "node:path";

export type CnDiagnoseInput = {
  company?: string;
  role?: string;
  jdText?: string;
  screenshotNames?: string[];
  screenshotRels?: string[];
};

export type CnDiagnoseResult = {
  company: string;
  role: string;
  location: string;
  salary: string;
  score: number;
  verdict: string;
  scoreNote: string;
  positiveSignals: string[];
  risks: string[];
  questions: string[];
  openingMessage: string;
  positioning: string[];
  meters: { label: string; value: number; tone?: "risk" | "good" }[];
  decisionRules: { label: string; body: string }[];
  nextActions: string[];
  sourceSummary: string;
  confidence: "low" | "medium" | "high";
  slug: string;
};

const POSITIVE_KEYWORDS = [
  "ai agent",
  "agent",
  "智能体",
  "大模型",
  "ai",
  "产品",
  "架构",
  "0-1",
  "从0到1",
  "落地",
  "mvp",
  "创业伙伴",
  "创始人",
  "ceo",
  "合伙人",
  "独立开发",
  "上线",
  "工作流",
  "自动化",
];

const NEGATIVE_KEYWORDS = ["实习", "应届", "电话销售", "销售代表", "课程顾问", "招商", "保险", "客服专员", "行政前台", "直播运营", "司机"];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function slugify(input: string): string {
  const ascii = input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return ascii || "cn-job-diagnosis";
}

function norm(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function includesAny(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n.toLowerCase()));
}

function firstMatch(text: string, patterns: RegExp[], fallback = "待确认"): string {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m?.[1]) return norm(m[1]);
  }
  return fallback;
}

function inferSalary(text: string): string {
  return firstMatch(text, [
    /(\d{2,3}\s*[-~]\s*\d{2,3}\s*K\s*[·xX*]?\s*\d{0,2}\s*薪?)/i,
    /(\d{2,3}\s*[-~]\s*\d{2,3}\s*k)/i,
    /薪资[:：]?\s*([^\n，,；;]+)/i,
  ]);
}

function inferLocation(text: string): string {
  return firstMatch(text, [
    /(深圳|广州|杭州|上海|北京|成都|武汉|南京|苏州|远程|Remote)/i,
    /地点[:：]?\s*([^\n，,；;]+)/i,
  ]);
}

function inferRole(input: CnDiagnoseInput, text: string): string {
  if (input.role?.trim()) return input.role.trim();
  return firstMatch(text, [
    /^#?\s*([^\n]{2,48}(?:AI|Agent|智能体|产品|架构|创业伙伴)[^\n]{0,36})/i,
    /(AI\s*Agent[^\n，,；;]{0,36})/i,
    /岗位[:：]\s*([^\n，,；;]+)/i,
    /职位[:：]\s*([^\n，,；;]+)/i,
  ], "待确认岗位");
}

function inferCompany(input: CnDiagnoseInput, text: string): string {
  if (input.company?.trim()) return input.company.trim();
  return firstMatch(text, [
    /公司[:：]\s*([^\n，,；;]+)/i,
    /招聘者[\s\S]{0,80}?\n?([A-Za-z0-9\u4e00-\u9fa5]{2,24})\s*·\s*招聘者/i,
    /(usmile|字节跳动|腾讯|阿里|百度|月之暗面|智谱|MiniMax|DeepSeek|商汤|大疆|普渡)/i,
  ], "待确认公司");
}

function scoreFrom(text: string): number {
  const h = text.toLowerCase();
  let score = 3.0;
  if (/(ai\s*agent|agent|智能体)/i.test(h)) score += 0.45;
  if (/(创业伙伴|创始人|ceo|合伙人|一把手)/i.test(h)) score += 0.35;
  if (/(产品|架构|0-1|从0到1|mvp|落地|上线)/i.test(h)) score += 0.35;
  if (/(深圳)/i.test(h)) score += 0.15;
  if (/(\d{2,3}\s*[-~]\s*\d{2,3}\s*k)/i.test(h)) score += 0.2;
  if (/(独立开发|全栈|app|小程序|网站|codex|claude code|cursor)/i.test(h)) score += 0.2;
  if (includesAny(h, NEGATIVE_KEYWORDS)) score -= 0.8;
  if (/(合伙人|股权|期权)/i.test(h) && !/(\d{2,3}\s*[-~]\s*\d{2,3}\s*k)/i.test(h)) score -= 0.35;
  if (norm(text).length < 160) score -= 0.2;
  return Math.round(clamp(score, 1, 4.6) * 10) / 10;
}

function confidenceFrom(text: string): CnDiagnoseResult["confidence"] {
  if (norm(text).length > 420) return "high";
  if (norm(text).length > 120) return "medium";
  return "low";
}

export function diagnoseChinaJob(input: CnDiagnoseInput): CnDiagnoseResult {
  const text = norm([input.role, input.company, input.jdText].filter(Boolean).join("\n"));
  const role = inferRole(input, text);
  const company = inferCompany(input, text);
  const location = inferLocation(text);
  const salary = inferSalary(text);
  const score = scoreFrom(text);
  const confidence = confidenceFrom(text);
  const aiNativeFit = includesAny(text, ["AI Agent", "agent", "智能体", "大模型", "AI"]);
  const founderFit = includesAny(text, ["创业伙伴", "创始人", "CEO", "合伙人", "一把手"]);
  const productFit = includesAny(text, ["产品", "架构", "MVP", "0-1", "从0到1", "落地"]);
  const positiveSignals = [
    aiNativeFit ? "岗位出现 AI Agent / 智能体 / 大模型信号，贴近 AI Native 公司与团队搭建方向。" : "岗位与 AI 的直接关系需要继续确认。",
    founderFit ? "岗位靠近创始人、合伙人或创业团队，适合发挥高信任沟通与 AI 知识传导能力。" : "暂未看到明确创始人侧汇报线，需要追问。",
    productFit ? "岗位包含产品、架构、MVP 或落地语义，适合用产品+AI全栈交付闭环切入。" : "产品所有权尚不清晰，需要确认前三个月产出。",
    "你的优势可定义为 AI Native 全栈交付：从需求、架构拆解、实现、上线到迭代的完整闭环。",
  ];

  const risks = [
    "如果对方把“架构”理解成传统大厂式深度手写工程，而不是 AI Native 快速交付，需要确认技术期待是否匹配。",
    "JD 信息如果过短，产品方向、团队配置、融资/业务阶段、试用期和真实薪资结构都需要补齐。",
    "“创业伙伴 / 合伙人”可能隐藏股权、低底薪或超宽职责，需要先确认现金薪资与边界。",
    "如果出现年龄偏好，要把 12 年经验转译为成熟落地能力，而不是解释年龄。",
  ];

  const questions = [
    "目前想落地的 AI Agent 是内部效率、C 端用户，还是 B 端客户？",
    "团队现在有技术负责人、模型、后端或前端同事吗？",
    "这个岗位前三个月最重要的产出是什么？",
    "你们对“独立开发能力”的定义是什么，是快速上线 MVP，还是传统手写架构与长期工程维护？",
    "薪资是纯现金吗？是否包含绩效、股权、合伙人条件或试用期折扣？",
  ];

  const verdict = score >= 4.2 ? "强烈建议沟通" : score >= 3.8 ? "值得立即沟通" : score >= 3.2 ? "可以探底" : "谨慎观察";
  const scoreNote =
    score >= 4
      ? "核心方向匹配，关键是确认对方是否认可 AI Native 全栈交付，以及薪资、股权、试用期和团队边界是否清楚。"
      : "存在方向信号，但需要更多 JD 信息确认岗位边界、团队配置和真实薪资结构。";

  const openingMessage = `您好，我对这个${role === "待确认岗位" ? "岗位" : `「${role}」`}很感兴趣。

我是12年产品、ToB SaaS、企业数字化背景，最近持续使用 Claude Code、Codex、Cursor 做 AI Agent、个人网站、APP和小程序实践，可以独立把想法推进到可上线版本。我的优势不是只写需求，而是能把创始人/业务方的想法拆成场景、产品方案、Agent工作流和可运行产品。

想先了解一下：这个岗位目前更偏产品0-1、Agent架构设计，还是AI Native全栈落地？你们现在想做的 AI Agent 方向是什么？`;

  return {
    company,
    role,
    location,
    salary,
    score,
    verdict,
    scoreNote,
    positiveSignals,
    risks,
    questions,
    openingMessage,
    positioning: [
      "主打“AI Native 全栈交付”：能用 AI 工具独立上线网站、APP、小程序，把创始人的 AI 想法推进到可运行产品。",
      "不要陷入“谁手搓代码才叫全栈”的争论；把全栈定义为从需求、架构拆解、产品实现、上线到迭代的完整闭环。",
      "把 12 年经验表达为复杂业务理解、跨部门推进、ToB 场景落地和高上下文沟通能力。",
      "架构短板不回避，表达为可现学、可验证、可通过项目快速补齐的成长空间。",
    ],
    meters: [
      { label: "战略定位匹配", value: aiNativeFit && founderFit ? 90 : aiNativeFit ? 78 : 58 },
      { label: "产品/0-1空间", value: productFit ? 82 : 62 },
      { label: "AI全栈交付能力", value: 82 },
      { label: "信息完整度风险", value: confidence === "high" ? 28 : confidence === "medium" ? 48 : 72, tone: "risk" },
    ],
    decisionRules: [
      { label: `升到 ${Math.min(4.6, score + 0.3).toFixed(1)}`, body: "认可 AI 辅助全栈交付，目标是 AI Agent 产品 0-1、MVP 上线和创始人侧推进，现金薪资边界清楚。" },
      { label: `保持 ${score.toFixed(1)}`, body: "方向匹配，但产品、薪资、团队配置和“创业伙伴”的真实含义仍需继续确认。" },
      { label: `降到 ${Math.max(2.6, score - 1).toFixed(1)}`, body: "用“创业伙伴”模糊现金薪资、试用期和股权，或只需要传统手写工程架构而不接受 AI Native 工作方式。" },
    ],
    nextActions: ["先沟通，不急投递。", "问清团队配置与三个月产出。", "若对方回答具体，再写入求职进度。"],
    sourceSummary: input.screenshotNames?.length ? `岗位截图（${input.screenshotNames.length} 张）` : "JD 文本输入",
    confidence,
    slug: slugify(`${company}-${role}-${new Date().toISOString().slice(0, 10)}`),
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function list(items: string[], cls: string): string {
  return `<ul class="${cls}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

export function renderChinaDiagnosisHtml(result: CnDiagnoseResult, imageRels: string[] = []): string {
  const title = `${result.company} · ${result.role}`;
  const imageNames = imageRels.map((imageRel) => path.basename(imageRel));
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | 岗位诊断</title>
  <style>
    :root{--ink:#172126;--muted:#66717a;--paper:#f5f2eb;--panel:#fffdf8;--line:#d8d0c3;--cyan:#08b9b4;--red:#ff5a52;--green:#2f8f58;--gold:#b98221;--blue:#315f9d;--shadow:0 24px 70px rgba(44,35,22,.13)}
    *{box-sizing:border-box}body{margin:0;color:var(--ink);background:linear-gradient(90deg,rgba(25,33,38,.035) 1px,transparent 1px),linear-gradient(rgba(25,33,38,.035) 1px,transparent 1px),var(--paper);background-size:28px 28px;font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;letter-spacing:0}.page{width:min(1180px,calc(100vw - 36px));margin:28px auto 56px}.hero{display:grid;grid-template-columns:minmax(0,1.1fr) 340px;gap:18px}.panel{background:rgba(255,253,248,.94);border:1px solid rgba(216,208,195,.9);box-shadow:var(--shadow)}.brief{padding:28px;position:relative;overflow:hidden}.brief:before{content:"";position:absolute;inset:0 auto 0 0;width:7px;background:linear-gradient(180deg,var(--cyan),var(--red),var(--gold))}.eyebrow,.kicker{color:var(--muted);font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.kicker{margin-bottom:8px}h1{margin:14px 0;font-family:"Noto Serif SC","Songti SC","STSong",serif;font-size:clamp(34px,5vw,64px);line-height:1.05;letter-spacing:0}h2{margin:0 0 16px;font-size:19px;line-height:1.25}.subtitle{max-width:760px;color:#3c454b;font-size:18px;line-height:1.75}.meta{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}.tag{display:inline-flex;align-items:center;min-height:34px;padding:7px 12px;border:1px solid var(--line);background:#fbf7ef;color:#30383e;font-size:14px;font-weight:700}.score-card{padding:26px;display:grid;align-content:space-between;min-height:316px;background:#142027;color:#f9f6ef;border-color:#142027;box-shadow:0 24px 80px rgba(20,32,39,.26)}.score-label{color:rgba(249,246,239,.72);font-size:14px;font-weight:700;letter-spacing:.08em}.score{display:flex;align-items:baseline;gap:8px;margin:14px 0}.score strong{font-family:Georgia,"Times New Roman",serif;font-size:78px;line-height:.9;color:#fff6d7}.score span{color:rgba(249,246,239,.7);font-size:22px;font-weight:700}.verdict{border-top:1px solid rgba(249,246,239,.18);padding-top:18px;font-size:24px;font-weight:900;line-height:1.35}.score-note{color:rgba(249,246,239,.72);font-size:14px;line-height:1.7;margin-top:10px}.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:18px;margin-top:18px}.card{padding:22px}.span-5{grid-column:span 5}.span-6{grid-column:span 6}.span-7{grid-column:span 7}.span-12{grid-column:span 12}.screenshots{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;padding:12px;margin-top:18px}.screenshot{overflow:hidden;background:#e8edf0;padding:10px}.screenshot img{display:block;width:100%;height:auto;border:1px solid #dfe4e6}.signal-list,.risk-list,.questions{display:grid;gap:12px;margin:0;padding:0;list-style:none}.signal-list li,.risk-list li,.questions li{position:relative;padding:12px 12px 12px 42px;background:#fbf8f1;border:1px solid rgba(216,208,195,.82);min-height:46px;line-height:1.65;color:#30383e}.signal-list li:before,.risk-list li:before,.questions li:before{position:absolute;left:12px;top:12px;width:20px;height:20px;display:grid;place-items:center;color:#fff;font-size:12px;font-weight:900;border-radius:50%}.signal-list li:before{content:"+";background:var(--green)}.risk-list li:before{content:"!";background:var(--red)}.questions{counter-reset:q}.questions li{counter-increment:q}.questions li:before{content:counter(q);background:var(--blue)}.meter-group{display:grid;gap:16px}.meter-row{display:grid;gap:8px}.meter-head{display:flex;justify-content:space-between;gap:12px;color:#30383e;font-size:14px;font-weight:800}.meter{height:12px;background:#ebe4d8;border:1px solid #d6cab8;overflow:hidden}.meter>span{display:block;height:100%;background:linear-gradient(90deg,var(--cyan),var(--green))}.meter.risk>span{background:linear-gradient(90deg,var(--red),var(--gold))}.decision{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.decision-item{padding:16px;background:#fbf8f1;border:1px solid rgba(216,208,195,.82)}.decision-item b{display:block;margin-bottom:8px;color:var(--ink);font-size:15px}.decision-item p{margin:0;color:#48545c;font-size:14px;line-height:1.65}.script{position:relative;margin:0;padding:24px 24px 24px 32px;background:#12191f;color:#f8f4e9;border-left:7px solid var(--cyan);font-size:18px;line-height:1.8;white-space:pre-wrap;font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}.footer{margin-top:18px;padding:16px 0 0;color:var(--muted);font-size:13px;line-height:1.7;border-top:1px solid var(--line)}@media(max-width:900px){.hero,.decision{grid-template-columns:1fr}.span-5,.span-6,.span-7,.span-12{grid-column:1/-1}}@media(max-width:560px){.page{width:min(100vw - 22px,1180px);margin-top:12px}.brief,.score-card,.card{padding:18px}.score strong{font-size:64px}.script{font-size:16px;padding:18px}}
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <article class="panel brief">
        <div class="eyebrow">Job Diagnosis</div>
        <h1>${escapeHtml(result.role)}</h1>
        <p class="subtitle">${escapeHtml(result.scoreNote)}</p>
        <div class="meta">
          <span class="tag">${escapeHtml(result.company)}</span>
          <span class="tag">${escapeHtml(result.location)}</span>
          <span class="tag">${escapeHtml(result.salary)}</span>
          <span class="tag">confidence · ${result.confidence}</span>
        </div>
      </article>
      <aside class="panel score-card">
        <div><div class="score-label">QUICK SCORE</div><div class="score"><strong>${result.score.toFixed(1)}</strong><span>/ 5</span></div></div>
        <div><div class="verdict">${escapeHtml(result.verdict)}</div><div class="score-note">${escapeHtml(result.sourceSummary)}</div></div>
      </aside>
    </section>
    ${imageNames.length ? `<div class="panel screenshots">${imageNames.map((imageName, index) => `<div class="screenshot"><img src="${escapeHtml(imageName)}" alt="岗位截图 ${index + 1}"></div>`).join("")}</div>` : ""}
    <section class="grid">
      <article class="panel card span-7"><div class="kicker">Why It Matches</div><h2>正向信号</h2>${list(result.positiveSignals, "signal-list")}</article>
      <article class="panel card span-5"><div class="kicker">Fit Map</div><h2>匹配雷达</h2><div class="meter-group">${result.meters.map((m) => `<div class="meter-row"><div class="meter-head"><span>${escapeHtml(m.label)}</span><span>${m.value}%</span></div><div class="meter ${m.tone === "risk" ? "risk" : ""}"><span style="width:${m.value}%"></span></div></div>`).join("")}</div></article>
      <article class="panel card span-6"><div class="kicker">Risks</div><h2>剩余风险</h2>${list(result.risks, "risk-list")}</article>
      <article class="panel card span-6"><div class="kicker">Decision Rule</div><h2>沟通后的分流规则</h2><div class="decision">${result.decisionRules.map((r) => `<div class="decision-item"><b>${escapeHtml(r.label)}</b><p>${escapeHtml(r.body)}</p></div>`).join("")}</div></article>
      <article class="panel card span-5"><div class="kicker">Questions</div><h2>必须追问</h2><ol class="questions">${result.questions.map((q) => `<li>${escapeHtml(q)}</li>`).join("")}</ol></article>
      <article class="panel card span-7"><div class="kicker">Opening Message</div><h2>BOSS 首轮沟通话术</h2><pre class="script">${escapeHtml(result.openingMessage)}</pre></article>
      <article class="panel card span-12"><div class="kicker">Positioning</div><h2>你在这个岗位里的最佳表达</h2>${list(result.positioning, "signal-list")}<div class="footer">自动诊断基于当前选中的输入方式生成。若截图缺少完整 JD，请补充更多连续截图后重新分析。沟通后再决定是否写入正式 tracker。</div></article>
    </section>
  </main>
</body>
</html>`;
}
