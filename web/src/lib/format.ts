// Pure, node-free helpers shared by server and client components (no fs/path
// imports here — career-one.ts holds the filesystem reads). Aligned with the
// core: normalize-statuses.mjs (aliases) + the Go TUI dashboard (score/status
// colours = the current state-of-the-art).

// Spanish + legacy aliases → canonical English tokens (normalize-statuses.mjs).
const STATUS_ALIAS: Record<string, string> = {
  "已评估": "EVALUATED",
  "已投递": "APPLIED",
  "已回复": "RESPONDED",
  "面试中": "INTERVIEW",
  "已获 offer": "OFFER",
  "被拒": "REJECTED",
  "已放弃": "DISCARDED",
  "跳过": "SKIP",
  evaluada: "EVALUATED",
  evaluado: "EVALUATED",
  condicional: "EVALUATED",
  hold: "EVALUATED",
  evaluar: "EVALUATED",
  verificar: "EVALUATED",
  aplicada: "APPLIED",
  aplicado: "APPLIED",
  enviada: "APPLIED",
  sent: "APPLIED",
  respondida: "RESPONDED",
  respondido: "RESPONDED",
  contestada: "RESPONDED",
  entrevista: "INTERVIEW",
  oferta: "OFFER",
  rechazada: "REJECTED",
  rechazado: "REJECTED",
  descartada: "DISCARDED",
  descartado: "DISCARDED",
  cerrada: "DISCARDED",
  cancelada: "DISCARDED",
  duplicado: "DISCARDED",
  repost: "DISCARDED",
  monitor: "SKIP",
  no_aplicar: "SKIP",
  "no aplicar": "SKIP",
};

export const CANONICAL_STATES = [
  "Evaluated",
  "Applied",
  "Responded",
  "Interview",
  "Offer",
  "Rejected",
  "Discarded",
  "SKIP",
] as const;

export const CANONICAL_STATE_LABELS: Record<(typeof CANONICAL_STATES)[number], string> = {
  Evaluated: "已评估",
  Applied: "已投递",
  Responded: "已回复",
  Interview: "面试中",
  Offer: "已获 Offer",
  Rejected: "被拒",
  Discarded: "已放弃",
  SKIP: "跳过",
};

const EVALUATION_INTENTS = new Set(["evaluate", "evaluate-job"]);

/** Agent run intent is the authoritative task taxonomy; titles are user-facing
 * text and may mention an evaluation report for unrelated work such as a CV. */
export function isEvaluationIntent(intent: string | null | undefined): boolean {
  return EVALUATION_INTENTS.has((intent ?? "").trim().toLowerCase());
}

const USER_MESSAGE_TRANSLATIONS: Record<string, string> = {
  "The CLI produced no output — is it installed and authenticated?":
    "Agent CLI 没有返回任何内容。请确认所选 CLI 已安装并完成登录，然后重试。",
  "The CLI exited with an error — is it installed and authenticated?":
    "Agent CLI 异常退出。请确认所选 CLI 已安装并完成登录，然后重试。",
  "This evaluation didn't save a report, so it's not in your tracker. Check that the selected CLI can write to the workspace.":
    "本次岗位评估未保存报告，因此没有加入求职进度。请确认所选 CLI 拥有当前工作区的写入权限，然后重试。",
  "This run hit an error before finishing, so it isn't recorded as a confident result — re-run it to verify.":
    "本次任务在完成前发生错误，结果未被记录。请重试以确认结果。",
  "Interrupted (page reloaded)": "页面重新加载，任务已中断",
  "Failed to start": "任务启动失败，请重试",
  "Connection error": "连接中断，请检查 Agent CLI 后重试",
  "Agent ready": "Agent 已就绪",
  Done: "任务已完成",
  Error: "任务执行失败",
  "_(no output — is the CLI authenticated?)_": "_(Agent CLI 没有返回内容，请确认所选 CLI 已完成登录。)_",
};

/** Translate product-authored legacy feedback at render time so historical
 * tasks saved before the Chinese UI migration do not keep leaking English. */
export function localizeUserMessage(message: string): string {
  const normalized = message.trim();
  const exact = USER_MESSAGE_TRANSLATIONS[normalized];
  if (exact) return exact;
  const missingCli = normalized.match(/^CLI '([^']+)' not found(?: on this machine)?$/);
  if (missingCli) return `未找到 Agent CLI“${missingCli[1]}”，请先安装或在设置中选择其他 CLI。`;
  return message;
}

const REPORT_SECTION_PREVIEW_LENGTH = 96;
const ORDERED_LIST_ITEM = /^\s*\d+\s*[.)、）]\s*(.*)$/;

/** Collapsed report-card summary. Plain content keeps the existing leading-text
 * behavior; ordered lists use only their first item before the shared limit. */
