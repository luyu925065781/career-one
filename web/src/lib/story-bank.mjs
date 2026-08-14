/**
 * Parse the user-owned interview-prep/story-bank.md file.
 *
 * The format stays deliberately plain Markdown so both people and local Agents
 * can maintain it without a database or a web-only schema.
 */

const DEFAULT_TITLE = "面试故事库";
const COMPLETED_STATUS = "已完善";
const LEGACY_COMPLETED_STATUS = "可使用";
const UNRESOLVED_MARKER = /(?:待确认|待完善|待补充|需要补充|TODO)/i;
const PENDING_PROMPT = /^待确认\s*[：:]\s*/i;
const SECTION_KEY = {
  S: "situation",
  T: "task",
  A: "action",
  R: "result",
  Reflection: "reflection",
};

function splitTags(value) {
  return value.split(/[、,，]/).map((item) => item.trim()).filter(Boolean);
}

function splitQuestions(value) {
  return value.split(/[；;]/).map((item) => item.trim()).filter(Boolean);
}

function normalizeStoryStatus(value) {
  const status = String(value ?? "").trim();
  return status === LEGACY_COMPLETED_STATUS ? COMPLETED_STATUS : status;
}

/**
 * @param {string} id
 * @param {string} title
 * @returns {{
 *   id: string, title: string, status: string, tags: string[], questions: string[],
 *   source: string, updatedAt: string, situation: string[], task: string[],
 *   action: string[], result: string[], reflection: string[]
 * }}
 */
function emptyStory(id, title) {
  return {
    id,
    title,
    status: "待完善",
    tags: [],
    questions: [],
    source: "",
    updatedAt: "",
    situation: [],
    task: [],
    action: [],
    result: [],
    reflection: [],
  };
}

function hasSubstantiveLines(lines) {
  return Array.isArray(lines)
    && lines.some((line) => {
      const value = String(line ?? "").trim();
      return value.length > 0 && !UNRESOLVED_MARKER.test(value);
    });
}

/**
 * A generated story is only a draft. It becomes interview-ready after every
 * STAR+Reflection section contains confirmed facts, the source is traceable,
 * no unresolved markers remain, and the user explicitly marks the final draft
 * as 已完善. Historical 可使用 values remain readable for compatibility.
 *
 * @param {ReturnType<typeof emptyStory>} story
 * @returns {{
 *   ready: boolean,
 *   checks: Array<{id: string, label: string, passed: boolean}>,
 *   missingChecks: Array<{id: string, label: string, passed: boolean}>,
 *   pendingPrompts: string[],
 *   hasUnresolved: boolean,
 * }}
 */
export function assessStoryReadiness(story) {
  const sectionLines = [
    ...(story?.situation ?? []),
    ...(story?.task ?? []),
    ...(story?.action ?? []),
    ...(story?.result ?? []),
    ...(story?.reflection ?? []),
  ];
  const pendingPrompts = sectionLines
    .map((line) => String(line ?? "").trim())
    .filter((line) => PENDING_PROMPT.test(line))
    .map((line) => line.replace(PENDING_PROMPT, "").trim())
    .filter(Boolean);
  const hasUnresolved = [...sectionLines, story?.source ?? ""]
    .some((value) => UNRESOLVED_MARKER.test(String(value)));
  const checks = [
    { id: "situation", label: "补充清晰的情境", passed: hasSubstantiveLines(story?.situation) },
    { id: "task", label: "明确目标与本人责任", passed: hasSubstantiveLines(story?.task) },
    { id: "action", label: "补充具体行动与取舍", passed: hasSubstantiveLines(story?.action) },
    { id: "result", label: "确认结果与统计口径", passed: hasSubstantiveLines(story?.result) },
    { id: "reflection", label: "补充真实复盘", passed: hasSubstantiveLines(story?.reflection) },
    {
      id: "source",
      label: "补充可追溯的事实来源",
      passed: Boolean(String(story?.source ?? "").trim()) && !UNRESOLVED_MARKER.test(String(story?.source ?? "")),
    },
    { id: "unresolved", label: "补齐所有待确认事实", passed: !hasUnresolved },
    {
      id: "confirmed",
      label: "确认最终故事草稿",
      passed: normalizeStoryStatus(story?.status) === COMPLETED_STATUS,
    },
  ];
  const missingChecks = checks.filter((check) => !check.passed);

  return {
    ready: missingChecks.length === 0,
    checks,
    missingChecks,
    pendingPrompts,
    hasUnresolved,
  };
}

