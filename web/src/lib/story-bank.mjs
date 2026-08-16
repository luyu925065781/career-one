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
const METADATA_KEYS = ["状态", "能力标签", "适用问题", "事实来源", "更新日期"];

function isWhitespace(character) {
  return Boolean(character) && character.trim() === "";
}

function headingContent(line, marker) {
  if (!line.startsWith(marker) || !isWhitespace(line[marker.length])) return null;
  return line.slice(marker.length).trimStart();
}

function parseStoryHeadingContent(content) {
  const value = String(content ?? "").trim();
  if (value[0]?.toUpperCase() !== "S") return null;

  let cursor = 1;
  const digitStart = cursor;
  while (cursor < value.length && value.charCodeAt(cursor) >= 48 && value.charCodeAt(cursor) <= 57) {
    cursor += 1;
  }
  if (cursor === digitStart) return null;
  const id = value.slice(0, cursor).toUpperCase();

  while (cursor < value.length && isWhitespace(value[cursor])) cursor += 1;
  if (!["·", "|", "-"].includes(value[cursor])) return null;
  cursor += 1;
  while (cursor < value.length && isWhitespace(value[cursor])) cursor += 1;

  const title = value.slice(cursor).trim();
  return title ? { id, title } : null;
}

function parseStoryHeadingLine(line) {
  const content = headingContent(line, "##");
  return content === null ? null : parseStoryHeadingContent(content);
}

function parseSectionHeadingLine(line) {
  const content = headingContent(line, "###");
  if (content === null) return null;
  for (const key of Object.keys(SECTION_KEY)) {
    if (content.slice(0, key.length).toLowerCase() !== key.toLowerCase()) continue;
    const boundary = content[key.length];
    if (boundary && /[0-9A-Za-z_]/.test(boundary)) continue;
    return SECTION_KEY[key];
  }
  return null;
}

function parseMetadataLine(line) {
  if (line[0] !== "-" || !isWhitespace(line[1])) return null;
  const content = line.slice(1).trimStart();
  for (const key of METADATA_KEYS) {
    const prefix = `**${key}：**`;
    if (!content.startsWith(prefix)) continue;
    const value = content.slice(prefix.length).trim();
    return value ? { key, value } : null;
  }
  return null;
}

function removeBullet(line) {
  return ["-", "*"].includes(line[0]) && isWhitespace(line[1])
    ? line.slice(1).trimStart()
    : line;
}

function markdownLines(markdown) {
  const text = String(markdown ?? "");
  const lines = [];
  let start = 0;
  while (start <= text.length) {
    const newline = text.indexOf("\n", start);
    const end = newline === -1 ? text.length : newline;
    const raw = text.slice(start, end);
    lines.push({ raw: raw.endsWith("\r") ? raw.slice(0, -1) : raw, index: start });
    if (newline === -1) break;
    start = newline + 1;
  }
  return lines;
}

function storyHeadings(markdown) {
  return markdownLines(markdown).flatMap(({ raw, index }) => {
    const parsed = parseStoryHeadingLine(raw.trim());
    return parsed ? [{ ...parsed, index }] : [];
  });
}

function isStoryId(value) {
  if (value.length < 2 || value[0] !== "S") return false;
  for (let index = 1; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 48 || code > 57) return false;
  }
  return true;
}

function trailingBlockWhitespace(block) {
  let cursor = block.length;
  while (cursor > 0 && ["\r", "\n", "\t", " "].includes(block[cursor - 1])) cursor -= 1;
  const trailing = block.slice(cursor);
  return trailing.includes("\n") ? trailing : "\n";
}

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

  for (const { raw } of markdownLines(markdown)) {
    const line = raw.trim();
    if (!line) continue;

    const bankHeading = headingContent(line, "#");
    if (bankHeading !== null) {
      title = bankHeading.trim() || DEFAULT_TITLE;
      continue;
    }

    const storyHeading = parseStoryHeadingLine(line);
    if (storyHeading) {
      current = emptyStory(storyHeading.id, storyHeading.title);
      stories.push(current);
      section = null;
      continue;
    }
    if (!current) continue;

    const sectionHeading = parseSectionHeadingLine(line);
    if (sectionHeading) {
      section = sectionHeading;
      continue;
    }

    const metadata = parseMetadataLine(line);
    if (metadata) {
      const { key, value } = metadata;
      if (key === "状态") current.status = normalizeStoryStatus(value);
      if (key === "能力标签") current.tags = splitTags(value);
      if (key === "适用问题") current.questions = splitQuestions(value);
      if (key === "事实来源") current.source = value.trim();
      if (key === "更新日期") current.updatedAt = value.trim();
      continue;
    }

    if (section) current[section].push(removeBullet(line));
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
  const firstLine = markdownLines(markdown.trimStart())[0]?.raw.trim() ?? "";
  if (firstLine !== "# 面试故事库") {
    return { ok: false, error: "一级标题必须是“# 面试故事库”。" };
  }

  const headings = markdownLines(markdown).flatMap(({ raw }) => {
    const content = headingContent(raw.trim(), "##");
    return content === null ? [] : [content.trim()];
  });
  const malformed = headings.find((heading) => !parseStoryHeadingContent(heading));
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
  let cleaned = "";
  let pendingSpace = false;
  for (const character of String(value ?? "")) {
    if (isWhitespace(character)) {
      pendingSpace = cleaned.length > 0;
      continue;
    }
    if (pendingSpace) cleaned += " ";
    cleaned += character;
    pendingSpace = false;
  }
  return cleaned;
}

function cleanLines(value) {
  const values = Array.isArray(value)
    ? value
    : markdownLines(String(value ?? "")).map(({ raw }) => raw);
  return values.map((line) => removeBullet(cleanInline(line))).filter(Boolean);
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
  if (!parseStoryHeadingLine(markdownLines(trimmed)[0]?.raw.trim() ?? "")) {
    return { ok: false, error: "故事必须以“## S01 · 标题”开头。" };
  }
  if (markdownLines(trimmed).some(({ raw }) => headingContent(raw.trim(), "#") !== null)) {
    return { ok: false, error: "单个故事不能包含故事库一级标题。" };
  }
  const headings = markdownLines(trimmed).filter(({ raw }) => headingContent(raw.trim(), "##") !== null);
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
  if (!isStoryId(normalizedId)) throw new Error("故事编号无效。");
  const headings = storyHeadings(markdown);
  const targetIndex = headings.findIndex((heading) => heading.id === normalizedId);
  if (targetIndex < 0) throw new Error(`故事 ${normalizedId} 不存在，请刷新页面后重试。`);
  const validation = validateStoryMarkdown(storyMarkdown, normalizedId);
  if (!validation.ok) throw new Error(validation.error);

  const start = headings[targetIndex].index;
  const end = headings[targetIndex + 1]?.index ?? markdown.length;
  const currentBlock = markdown.slice(start, end);
  const trailing = trailingBlockWhitespace(currentBlock);
  return `${markdown.slice(0, start)}${storyMarkdown.trim()}${trailing}${markdown.slice(end)}`;
}
