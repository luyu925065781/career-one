#!/usr/bin/env node

/**
 * match-star.mjs — Zero-LLM, zero-browser ATS behavioural question matcher.
 *
 * Parses interview-prep/story-bank.md, scores each STAR story against the
 * question text (and optionally a JD file), and returns the top match(es)
 * formatted to an ATS-friendly paste length, with locale-aware length hints.
 *
 * Usage:
 *   node career-one.mjs star "Tell me about a time you led a project under pressure"
 *   node career-one.mjs star "Describe a conflict you resolved" --jd jds/acme.md
 *   node career-one.mjs star "Give an example of handling ambiguity" --top 2
 *   node career-one.mjs star --list    # list all stories with their tags
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { parseStoryBank } from '../../web/src/lib/story-bank.mjs';

// ── Config ──────────────────────────────────────────────────────────

const STORY_BANK_PATH = 'interview-prep/story-bank.md';

const args       = process.argv.slice(2);
const LIST_MODE  = args.includes('--list');
const jdFlag     = args.indexOf('--jd');
const jdPath     = jdFlag !== -1 ? args[jdFlag + 1] : null;
const topFlag    = args.indexOf('--top');
const topRaw     = topFlag !== -1 ? parseInt(args[topFlag + 1], 10) : NaN;
const TOP_N      = Number.isInteger(topRaw) && topRaw > 0 ? topRaw : 1;
// Exclude flag operands by index position, not by value, to preserve repeated text in the question
const excludeIdx = new Set([
  ...(jdFlag  !== -1 ? [jdFlag + 1]  : []),
  ...(topFlag !== -1 ? [topFlag + 1] : []),
]);
const question = args
  .filter((a, i) => !a.startsWith('--') && !excludeIdx.has(i))
  .join(' ').trim();

// ── Parser ───────────────────────────────────────────────────────────

/**
 * Parse story-bank.md into structured story objects.
 * @param {string} content
 * @returns {Array<{title, theme, source, situation, task, action, result, reflection, tags}>}
 */
