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

export function slugify(input: string): string {
  const ascii = input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return ascii || "cn-job-diagnosis";
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
        <div><div class="score-label">AI 匹配评分</div><div class="score"><strong>${result.score.toFixed(1)}</strong><span>/ 5</span></div></div>
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
      <article class="panel card span-7"><div class="kicker">Interview Opener</div><h2>面试开场话术</h2><pre class="script">${escapeHtml(result.openingMessage)}</pre></article>
      <article class="panel card span-12"><div class="kicker">Positioning</div><h2>你在这个岗位里的最佳表达</h2>${list(result.positioning, "signal-list")}<div class="footer">AI 诊断基于当前岗位输入与工作区内已确认的用户事实生成。若截图缺少完整 JD，请补充更多连续截图后重新分析。沟通后再决定是否写入正式 tracker。</div></article>
    </section>
  </main>
</body>
</html>`;
}