/**
 * @param {string} markdown
 * @returns {{title: string, stories: Array<{
 *   id: string,
 *   title: string,
 *   status: string,
 *   tags: string[],
 *   questions: string[],
 *   source: string,
 *   updatedAt: string,
 *   situation: string[],
 *   task: string[],
 *   action: string[],
 *   result: string[],
 *   reflection: string[],
 * }>}}
 */
export function parseStoryBank(markdown) {
  if (!markdown?.trim()) return { title: DEFAULT_TITLE, stories: [] };

  let title = DEFAULT_TITLE;
  const stories = [];
  let current = null;
  let section = null;

  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    const bankHeading = line.match(/^#\s+(.+)$/);
    if (bankHeading && !line.startsWith("##")) {
      title = bankHeading[1].trim() || DEFAULT_TITLE;
      continue;
    }

    const storyHeading = line.match(/^##\s+(S\d+)\s*[·|-]\s*(.+)$/i);
    if (storyHeading) {
      current = emptyStory(storyHeading[1].toUpperCase(), storyHeading[2].trim());
      stories.push(current);
      section = null;
      continue;
    }
    if (!current) continue;

    const sectionHeading = line.match(/^###\s+(S|T|A|R|Reflection)\b/i);
    if (sectionHeading) {
      const rawKey = sectionHeading[1];
      const normalized = rawKey.toLowerCase() === "reflection" ? "Reflection" : rawKey.toUpperCase();
      section = SECTION_KEY[normalized];
      continue;
    }

    const metadata = line.match(/^-\s+\*\*(状态|能力标签|适用问题|事实来源|更新日期)：\*\*\s*(.+)$/);
    if (metadata) {
      const [, key, value] = metadata;
      if (key === "状态") current.status = normalizeStoryStatus(value);
      if (key === "能力标签") current.tags = splitTags(value);
      if (key === "适用问题") current.questions = splitQuestions(value);
      if (key === "事实来源") current.source = value.trim();
      if (key === "更新日期") current.updatedAt = value.trim();
      continue;
    }

    if (section) current[section].push(line.replace(/^[-*]\s+/, ""));
  }

  stories.sort((a, b) => {
    const dateOrder = b.updatedAt.localeCompare(a.updatedAt);
    if (dateOrder !== 0) return dateOrder;
    return b.id.localeCompare(a.id, undefined, { numeric: true });
  });

  return { title, stories };
}

/**
 * Validate the human/Agent editable Markdown before it replaces the user-owned
 * story bank. Incomplete STAR sections are allowed (that is what 待完善 means),
 * but the document identity and story headings must remain machine-readable.
 *
 * @param {string} markdown
 * @returns {{ok: true} | {ok: false, error: string}}
 */
export function validateStoryBankMarkdown(markdown) {
  if (typeof markdown !== "string" || !markdown.trim()) {
    return { ok: false, error: "故事库不能为空。" };
  }
  const firstLine = markdown.trimStart().split(/\r?\n/, 1)[0].trim();
  if (firstLine !== "# 面试故事库") {
    return { ok: false, error: "一级标题必须是“# 面试故事库”。" };
  }

  const headings = [...markdown.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
  const malformed = headings.find((heading) => !/^S\d+\s*[·|-]\s*.+$/i.test(heading));
  if (malformed) {
    return { ok: false, error: `故事标题“${malformed}”不符合“## S01 · 标题”格式。` };
  }

  const parsed = parseStoryBank(markdown);
  if (parsed.stories.length !== headings.length) {
    return { ok: false, error: "部分故事标题无法解析，请检查编号和分隔符。" };
  }
  const ids = new Set();
  for (const story of parsed.stories) {
    if (ids.has(story.id)) return { ok: false, error: `故事编号重复：${story.id}。` };
    ids.add(story.id);
  }
  return { ok: true };
}

function cleanInline(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function cleanLines(value) {
  const values = Array.isArray(value) ? value : String(value ?? "").split(/\r?\n/);
  return values.map((line) => cleanInline(line).replace(/^[-*]\s+/, "")).filter(Boolean);
}

/**
 * Serialize one story, without the document-level heading. This is the only
 * payload accepted by the per-story editor and Agent action.
 *
 * @param {ReturnType<typeof emptyStory>} story
 * @returns {string}
 */
export function serializeStoryMarkdown(story) {
  const id = cleanInline(story?.id).toUpperCase();
  const title = cleanInline(story?.title);
  const metadata = [
    ["状态", normalizeStoryStatus(cleanInline(story?.status)) || "待完善"],
    ["能力标签", cleanLines(story?.tags).join("、")],
    ["适用问题", cleanLines(story?.questions).join("；")],
    ["事实来源", cleanInline(story?.source)],
    ["更新日期", cleanInline(story?.updatedAt)],
  ].filter(([, value]) => value);
  const sections = [
    ["S 情境", cleanLines(story?.situation)],
    ["T 任务", cleanLines(story?.task)],
    ["A 行动", cleanLines(story?.action)],
    ["R 结果", cleanLines(story?.result)],
    ["Reflection 反思", cleanLines(story?.reflection)],
  ];

  const parts = [
    `## ${id} · ${title}`,
    metadata.map(([label, value]) => `- **${label}：** ${value}`).join("\n"),
    ...sections.map(([heading, lines]) => {
      const content = lines.length > 0 ? lines.map((line) => `- ${line}`).join("\n") : "";
      return `### ${heading}\n\n${content}`.trimEnd();
    }),
  ];
  return parts.join("\n\n").trim();
}

/**
 * Validate a single story block and, when supplied, require its immutable ID.
 *
 * @param {string} storyMarkdown
 * @param {string} [expectedId]
 * @returns {{ok: true} | {ok: false, error: string}}
 */
export function validateStoryMarkdown(storyMarkdown, expectedId) {
  if (typeof storyMarkdown !== "string" || !storyMarkdown.trim()) {
    return { ok: false, error: "故事内容不能为空。" };
  }
  const trimmed = storyMarkdown.trim();
  if (!/^##\s+S\d+\s*[·|-]\s*.+$/im.test(trimmed.split(/\r?\n/, 1)[0])) {
    return { ok: false, error: "故事必须以“## S01 · 标题”开头。" };
  }
  if (/^#\s+/m.test(trimmed)) {
    return { ok: false, error: "单个故事不能包含故事库一级标题。" };
  }
  const headings = [...trimmed.matchAll(/^##\s+(.+)$/gm)];
  if (headings.length !== 1) {
    return { ok: false, error: "单次维护只能包含一个故事。" };
  }
  const wrapped = `# 面试故事库\n\n${trimmed}\n`;
  const bankValidation = validateStoryBankMarkdown(wrapped);
  if (!bankValidation.ok) return bankValidation;
  const [story] = parseStoryBank(wrapped).stories;
  const normalizedExpected = cleanInline(expectedId).toUpperCase();
  if (normalizedExpected && story.id !== normalizedExpected) {
    return { ok: false, error: `故事编号必须是 ${normalizedExpected}，不能改为 ${story.id}。` };
  }
  return { ok: true };
}

/**
 * Merge one validated story block into the full document while preserving the
 * prefix and every non-target story byte-for-byte.
 *
 * @param {string} markdown
 * @param {string} storyId
 * @param {string} storyMarkdown
 * @returns {string}
 */
export function replaceStoryInMarkdown(markdown, storyId, storyMarkdown) {
  const normalizedId = cleanInline(storyId).toUpperCase();
  if (!/^S\d+$/.test(normalizedId)) throw new Error("故事编号无效。");
  const headings = [...String(markdown ?? "").matchAll(/^##\s+(S\d+)\s*[·|-]\s*.+$/gmi)];
  const targetIndex = headings.findIndex((match) => match[1].toUpperCase() === normalizedId);
  if (targetIndex < 0) throw new Error(`故事 ${normalizedId} 不存在，请刷新页面后重试。`);
  const validation = validateStoryMarkdown(storyMarkdown, normalizedId);
  if (!validation.ok) throw new Error(validation.error);

  const start = headings[targetIndex].index;
  const end = headings[targetIndex + 1]?.index ?? markdown.length;
  const currentBlock = markdown.slice(start, end);
  const trailing = currentBlock.match(/(?:\r?\n[\t ]*)+$/)?.[0] ?? "\n";
  return `${markdown.slice(0, start)}${storyMarkdown.trim()}${trailing}${markdown.slice(end)}`;
}