function parseStories(content) {
  // 择程AI的中文 Markdown 是当前格式；映射到既有匹配器契约，避免网页
  // 和 CLI 各维护一套故事库解析逻辑。旧 career-one 格式继续向后兼容。
  const bank = parseStoryBank(content);
  if (bank.stories.length > 0) {
    return bank.stories.map((story) => ({
      title: story.title,
      theme: story.id,
      source: story.source,
      situation: story.situation.join(' '),
      task: story.task.join(' '),
      action: story.action.join(' '),
      result: story.result.join(' '),
      reflection: story.reflection.join(' '),
      tags: [...story.tags, ...story.questions].map((tag) => tag.toLowerCase()),
    }));
  }

  const stories = [];
  // Split on story headings: ### [Theme] Title
  const blocks = content.split(/^### /m).slice(1);

  for (const block of blocks) {
    const lines  = block.trim().split('\n');
    const header = lines[0].trim();

    // Extract theme from [Theme] prefix if present
    const themeMatch = header.match(/^\[([^\]]+)\]\s*(.+)/);
    const theme = themeMatch ? themeMatch[1].trim() : '';
    const title = themeMatch ? themeMatch[2].trim() : header;

    const get = (label) => {
      const re  = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`);
      const hit = block.match(re);
      return hit ? hit[1].trim() : '';
    };

    const tagsRaw = get('Best for questions about');
    const tags    = tagsRaw
      ? tagsRaw.split(/[,;]/).map(t => t.trim().toLowerCase()).filter(Boolean)
      : [];

    if (!title || (!get('A \\(Action\\)') && !get('Action'))) continue; // skip template/empty blocks

    stories.push({
      title,
      theme,
      source:     get('Source'),
      situation:  get('S \\(Situation\\)') || get('Situation'),
      task:       get('T \\(Task\\)') || get('Task'),
      action:     get('A \\(Action\\)') || get('Action'),
      result:     get('R \\(Result\\)') || get('Result'),
      reflection: get('Reflection'),
      tags,
    });
  }

  return stories;
}

// ── Scoring ──────────────────────────────────────────────────────────

/**
 * Tokenize text into lowercase words, stripping punctuation.
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  const chunks = text.toLowerCase().match(/[a-z0-9]+|[\p{Script=Han}]+/gu) || [];
  return chunks.flatMap((chunk) => {
    if (!/^\p{Script=Han}+$/u.test(chunk)) return [chunk];
    const chars = [...chunk];
    const tokens = [chunk];
    for (let size = 2; size <= Math.min(4, chars.length); size++) {
      for (let i = 0; i <= chars.length - size; i++) tokens.push(chars.slice(i, i + size).join(''));
    }
    return tokens;
  });
}

const STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'you','me','my','your','i','we','they','it','is','was','were','are',
  'be','been','have','had','has','do','did','does','tell','about','time',
  'when','how','give','example','describe','situation','where','what',
]);

/**
 * Score a story against a question + optional JD text.
 * Higher = better match.
 * @param {object} story
 * @param {string[]} queryTokens
 * @param {string[]} jdTokens
 * @returns {number}
 */
function score(story, queryTokens, jdTokens) {
  const signal = queryTokens.filter(t => !STOPWORDS.has(t));
  let s = 0;

  // Tag match: highest weight (tags are explicit "best for" labels)
  const tagText = story.tags.join(' ');
  for (const token of signal) {
    if (tagText.includes(token)) s += 3;
  }

  // Title/theme match
  const titleTokens = tokenize(story.title + ' ' + story.theme);
  for (const token of signal) {
    if (titleTokens.includes(token)) s += 2;
  }

  // Action + result match (the most substantive parts)
  const bodyTokens = tokenize(story.action + ' ' + story.result);
  for (const token of signal) {
    if (bodyTokens.includes(token)) s += 1;
  }

  // JD boost: stopword-filtered JD tokens matched against tokenized tags (exact token overlap)
  if (jdTokens.length > 0) {
    const jdSignal = new Set(jdTokens.filter(t => !STOPWORDS.has(t)));
    for (const tag of story.tags) {
      const tagTokens = tokenize(tag);
      if (tagTokens.some(t => jdSignal.has(t))) s += 2;
    }
  }

  return s;
}

// ── Formatter ────────────────────────────────────────────────────────

/**
 * Format a STAR story as ATS-ready prose.
 * English keeps the original 250–500-word guidance. Chinese reports Han
 * character count instead, because whitespace-delimited word counts are invalid.
 * @param {object} story
 * @param {string} question
 * @returns {string}
 */
function formatAts(story, question) {
  const parts = [];

  if (story.situation) parts.push(story.situation);
  if (story.task)      parts.push(story.task);
  if (story.action)    parts.push(story.action);
  if (story.result)    parts.push(story.result);
  if (story.reflection) parts.push(story.reflection);

  const fullProse = parts.filter(Boolean).join(' ');
  const hanCount = (fullProse.match(/\p{Script=Han}/gu) || []).length;
  let prose;
  let lengthHint;
  let notice = '';

  if (hanCount > 0) {
    prose = fullProse;
    lengthHint = `约${hanCount}个中文字符`;
    if (hanCount < 120) {
      notice = '\n   ⚠️  内容较短，建议在 story-bank.md 中补充关键行动、取舍和结果。';
    }
  } else {
    const wordArr = fullProse.split(/\s+/).filter(Boolean);
    prose = wordArr.slice(0, 500).join(' ');
    const words = Math.min(wordArr.length, 500);
    lengthHint = `~${words} words`;
    if (wordArr.length < 250) {
      notice = '\n   ⚠️  Under 250 words — consider expanding this story in story-bank.md.';
    }
  }

  return [
    `— ${story.title}${story.theme ? ` [${story.theme}]` : ''}`,
    story.source ? `   Source: ${story.source}` : '',
    story.tags.length ? `   Tags: ${story.tags.join(', ')}` : '',
    '',
    prose,
    '',
    `   (${lengthHint})${notice}`,
  ].filter(s => s !== null).join('\n');
}

// ── Exports (for test-all.mjs and other consumers) ───────────────────
export { formatAts, parseStories, tokenize, score, STOPWORDS };

// ── Main ─────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
if (!existsSync(STORY_BANK_PATH)) {
  console.error(`Error: ${STORY_BANK_PATH} not found.`);
  console.error('Run /career-one interview-prep on a role first to populate your story bank.');
  process.exit(1);
}

const content = readFileSync(STORY_BANK_PATH, 'utf-8');
const stories = parseStories(content);

if (stories.length === 0) {
  console.error('No stories found in story-bank.md yet.');
  console.error('Run /career-one interview-prep on a role to add your first stories.');
  process.exit(1);
}

if (LIST_MODE) {
  console.log(`\nStory Bank — ${stories.length} stories\n${'─'.repeat(40)}`);
  stories.forEach((s, i) => {
    console.log(`${i + 1}. ${s.title}${s.theme ? ` [${s.theme}]` : ''}`);
    if (s.tags.length) console.log(`   Tags: ${s.tags.join(', ')}`);
    if (s.source)      console.log(`   ${s.source}`);
    console.log('');
  });
  process.exit(0);
}

if (!question) {
  console.error('Usage: node career-one.mjs star "<behavioural question>" [--jd <file>] [--top <n>]');
  console.error('       node career-one.mjs star --list');
  process.exit(1);
}

const queryTokens = tokenize(question);
let jdTokens = [];
if (jdPath) {
  if (!existsSync(jdPath)) {
    console.error(`Error: JD file not found at ${jdPath}`);
    process.exit(1);
  }
  jdTokens = tokenize(readFileSync(jdPath, 'utf-8'));
}

// Score and rank
const ranked = stories
  .map(s => ({ story: s, score: score(s, queryTokens, jdTokens) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, TOP_N);

console.log(`\nATS Behavioural Question Matcher`);
console.log('─'.repeat(40));
console.log(`Question: "${question}"`);
if (jdPath) console.log(`JD:       ${jdPath}`);
console.log(`Stories:  ${stories.length} in bank\n`);

for (let i = 0; i < ranked.length; i++) {
  const { story, score: s } = ranked[i];
  console.log(`${'─'.repeat(40)}`);
  console.log(`Match ${i + 1} of ${ranked.length} (score: ${s})\n`);
  console.log(formatAts(story, question));
  console.log('');
}

if (ranked.length > 0 && ranked[0].score === 0) {
  console.log('⚠️  No strong match found. Consider adding a story to story-bank.md that covers this competency.');
}
} // end CLI guard
