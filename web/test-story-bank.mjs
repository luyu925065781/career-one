import test from "node:test";
import assert from "node:assert/strict";
import { parseStoryBank } from "./src/lib/story-bank.mjs";
import { formatAts, parseStories as parseCliStories, score, tokenize } from "../match-star.mjs";

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
