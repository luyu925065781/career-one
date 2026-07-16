import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  parseStoryBank,
  replaceStoryInMarkdown,
  serializeStoryMarkdown,
  validateStoryBankMarkdown,
  validateStoryMarkdown,
} from "./src/lib/story-bank.mjs";
import { formatAts, parseStories as parseCliStories, score, tokenize } from "../match-star.mjs";

const readWeb = (relative) => fs.readFileSync(new URL(relative, import.meta.url), "utf8");

const FIXTURE = `# 面试故事库

## S01 · 把支付工具升级为行业服务平台

- **状态：** 可使用
- **能力标签：** 0-1 产品、跨部门推进
- **适用问题：** 讲一次复杂项目；如何推动跨团队协作
- **事实来源：** cv.md:119-124
- **更新日期：** 2026-07-10

### S 情境

原系统以支付收单为主。

### T 任务

把系统升级为珠宝行业服务平台。

### A 行动

- 接入三家支付渠道。
- 推动业务与技术架构调整。

### R 结果

交易流水提升 30%。

### Reflection 反思

面试时还需要补充关键阻力和取舍。

## S02 · 建立会员与营销工具

- **状态：** 待完善
- **能力标签：** 用户增长、SaaS
- **适用问题：** 如何从 0 到 1；如何理解用户
- **事实来源：** cv.md:162-167
- **更新日期：** 2026-07-09

### S 情境
珠宝门店需要线上私域运营能力。

### T 任务
建立会员与营销能力。

### A 行动
搭建会员、积分和优惠券体系。

### R 结果
管理客户会员 100 万+，上线 8 种营销工具。

### Reflection 反思
需要补充个人决策与团队协作边界。
`;

test("parses story metadata and STAR+R sections", () => {
  const bank = parseStoryBank(FIXTURE);

  assert.equal(bank.title, "面试故事库");
  assert.equal(bank.stories.length, 2);
  assert.deepEqual(bank.stories[0], {
    id: "S01",
    title: "把支付工具升级为行业服务平台",
    status: "可使用",
    tags: ["0-1 产品", "跨部门推进"],
    questions: ["讲一次复杂项目", "如何推动跨团队协作"],
    source: "cv.md:119-124",
    updatedAt: "2026-07-10",
    situation: ["原系统以支付收单为主。"],
    task: ["把系统升级为珠宝行业服务平台。"],
    action: ["接入三家支付渠道。", "推动业务与技术架构调整。"],
    result: ["交易流水提升 30%。"],
    reflection: ["面试时还需要补充关键阻力和取舍。"],
  });
});

test("sorts stories by updated date and then id descending", () => {
  const bank = parseStoryBank(FIXTURE.replace("2026-07-09", "2026-07-10"));
  assert.deepEqual(bank.stories.map((story) => story.id), ["S02", "S01"]);
});

test("returns an empty bank for blank markdown", () => {
  assert.deepEqual(parseStoryBank(""), { title: "面试故事库", stories: [] });
});

test("CLI matcher accepts the Chinese story-bank format", () => {
  const stories = parseCliStories(FIXTURE);
  assert.equal(stories.length, 2);
  assert.equal(stories[0].title, "把支付工具升级为行业服务平台");
  assert.match(stories[0].action, /接入三家支付渠道/);
});

test("CLI matcher can rank a Chinese cross-functional question", () => {
  const stories = parseCliStories(FIXTURE);
  const query = tokenize("如何推动跨部门协作");
  const scores = stories.map((story) => score(story, query, []));
  assert.ok(scores[0] > scores[1], `expected first story to rank higher, got ${scores}`);
});

test("CLI formatter reports Chinese length without an English word-count warning", () => {
  const [story] = parseCliStories(FIXTURE);
  const output = formatAts(story, "如何推动跨部门协作");

  assert.match(output, /约\d+个中文字符/);
  assert.doesNotMatch(output, /Under 250 words/);
});