export function reportSectionPreview(md: string): string {
  const meaningfulLines = md
    .replace(/```[\s\S]*?```/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^#+\s/.test(line));
  const firstNumberedItem = meaningfulLines[0]?.match(ORDERED_LIST_ITEM);
  const source = firstNumberedItem ? firstNumberedItem[1] : meaningfulLines.join(" ");
  const text = source
    .replace(/[*_`>#|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const sentence = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return sentence.length > REPORT_SECTION_PREVIEW_LENGTH
    ? sentence.slice(0, REPORT_SECTION_PREVIEW_LENGTH).trimEnd() + "…"
    : sentence;
}

export function canonStatus(s: string): string {
  const k = s.trim().toLowerCase();
  if (k === "" || k === "—" || k === "-") return "DISCARDED";
  return STATUS_ALIAS[k] ?? s.toUpperCase();
}

/** Status dot colour, mirroring the Go TUI: green interview/offer, sky applied/
 *  responded, red skip/rejected, gray discarded, neutral evaluated. */
export function statusDot(status: string): string {
  const c = canonStatus(status);
  if (c.includes("INTERVIEW") || c.includes("OFFER")) return "bg-success-solid";
  if (c.includes("APPLIED") || c.includes("RESPONDED")) return "bg-info-solid";
  if (c.includes("REJECTED") || c.includes("SKIP")) return "bg-danger-solid";
  if (c.includes("DISCARDED")) return "bg-muted";
  return "bg-faint"; // Evaluated / unknown
}

/** First number in a score string ("4.1/5", "B+", "3.0") → numeric, or NaN. */
export function scoreNum(s: string): number {
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : NaN;
}

/** Score → tone, mirroring the Go TUI thresholds (>=4.2 green, >=3.8 yellow,
 *  >=3.0 normal, <3.0 red). */
export function scoreTone(score: string): "good" | "warn" | "bad" | "muted" {
  const num = scoreNum(score);
  if (!Number.isNaN(num)) {
    if (num >= 4.2) return "good";
    if (num >= 3.8) return "warn";
    if (num >= 3.0) return "muted";
    return "bad";
  }
  const g = score.trim().toUpperCase()[0];
  if (g === "A") return "good";
  if (g === "B") return "warn";
  if (g === "C") return "muted";
  if (g === "D" || g === "E" || g === "F") return "bad";
  return "muted";
}

/** Block-G legitimacy tier → tone. */
export function legitimacyTone(l: string): "good" | "warn" | "bad" | "muted" {
  const s = l.toLowerCase();
  if (s.includes("high") || s.includes("confian") || s.includes("legit") || s.includes("高置信")) return "good";
  if (s.includes("caution") || s.includes("precau") || s.includes("caut") || s.includes("谨慎")) return "warn";
  if (s.includes("suspic") || s.includes("sospech") || s.includes("scam") || s.includes("fake") || s.includes("疑似") || s.includes("虚假")) return "bad";
  return "muted";
}

export function legitimacyLabel(l: string): string {
  const s = l.trim().toLowerCase();
  if (s.includes("high confidence") || s.includes("alta confianza") || s.includes("高置信")) return "高置信度";
  if (s.includes("proceed with caution") || s.includes("caution") || s.includes("precau") || s.includes("谨慎")) return "谨慎推进";
  if (s.includes("suspicious") || s.includes("sospech") || s.includes("scam") || s.includes("fake") || s.includes("疑似") || s.includes("虚假")) return "疑似虚假或已过期";
  return l;
}

export type ReportMeta = {
  title: string | null;
  fields: { label: string; value: string }[];
  legitimacy: string | null;
  body: string;
};

const FIELD_KEYS: Record<string, string> = {
  date: "Date",
  fecha: "Date",
  url: "URL",
  archetype: "Archetype",
  arquetipo: "Archetype",
  score: "Score",
  legitimacy: "Legitimacy",
  legitimidad: "Legitimacy",
  pdf: "PDF",
  screenshots: "Screenshots",
};

/**
 * Tolerant report parser (per maintainer: adapt the render, don't migrate the
 * old data). Extracts the bold key/value header fields (Date/URL/Archetype/
 * Score/Legitimacy/PDF/Screenshots) when present and returns the body without the header
 * block. Degrades gracefully on legacy reports that lack some fields.
 */
export function parseReport(md: string): ReportMeta {
  const lines = md.split("\n");
  // Header runs until the first `---` or the first `## ` section.
  let cut = lines.findIndex((l, i) => i > 0 && (/^\s*-{3,}\s*$/.test(l) || /^##\s/.test(l)));
  if (cut === -1) cut = Math.min(lines.length, 10);

  const headerLines = lines.slice(0, cut);
  let bodyStart = cut;
  if (/^\s*-{3,}\s*$/.test(lines[cut] ?? "")) bodyStart = cut + 1;
  const body = lines.slice(bodyStart).join("\n").trim();

  let title: string | null = null;
  let legitimacy: string | null = null;
  const fields: { label: string; value: string }[] = [];

  for (const l of headerLines) {
    const h = l.match(/^#\s+(.+)/);
    if (h) {
      title = h[1].replace(/^Evaluat?i[oó]n:?\s*/i, "").trim();
      continue;
    }
    const m = l.match(/^\s*\*\*(.+?):\*\*\s*(.*)$/);
    if (!m) continue;
    const label = FIELD_KEYS[m[1].trim().toLowerCase()];
    const value = m[2].trim();
    if (!label || !value) continue;
    if (label === "Legitimacy") legitimacy = value;
    fields.push({ label, value });
  }

  return { title, fields, legitimacy, body: body || md };
}
