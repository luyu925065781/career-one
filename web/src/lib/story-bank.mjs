/**
 * Parse the user-owned interview-prep/story-bank.md file.
 *
 * The format stays deliberately plain Markdown so both people and local Agents
 * can maintain it without a database or a web-only schema.
 */

const DEFAULT_TITLE = "面试故事库";
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
      if (key === "状态") current.status = value.trim();
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