test("validates the editable story-bank contract before any write", () => {
  assert.deepEqual(validateStoryBankMarkdown(FIXTURE), { ok: true });
  assert.match(validateStoryBankMarkdown("# 其他文档\n").error, /一级标题/);
  assert.match(
    validateStoryBankMarkdown(`${FIXTURE}\n## S02 · 重复编号\n`).error,
    /编号重复/,
  );
  assert.match(validateStoryBankMarkdown("# 面试故事库\n\n## 普通标题\n").error, /故事标题/);
});

test("serializes and validates exactly one story for scoped maintenance", () => {
  const [story] = parseStoryBank(FIXTURE).stories.filter((item) => item.id === "S01");
  const markdown = serializeStoryMarkdown({
    ...story,
    title: "只优化这一条故事",
    reflection: ["保留事实边界。"],
  });

  assert.match(markdown, /^## S01 · 只优化这一条故事/m);
  assert.deepEqual(validateStoryMarkdown(markdown, "S01"), { ok: true });
  assert.match(validateStoryMarkdown(markdown, "S02").error, /编号必须是 S02/);
  assert.match(validateStoryMarkdown(`${markdown}\n\n${markdown}`, "S01").error, /只能包含一个故事/);
});

test("replaces only the requested story and preserves every other byte", () => {
  const targetStart = FIXTURE.indexOf("## S01");
  const untouchedStart = FIXTURE.indexOf("## S02");
  const untouched = FIXTURE.slice(untouchedStart);
  const replacement = serializeStoryMarkdown({
    ...parseStoryBank(FIXTURE).stories.find((story) => story.id === "S01"),
    title: "已单独优化",
    reflection: ["只修改 S01。"],
  });
  const result = replaceStoryInMarkdown(FIXTURE, "S01", replacement);

  assert.equal(result.slice(0, targetStart), FIXTURE.slice(0, targetStart));
  assert.equal(result.slice(result.indexOf("## S02")), untouched);
  assert.match(result, /## S01 · 已单独优化/);
  assert.throws(() => replaceStoryInMarkdown(FIXTURE, "S09", replacement), /不存在/);
  assert.throws(() => replaceStoryInMarkdown(FIXTURE, "S02", replacement), /编号必须是 S02/);
});

test("interview page exposes maintenance actions on every story card, not in the page header", () => {
  const page = readWeb("./src/app/interview/page.tsx");
  const manager = readWeb("./src/components/cv-editor.tsx");

  assert.match(page, /<StoryActions story=\{story\}/);
  assert.doesNotMatch(page, /<StoryBankManager/);
  assert.match(manager, /export function StoryActions/);
  assert.match(manager, /AI 优化/);
  assert.match(manager, /手动维护/);
  assert.match(manager, /story\.id/);
  assert.match(manager, /co-assistant/);
});

test("story writes are fixed-path, single-story merged, version-checked, and backed up", () => {
  const route = readWeb("./src/app/api/cv/route.ts");

  assert.match(route, /story-bank/);
  assert.match(route, /storyId/);
  assert.match(route, /storyMarkdown/);
  assert.match(route, /baseHash/);
  assert.match(route, /status:\s*409/);
  assert.match(route, /replaceStoryInMarkdown/);
  assert.match(route, /atomicWriteWithBackup/);
});

test("AI proposals target one story and remain confirm-gated", () => {
  const assistant = readWeb("./src/app/api/assistant/route.ts");
  const registry = readWeb("./src/app/actions/registry.ts");
  const consoleView = readWeb("./src/components/assistant-console.tsx");

  assert.match(assistant, /setStory/);
  assert.match(assistant, /storyId/);
  assert.match(assistant, /storyMarkdown/);
  assert.match(assistant, /baseHash/);
  assert.match(assistant, /interview-prep\/story-bank\.md/);
  assert.match(registry, /setStory/);
  assert.match(registry, /status:\s*"confirm"/);
  assert.match(registry, /writeStory/);
  assert.match(registry, /preview:\s*storyMarkdown/);
  assert.match(consoleView, /storyId, storyMarkdown, baseHash/);
  assert.match(consoleView, /查看完整草稿/);
});
