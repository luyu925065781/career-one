import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  assessStoryReadiness,
  parseStoryBank,
  replaceStoryInMarkdown,
  serializeStoryMarkdown,
  validateStoryBankMarkdown,
  validateStoryMarkdown,
} from "./src/lib/story-bank.mjs";
import { formatAts, parseStories as parseCliStories, score, tokenize } from "../scripts/application/match-star.mjs";

const readWeb = (relative) => fs.readFileSync(new URL(relative, import.meta.url), "utf8");

const FIXTURE = `# 面试故事库

## S01 · 把支付工具升级为行业服务平台

- **状态：** 已完善
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
    status: "已完善",
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

test("story readiness requires complete facts, no unresolved prompts, and final user confirmation", () => {
  const completeStory = {
    ...parseStoryBank(FIXTURE).stories.find((story) => story.id === "S01"),
    reflection: ["我会更早建立口径评审，并把跨团队决策记录下来。"],
  };

  assert.deepEqual(assessStoryReadiness(completeStory), {
    ready: true,
    checks: [
      { id: "situation", label: "补充清晰的情境", passed: true },
      { id: "task", label: "明确目标与本人责任", passed: true },
      { id: "action", label: "补充具体行动与取舍", passed: true },
      { id: "result", label: "确认结果与统计口径", passed: true },
      { id: "reflection", label: "补充真实复盘", passed: true },
      { id: "source", label: "补充可追溯的事实来源", passed: true },
      { id: "unresolved", label: "补齐所有待确认事实", passed: true },
      { id: "confirmed", label: "确认最终故事草稿", passed: true },
    ],
    missingChecks: [],
    pendingPrompts: [],
    hasUnresolved: false,
  });

  const waitingForConfirmation = assessStoryReadiness({ ...completeStory, status: "待完善" });
  assert.equal(waitingForConfirmation.ready, false);
  assert.deepEqual(waitingForConfirmation.missingChecks.map((check) => check.id), ["confirmed"]);

  const unresolved = assessStoryReadiness({
    ...completeStory,
    reflection: ["待确认：最关键的技术取舍是什么？", "待确认: 如果重做一次会改变什么？"],
  });
  assert.equal(unresolved.ready, false, "a status string must never bypass unresolved facts");
  assert.equal(unresolved.hasUnresolved, true);
  assert.deepEqual(unresolved.pendingPrompts, ["最关键的技术取舍是什么？", "如果重做一次会改变什么？"]);
  assert.ok(unresolved.missingChecks.some((check) => check.id === "reflection"));
  assert.ok(unresolved.missingChecks.some((check) => check.id === "unresolved"));

  const legacyStory = parseStoryBank(FIXTURE.replace("已完善", "可使用")).stories
    .find((story) => story.id === "S01");
  assert.equal(legacyStory.status, "已完善", "legacy 可使用 status should read as 已完善");
  assert.equal(assessStoryReadiness({
    ...legacyStory,
    reflection: ["我会更早建立口径评审，并把跨团队决策记录下来。"],
  }).ready, true);
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
  assert.match(markdown, /- \*\*状态：\*\* 已完善/);
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

test("interview page hands story optimization to the user's Agent and keeps manual maintenance", () => {
  const page = readWeb("./src/app/interview/page.tsx");
  const manager = readWeb("./src/components/cv-editor.tsx");

  assert.match(page, /<StoryActions story=\{story\}/);
  assert.doesNotMatch(page, /<StoryBankManager/);
  assert.match(manager, /export function StoryActions/);
  assert.match(manager, /在 Agent 中优化/);
  assert.match(manager, /手动维护/);
  assert.match(manager, /story\.id/);
  assert.match(manager, /queueAgentTask/);
  assert.match(manager, /kind:\s*"story"/);
  assert.match(manager, /page:\s*"\/interview"/);
  assert.match(manager, /waiting_approval/);
  assert.match(manager, /等待确认/);
  assert.match(manager, /AgentTaskHandoffDialog/);
  assert.doesNotMatch(manager, /co-assistant/);
  assert.doesNotMatch(manager, /liquid-glass-control/);
  assert.match(manager, /border-outline-border bg-outline-bg/);
});

test("an empty story bank starts only after the profile step", () => {
  const cvPage = readWeb("./src/app/cv/page.tsx");
  const page = readWeb("./src/app/interview/page.tsx");
  const manager = readWeb("./src/components/cv-editor.tsx");
  const jobStore = readWeb("./src/components/jobs/job-store.tsx");

  assert.match(cvPage, /readStoryBank/);
  assert.match(cvPage, /doctorState/);
  assert.doesNotMatch(cvPage, /assessStoryReadiness|readyStoryCount/);
  assert.match(cvPage, /<CvEditor storyCount=\{stories\.length\} profileReady=\{profileReady\}\s*\/>/);
  assert.match(manager, /export function JourneyHandoffCard/);
  assert.match(manager, /!profileReady[\s\S]{0,80}"profile-current"/);
  assert.match(manager, /storyCount > 0[\s\S]{0,80}"story-complete"[\s\S]{0,80}"story-current"/);
  assert.doesNotMatch(manager, /readyStoryCount|STORY_READY_TARGET/);
  assert.match(manager, /简历已准备好，下一步一次确认求职画像/);
  assert.match(manager, /href="\/profile"/);
  assert.match(manager, /<CreateStoryBankAction\s*\/>/);

  assert.match(page, /doctorState/);
  assert.match(page, /<JourneyHandoffCard/);
  assert.match(page, /!profileReady[\s\S]{0,100}"profile-current"/);
  assert.match(page, /stories\.length > 0 \? "story-complete" : "story-current"/);
  assert.doesNotMatch(page, /STORY_READY_TARGET|readyStoryCount=/);
  assert.match(page, /从简历中已核验的经历整理/);
  assert.match(page, /岗位评估后还会继续补充/);
  assert.doesNotMatch(page, /完成岗位评估后，择程AI会/);

  assert.match(manager, /export function CreateStoryBankAction/);
  assert.match(manager, /kind:\s*"story-bank"/);
  assert.match(manager, /input:\s*"cv\.md"/);
  assert.match(manager, /title:\s*"按求职画像整理面试故事库"/);
  assert.match(manager, /AgentTaskHandoffDialog/);
  assert.match(jobStore, /opts\.kind === "story-bank"/);
  assert.match(jobStore, /先确认 config\/profile\.yml 和 modes\/_profile\.md 已存在/);
  assert.match(jobStore, /画像缺失时不要生成面试故事/);
  assert.match(jobStore, /基于 cv\.md/);
  assert.match(jobStore, /优先整理 1 个与目标岗位最相关/);
  assert.match(jobStore, /不要把凑数量当成完成条件/);
  assert.match(jobStore, /不得虚构/);
  assert.match(jobStore, /待确认提案/);
});

test("journey handoff advances after the first story without a readiness gate", () => {
  const manager = readWeb("./src/components/cv-editor.tsx");
  const taskPage = readWeb("./src/app/jobs/[id]/page.tsx");

  assert.match(manager, /rounded-card border border-border bg-surface/);
  assert.doesNotMatch(manager, /data-journey-handoff[^>]+border-brand/);
  assert.match(manager, /整理面试故事库/);
  assert.match(manager, /岗位评估/);
  assert.match(manager, /href="\/cn-diagnose"/);
  assert.doesNotMatch(manager, /发现岗位|href="\/explore"/);
  assert.match(manager, /Web 只保存 Agent 待办/);
  assert.match(manager, /根据目标岗位优先选择最有说服力的真实经历/);
  assert.match(manager, /故事数量和完善状态不影响后续流程/);
  assert.doesNotMatch(manager, /至少 3 个故事|达到可使用标准后，流程才会进入岗位评估|继续完善故事/);

  assert.match(taskPage, /action === "approve"/);
  assert.match(taskPage, /resultPage\?\.startsWith\("\/"\)/);
  assert.match(taskPage, /router\.replace\(resultPage\)/);
});

test("interview page keeps quality guidance optional and never gates evaluation", () => {
  const page = readWeb("./src/app/interview/page.tsx");

  assert.match(page, /assessStoryReadiness/);
  assert.match(page, /label="已生成"/);
  assert.doesNotMatch(page, /<StoryReadinessGuide/);
  assert.doesNotMatch(page, /function StoryReadinessGuide/);
  assert.match(page, /function StoryStatusHelp/);
  assert.match(page, /<StoryStatusHelp storyId=\{story\.id\} completed=\{completed\}/);
  assert.match(page, /\{completed \? "已完善" : "待完善"\}[\s\S]{0,80}<\/span>\s*<StoryStatusHelp/);
  assert.match(page, /<details className="group relative">/);
  assert.match(page, /aria-label=\{`查看 \$\{storyId\} 的完善标准`\}/);
  assert.match(page, /className="flex size-7 cursor-pointer/);
  assert.match(page, /<CircleHelp className="size-3\.5"/);
  assert.doesNotMatch(page, /className="flex size-11 cursor-pointer/);
  assert.match(page, /shadow-floating/);
  assert.match(page, /怎样变成“已完善”/);
  assert.match(page, /Agent 会以“已完善”标准为目标优化故事/);
  assert.match(page, /关键事实不足时，会先向您追问/);
  assert.match(page, /完整草稿经您的审核确认后/);
  assert.match(page, /故事才会进入“已完善”状态/);
  assert.match(page, /label="已完善"/);
  assert.match(page, /\? "已完善" : "待完善"/);
  assert.match(page, /完成这些内容后即可标记为已完善/);
  assert.match(page, /这些标准只用于帮助您判断故事质量，不影响继续评估岗位/);
  assert.doesNotMatch(page, /\{ready\} 个已完善/);
  assert.doesNotMatch(page, /STORY_READY_TARGET|新手流程第 2 步才会完成/);
  assert.match(page, /事实可追溯/);
  assert.match(page, /STAR 具体/);
  assert.match(page, /补齐待确认/);
  assert.match(page, /用户最终确认/);
  assert.match(page, /assessment\.pendingPrompts/);
  assert.match(page, /还差 \{assessment\.missingChecks\.length\} 项/);
  assert.match(page, /id="story-list"/);
  assert.match(page, /rounded-card border border-border bg-surface/);
  assert.doesNotMatch(page, /“可使用”|label="可使用"|\? "可使用"/);
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

test("story optimization stays in the Agent product, including requests from the Web assistant", () => {
  const assistant = readWeb("./src/app/api/assistant/route.ts");
  const registry = readWeb("./src/app/actions/registry.ts");
  const consoleView = readWeb("./src/components/assistant-console.tsx");
  const jobStore = readWeb("./src/components/jobs/job-store.tsx");
  const handoffDialog = readWeb("./src/components/generate-pdf-button.tsx");

  assert.match(jobStore, /opts\.kind === "story"/);
  assert.match(jobStore, /interview-prep\/story-bank\.md/);
  assert.match(jobStore, /以达到“已完善”标准为目标/);
  assert.match(jobStore, /不要主动增加非必要的“待确认”项/);
  assert.match(jobStore, /关键事实确实缺失[\s\S]*先用最少的问题向我追问/);
  assert.match(jobStore, /状态直接写为“已完善”/);
  assert.match(jobStore, /只有我明确选择跳过关键问题时[\s\S]*保留“待完善”/);
  assert.match(jobStore, /待办任务 ID/);
  assert.match(handoffDialog, /export function AgentTaskHandoffDialog/);
  assert.match(handoffDialog, /任务已加入 Agent 待办/);
  assert.match(handoffDialog, /请回到 Codex、WorkBuddy 或其他 Agent/);
  assert.match(handoffDialog, /复制指令/);

  assert.match(assistant, /optimizeStory/);
  assert.match(assistant, /Web does not optimize or write the story/);
  assert.doesNotMatch(assistant, /setStory|STORY REVISION CONTRACT|storyBankRevisionLine/);
  assert.match(registry, /optimizeStory/);
  assert.match(registry, /queueAgentTask/);
  assert.match(registry, /kind:\s*"story"/);
  assert.doesNotMatch(registry, /setStory|writeStory|validateStoryMarkdown/);
  assert.doesNotMatch(consoleView, /writeStory/);
});
