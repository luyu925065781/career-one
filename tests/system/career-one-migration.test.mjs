#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const json = (rel) => JSON.parse(read(rel));

const rootPackage = json("package.json");
const runtimeReleaseConfig = json("release.config.json");
const versionFile = read("VERSION").trim().split(/\s+/)[0];
assert.equal(rootPackage.name, "career-one", "根 package 名必须是 career-one");
assert.equal(rootPackage.version, runtimeReleaseConfig.version, "根 package 版本必须与发布配置一致");
assert.equal(versionFile, runtimeReleaseConfig.version, "VERSION 必须与发布配置一致");
assert.equal(rootPackage.author.name, "NumberX", "根 package 必须声明当前维护者");
assert.equal(rootPackage.contributors, undefined, "上游作者信息只保留在 LICENSE，不写入 package contributors");
assert.equal(
  rootPackage.repository.url,
  "https://github.com/luyu925065781/career-one",
  "根 package 必须指向择程AI自己的 GitHub 仓库",
);
assert.match(rootPackage.dependencies["js-yaml"], /^\^5\./, "根运行时必须使用当前 js-yaml 主版本");

const webPackage = json("web/package.json");
assert.equal(webPackage.name, "@career-one/web", "Web package 名必须使用 career-one");
assert.equal(webPackage.version, runtimeReleaseConfig.version, "Web package 版本必须与发布配置一致");
assert.equal(webPackage.dependencies["js-yaml"], rootPackage.dependencies["js-yaml"], "Web 与根运行时必须使用同一 js-yaml 版本");
assert.match(webPackage.scripts.dev, /--hostname 127\.0\.0\.1/, "Web 开发服务必须只监听本机回环地址");
assert.match(webPackage.scripts.start, /--hostname 127\.0\.0\.1/, "Web 生产服务必须只监听本机回环地址");

const yamlConsumers = [
  "scripts/tracker/tracker-utils.mjs",
  "scripts/scan/scan.mjs",
  "scripts/scan/scan-ats-full.mjs",
  "scripts/tracker/tracker.mjs",
  "scripts/analysis/followup-cadence.mjs",
  "scripts/plugins/plugins.mjs",
  "doctor.mjs",
  "scripts/liveness/browser-extract.mjs",
  "scripts/integrations/openrouter-runner.mjs",
  "scripts/analysis/stats.mjs",
  "scripts/analysis/salary-gap.mjs",
  "scripts/system/verify-portals.mjs",
  "plugins/notion/_notion.mjs",
  "scripts/system/validate-portals.mjs",
  "web/src/lib/core/states.ts",
  "web/src/app/api/portals/route.ts",
  "web/src/lib/core/portals.ts",
  "web/src/app/api/profile/route.ts",
].map(read).join("\n");
assert.doesNotMatch(yamlConsumers, /import yaml from ["']js-yaml["']/, "js-yaml 5 使用命名空间导入，不得依赖默认导出");
assert.doesNotMatch(
  read("plugins/_engine.mjs"),
  /import\(["']js-yaml["']\)\)\.default/,
  "插件引擎的惰性 js-yaml 导入不得依赖默认导出",
);

const plugin = json(".claude-plugin/plugin.json");
assert.equal(plugin.name, "career-one", "Claude 插件技术标识必须是 career-one");
assert.match(plugin.description, /择程AI/, "Claude 插件描述必须展示择程AI品牌");

const readme = read("README.md");
assert.match(readme, /^# 择程AI/m, "中文 README 必须以择程AI作为展示品牌");
assert.doesNotMatch(
  readme,
  /trendshift\.io|producthunt\.com|discord\.gg|wired\.com\.gr|businessinsider\.com|我的作品集/,
  "中文 README 不得展示无关媒体、社区或作品集宣传链接",
);
assert.doesNotMatch(readme, /我花了好几个月|我打造了|媒体报道|成功拿下理想职位/, "中文 README 不得沿用原作者第一人称或成果宣传");
assert.doesNotMatch(
  readme,
  /^## (?:开源致谢|文档与反馈)$/m,
  "精简版 README 不得保留开源致谢或文档与反馈独立区块",
);
for (const section of ["快速开始", "用法", "岗位发现边界"]) {
  assert.match(readme, new RegExp(`^## ${section}$`, "m"), `中文 README 必须保留${section}章节`);
}
const coreFeatures = readme.match(/## 核心功能\n([\s\S]*?)(?=\n## |\s*$)/)?.[1] || "";
assert.match(coreFeatures, /\| \*\*面试故事库\*\* \|/, "核心功能必须单独展示面试故事库");
assert.match(coreFeatures, /\| \*\*求职画像\*\* \|[^\n]*搜索词[^\n]*发现[^\n]*筛选/, "求职画像必须包含岗位发现与筛选能力");
assert.doesNotMatch(coreFeatures, /\| \*\*岗位发现与筛选\*\* \|/, "岗位发现与筛选不得继续作为独立功能");
assert.match(
  coreFeatures,
  /\| \*\*智能定制简历与 PDF\*\* \|[^\n]*不同岗位[^\n]*一岗一版/,
  "简历功能必须明确针对不同岗位智能定制并生成一岗一版材料",
);
const disclaimer = readme.match(/## 免责声明\n([\s\S]*?)(?=\n## |\s*$)/)?.[1] || "";
for (const required of [
  "本地开源工具，不是托管简历和求职数据的服务",
  "数据由你掌控",
  "AI 由你掌控",
  "遵守第三方服务条款",
  "不提供任何保证",
]) {
  assert.ok(disclaimer.includes(required), `中文 README 免责声明缺少关键条款：${required}`);
}
assert.match(
  disclaimer,
  /\[[^\]]+\]\(LEGAL_DISCLAIMER\.md\)/,
  "中文 README 免责声明必须链接到 LEGAL_DISCLAIMER.md",
);

const license = read("LICENSE");
const originalCopyrightHolder = ["Santi", "ago Fernández de Valderrama"].join("");
assert.ok(license.includes(`Copyright (c) 2026 ${originalCopyrightHolder}`), "MIT LICENSE 必须保留原版权声明");
assert.match(license, /Modifications Copyright \(c\) 2026 NumberX and career-one contributors/, "MIT LICENSE 必须声明择程AI修改版权");

const forbiddenLegacyTerms = [
  ["Santi", "ago"].join(""),
  ["santi", "fer"].join(""),
  ["career", "ops"].join("-"),
];
const legacyLeaks = [];
const trackedFiles = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
for (const rel of trackedFiles) {
  if (path.basename(rel) === "LICENSE") continue;
  const absolute = path.join(root, rel);
  let stat;
  try { stat = fs.lstatSync(absolute); } catch { continue; }
  if (!stat.isFile() && !stat.isSymbolicLink()) continue;
  let content;
  try { content = stat.isSymbolicLink() ? fs.readlinkSync(absolute) : fs.readFileSync(absolute, "utf8"); } catch { continue; }
  if (
    forbiddenLegacyTerms.some((term) => rel.toLowerCase().includes(term.toLowerCase())) ||
    forbiddenLegacyTerms.some((term) => content.toLowerCase().includes(term.toLowerCase()))
  ) legacyLeaks.push(rel);
}
assert.deepEqual(legacyLeaks, [], `除 LICENSE 外不得保留上游品牌或身份痕迹：${legacyLeaks.join(", ")}`);

const canonicalSkill = read(".agents/skills/career-one/SKILL.md");
assert.match(canonicalSkill, /^---\nname: career-one\n/m, "必须提供 career-one 开放 Skill");
assert.match(canonicalSkill, /^# 择程AI（career-one）$/m, "Skill 正文必须展示择程AI品牌");
assert.match(canonicalSkill, /modes\/zh\//, "career-one Skill 必须默认加载中文模式");
assert.match(canonicalSkill, /可选的打招呼话术/, "岗位评估 Skill 必须统一使用打招呼话术");
assert.doesNotMatch(canonicalSkill, /面试开场话术/, "岗位评估 Skill 不得继续使用旧标题");
assert.doesNotMatch(canonicalSkill, /BOSS直聘开场话术/, "岗位评估 Skill 不得继续使用平台限定的旧标题");
assert.match(canonicalSkill, /5 个评分因子/, "岗位评估 Skill 必须明确使用五因子评分模型");
for (const factor of ["简历匹配", "职业方向", "职级与职责", "薪酬", "组织与文化"]) {
  assert.match(canonicalSkill, new RegExp(factor), `岗位评估 Skill 必须包含评分因子：${factor}`);
}
assert.match(canonicalSkill, /G「职位真实性评估」独立评级，不参与 1-5 分计算/, "岗位评估 Skill 必须把真实性评级与匹配分分离");
assert.match(canonicalSkill, /最终建议.*综合匹配分.*真实性评级/, "岗位评估 Skill 必须说明最终建议同时参考匹配分和真实性评级");
assert.match(canonicalSkill, /A-G 是内部稳定模块 ID/, "岗位评估 Skill 必须明确 A-G 仅用于内部报告兼容");
assert.match(canonicalSkill, /用户界面.*连续数字/, "岗位评估 Skill 必须明确用户界面使用连续数字序号");
assert.match(canonicalSkill, /career-one\.mjs web/, "Skill 必须提供打开 Web 工作台的稳定命令");
assert.match(canonicalSkill, /http:\/\/localhost:3301\/jobs/, "Skill 必须向用户展示 3301 工作台入口");
assert.match(canonicalSkill, /\/jobs\/<任务ID>/, "Skill 必须向用户展示当前任务入口");
assert.match(canonicalSkill, /\/pipeline\/\{报告编号\}/, "岗位评估完成后必须展示评估报告深链");
assert.match(canonicalSkill, /http:\/\/localhost:3301\/cv/, "简历任务完成后必须展示 3301 简历页面深链");
assert.match(read("modes/zh/oferta.md"), /^## 打招呼话术$/m, "中文岗位评估模板必须固定打招呼话术标题");
assert.doesNotMatch(read("modes/zh/oferta.md"), /^## 面试开场话术$/m, "中文岗位评估模板不得继续生成旧标题");
assert.match(read("modes/zh/oferta.md"), /^## 向招聘方追问$/m, "中文岗位评估模板必须使用通用招聘方追问标题");
assert.doesNotMatch(read("modes/zh/oferta.md"), /^## (?:建议向招聘方追问|建议向猎头追问|必须追问)$/m, "中文岗位评估模板不得继续生成旧追问标题");
const chineseOfferMode = read("modes/zh/oferta.md");
const chineseOfferTemplate = chineseOfferMode.slice(chineseOfferMode.indexOf("**报告文件格式模板：**"));
let previousOfferSectionIndex = -1;
for (const sectionTitle of [
  "## B) 简历匹配分析",
  "### 匹配雷达",
  "### 正向信号",
  "### 能力与缺口补强",
  "## C) 级别判断与求职策略",
  "## D) 薪酬竞争力与市场需求",
  "## G) 职位真实性评估",
  "### 剩余风险",
  "## 打招呼话术",
  "## 向招聘方追问",
  "## 你在这个岗位里的最佳表达",
  "## 沟通后分流规则",
  "## E) 针对性定制方案",
  "## F) 面试备考计划",
]) {
  const sectionIndex = chineseOfferTemplate.indexOf(sectionTitle);
  assert.ok(sectionIndex > previousOfferSectionIndex, `中文岗位评估模板必须按统一顺序展示“${sectionTitle}”`);
  previousOfferSectionIndex = sectionIndex;
}

const portableCli = read(".agents/skills/career-one/scripts/career-one.mjs");
assert.match(portableCli, /web:\s*\{\s*script:\s*"start-web\.mjs"/, "便携 CLI 必须提供 web 命令");
assert.match(portableCli, /alwaysDefaults:\s*true/, "便携 CLI 的 web 命令必须默认打开浏览器");
assert.match(
  portableCli,
  /\["complete", "wait", "propose", "fail"\]\.includes\(args\[0\]\)/,
  "Agent 任务进入终态或等待态后必须由便携 CLI 确定性触发 Web 收尾",
);
assert.match(portableCli, /--background/, "任务完成后的 Web 收尾必须使用非阻塞后台启动模式");
assert.match(portableCli, /CAREER_ONE_NO_AUTO_WEB/, "无头或自动化环境必须可以显式关闭自动 Web 启动");
assert.match(portableCli, /\/jobs\/\$\{encodeURIComponent\(runId\)\}/, "没有更具体结果页时必须自动打开当前任务详情");

const autoWebFixture = fs.mkdtempSync(path.join(os.tmpdir(), "career-one-auto-web-"));
try {
  const fakeRunDir = path.join(autoWebFixture, "scripts", "agent");
  const marker = path.join(autoWebFixture, "web-invocation.json");
  fs.mkdirSync(fakeRunDir, { recursive: true });
  fs.writeFileSync(path.join(autoWebFixture, "AGENTS.md"), "# fixture\n");
  fs.writeFileSync(path.join(autoWebFixture, "doctor.mjs"), "process.exit(0);\n");
  fs.writeFileSync(path.join(fakeRunDir, "agent-runs.mjs"), "process.stdout.write('{}\\n');\n");
  fs.writeFileSync(
    path.join(autoWebFixture, "start-web.mjs"),
    "import { writeFileSync } from 'node:fs'; writeFileSync(process.env.AUTO_WEB_MARKER, JSON.stringify(process.argv.slice(2))); if (process.env.AUTO_WEB_FAIL === '1') process.exit(9);\n",
  );
  const portableCliPath = path.join(root, ".agents", "skills", "career-one", "scripts", "career-one.mjs");
  const env = { ...process.env, AUTO_WEB_MARKER: marker, CAREER_ONE_NO_AUTO_WEB: "0", CI: "" };
  const runArgs = (...args) => [
    portableCliPath,
    "run",
    ...args,
    "--workspace",
    autoWebFixture,
  ];
  const completeArgs = runArgs(
    "complete",
    "run_auto_web",
    "--artifact",
    "reports/001-example.md|岗位诊断报告|/pipeline/001",
  );

  execFileSync(process.execPath, completeArgs, {
    cwd: root,
    env,
  });
  assert.deepEqual(
    JSON.parse(fs.readFileSync(marker, "utf8")),
    ["--background", "--open", "--page", "/pipeline/001"],
    "run complete 必须后台启动或复用 Web 并打开产物深链",
  );

  const terminalCases = [
    ["wait", "/jobs/run_wait"],
    ["propose", "/jobs/run_propose"],
    ["fail", "/jobs/run_fail"],
  ];
  for (const [subcommand, expectedPage] of terminalCases) {
    fs.unlinkSync(marker);
    execFileSync(process.execPath, runArgs(subcommand, `run_${subcommand}`), { cwd: root, env });
    assert.deepEqual(
      JSON.parse(fs.readFileSync(marker, "utf8")),
      ["--background", "--open", "--page", expectedPage],
      `run ${subcommand} 必须打开当前任务详情`,
    );
  }

  fs.unlinkSync(marker);
  execFileSync(process.execPath, runArgs("propose", "run_explicit_page", "--page", "/cv"), { cwd: root, env });
  assert.deepEqual(
    JSON.parse(fs.readFileSync(marker, "utf8")),
    ["--background", "--open", "--page", "/cv"],
    "显式 --page 必须优先于任务详情页",
  );

  const disabledCases = [
    { label: "显式 --no-web", args: [...completeArgs, "--no-web"], env },
    { label: "CAREER_ONE_NO_AUTO_WEB=1", args: completeArgs, env: { ...env, CAREER_ONE_NO_AUTO_WEB: "1" } },
    { label: "CI=true", args: completeArgs, env: { ...env, CI: "true" } },
  ];
  for (const disabledCase of disabledCases) {
    if (fs.existsSync(marker)) fs.unlinkSync(marker);
    execFileSync(process.execPath, disabledCase.args, { cwd: root, env: disabledCase.env });
    assert.equal(fs.existsSync(marker), false, `${disabledCase.label} 时不得自动启动工作台`);
  }

  execFileSync(process.execPath, completeArgs, { cwd: root, env: { ...env, AUTO_WEB_FAIL: "1" } });
  assert.equal(fs.existsSync(marker), true, "Web 启动失败发生在任务命令成功落盘之后");
} finally {
  fs.rmSync(autoWebFixture, { recursive: true, force: true });
}

const webStarter = read("start-web.mjs");
assert.match(webStarter, /const DEFAULT_PORT = 3301;/, "Web 启动脚本必须默认使用 3301 端口");
assert.match(webStarter, /--open/, "Web 启动器必须支持显式打开浏览器");
assert.match(webStarter, /--page/, "Web 启动器必须支持打开任务上下文页面");
assert.match(webStarter, /--background/, "Web 启动器必须支持供 Agent 收尾调用的后台模式");
assert.match(webStarter, /detached:\s*background/, "后台 Web 服务必须与 Agent 命令进程分离");
assert.match(webStarter, /stdio:\s*background\s*\?\s*"ignore"\s*:\s*"inherit"/, "后台 Web 服务不得占用 Agent 的标准输入输出");
assert.match(webStarter, /child\.unref\(\)/, "后台 Web 服务不得阻止 Agent 命令正常结束");
assert.doesNotMatch(webStarter, /process\.kill|SIGKILL|releasePort/, "Web 启动器不得杀死占用端口的其他进程");
assert.match(
  webStarter,
  /htmlLooksLikeWorkbench\(html\)/,
  "Web 启动器必须用可测试的页面标识判断服务是否就绪",
);
assert.match(
  webStarter,
  /Agent 任务.*求职进度|求职进度.*Agent 任务/s,
  "Web 启动器必须识别新版首页，不能依赖已移除的旧副标题",
);

const doubleClickStarterPath = path.join(root, "启动择程AI.command");
const doubleClickStarter = read("启动择程AI.command");
assert.ok((fs.statSync(doubleClickStarterPath).mode & 0o111) !== 0, "macOS 双击启动文件必须保留可执行权限");
assert.match(doubleClickStarter, /^#!\/bin\/zsh$/m, "macOS 双击启动文件必须由系统 zsh 执行");
assert.match(doubleClickStarter, /readonly SCRIPT_DIR="\$\{0:A:h\}"/, "双击启动文件必须从自身所在目录定位工作区");
assert.match(doubleClickStarter, /cd -- "\$SCRIPT_DIR"/, "双击启动文件必须先进入择程AI工作区");
assert.match(doubleClickStarter, /npm run dev:web -- --page \/jobs/, "双击启动文件必须复用标准 Web 启动入口并打开任务页");
assert.match(doubleClickStarter, /pause_on_error/, "双击启动失败时必须保留可读错误提示");
assert.doesNotMatch(doubleClickStarter, /\/Users\/|Documents\/career-one/, "双击启动文件不得写死本机绝对路径");

const jobDetailPage = read("web/src/app/jobs/[id]/page.tsx");
const sharedAgentTaskUi = read("web/src/components/jobs/worker-pills.tsx");
assert.match(jobDetailPage, /AgentTaskDetailPanel/, "任务详情页必须复用统一任务详情组件");
assert.match(sharedAgentTaskUi, /job\.page/, "任务详情组件必须显示任务上下文入口");
assert.match(sharedAgentTaskUi, /查看评估报告/, "岗位评估任务必须显示查看评估报告入口");
assert.match(sharedAgentTaskUi, /打开简历页面/, "简历任务必须显示打开简历页面入口");
assert.match(
  sharedAgentTaskUi,
  /const hasMatchingPageArtifact = job\.artifacts\?\.some\(\(artifact\) => artifact\.available !== false && artifact\.page === job\.page\) \?\? false/,
  "任务产物已有相同页面入口时必须识别重复目标",
);
assert.match(
  sharedAgentTaskUi,
  /\{job\.page && !hasMatchingPageArtifact && \(/,
  "任务详情不得同时显示同目标的顶部快捷入口和生成结果入口",
);

const updaterSource = read("update-system.mjs");
for (const requiredPath of ["start-web.mjs", "启动择程AI.command", "web/src/", "web/package.json", "web/package-lock.json"]) {
  assert.match(updaterSource, new RegExp(`['\"]${requiredPath.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}['\"]`), `更新器必须覆盖 ${requiredPath}`);
}
assert.match(read("DATA_CONTRACT.md"), /web\/src\//, "数据契约必须把 Web 源码声明为系统层");

const diagnosisView = read("web/src/components/cn-diagnose/cn-diagnose-view.tsx");
assert.doesNotMatch(diagnosisView, /面试开场话术|BOSS 首轮沟通话术|BOSS 打招呼话术/, "岗位评估入口不得继续显示旧诊断话术");

const webLayout = read("web/src/app/layout.tsx");
assert.match(webLayout, /title: "择程AI｜你的AI求职顾问"/, "Web 标题必须展示择程AI品牌");

const globalStyles = read("web/src/app/globals.css");
assert.match(globalStyles, /--gradient-primary:\s*linear-gradient\(135deg, #facc15 0%, #fde047 100%\)/, "Web 主色必须使用已实现规范页面中的浅黄色渐变");
assert.doesNotMatch(globalStyles, /scrollbar-gutter:\s*stable/, "根页面不得预留空白滚动条槽，避免右侧出现多余边缘");
assert.match(globalStyles, /\[class~="bg-brand"\][^{]*\{[^}]*background-image:\s*var\(--gradient-primary\)/s, "主品牌背景必须统一应用黄橙渐变");
assert.match(globalStyles, /--fg:\s*#111827/, "浅色模式主文字必须使用设计系统 gray-900");
assert.match(globalStyles, /--muted:\s*#4b5563/, "浅色模式次级文字必须使用设计系统 gray-600");
assert.match(globalStyles, /--faint:\s*#6b7280/, "浅色模式弱化文字必须使用设计系统 gray-500");
assert.match(globalStyles, /--brand-text:\s*#111827/, "浅色模式选中项文字必须使用深色前景色");
for (const token of ["default", "muted", "brand", "success", "warning", "danger", "info", "on-brand"]) {
  assert.match(globalStyles, new RegExp(`--color-icon-${token}:\\s*var\\(--icon-${token}\\)`), `Web 主题必须定义 icon-${token} 语义 Token`);
}
assert.match(globalStyles, /\[class~="bg-brand-soft"\]\[class~="text-brand"\][^{]*\{[^}]*color:\s*var\(--brand-text\)/s, "品牌浅底选中项必须使用 selected-text Token");
assert.match(globalStyles, /input:focus,[\s\S]*textarea:focus,[\s\S]*select:focus[^{]*\{[^}]*box-shadow:\s*none\s*!important/s, "表单控件聚焦时必须禁用光晕");

const aiSearchBox = read("web/src/components/explore/ai-search-box.tsx");
assert.match(aiSearchBox, /\.co-aibox:focus-within\{[^}]*box-shadow:none/, "AI 搜索框聚焦时不得显示黄色光晕");

const legacyBrandComponents = [
  "web/src/components/cv/cv-ingest.tsx",
  "web/src/components/explore/first-score-view.tsx",
  "web/src/components/explore/filter-builder.tsx",
  "web/src/components/explore/discovering-state.tsx",
  "web/src/components/explore/ai-search-box.tsx",
  "web/src/components/apply-view.tsx",
  "web/src/components/apply/apply-backdrop.tsx",
].map(read).join("\n");
assert.doesNotMatch(legacyBrandComponents, /hsl\(26\s/, "组件不得继续硬编码旧 career-one 橙色");

const iconTokenComponents = [
  "web/src/components/explore/explorer-view.tsx",
  "web/src/components/apply-view.tsx",
  "web/src/components/cn-diagnose/cn-diagnose-view.tsx",
  "web/src/components/jobs/worker-card.tsx",
  "web/src/app/jobs/page.tsx",
].map(read).join("\n");
assert.match(iconTokenComponents, /text-icon-brand/, "核心页面品牌图标必须使用 icon-brand Token");
assert.match(iconTokenComponents, /text-icon-success/, "成功状态图标必须使用 icon-success Token");
assert.match(iconTokenComponents, /text-icon-warning/, "警告状态图标必须使用 icon-warning Token");
assert.match(iconTokenComponents, /text-icon-danger/, "错误状态图标必须使用 icon-danger Token");

const designSystem = read("DESIGN_SYSTEM.md");
assert.match(designSystem, /^# 择程AI设计系统/m, "项目必须包含择程AI设计系统");
assert.doesNotMatch(designSystem, /上游：数字超体|数字超体基础 Token|两层.*Token/, "择程AI设计系统必须作为独立 Token 来源，不能依赖上游映射");
assert.match(designSystem, /gray-900.*#111827/, "项目设计系统必须定义主文字色");
assert.match(designSystem, /输入框、搜索框、文本域和下拉框聚焦时禁止阴影、光晕和发光轮廓/, "设计系统必须禁止表单焦点光晕");
assert.match(designSystem, /icon-brand/, "设计系统必须定义图标语义 Token");
assert.match(designSystem, /`tertiary`：第三优先级。使用 `surface` 白底和中性描边/, "设计系统必须定义中性的第三优先级描边按钮");
assert.match(designSystem, /状态前景|状态浅底|状态描边/, "设计系统必须定义完整的状态语义 Token");
assert.match(designSystem, /raised|floating|overlay/, "设计系统必须定义语义化阴影层级");

const machineReadableDesign = read("DESIGN.md");
assert.match(machineReadableDesign, /^---\n/m, "DESIGN.md 必须保留机器可读的 YAML frontmatter");
assert.match(machineReadableDesign, /^name:\s*择程AI设计系统$/m, "DESIGN.md 必须是择程AI自己的机器可读 Token");
for (const tokenGroup of ["colors:", "typography:", "spacing:", "rounded:", "elevation:", "components:"]) {
  assert.match(machineReadableDesign, new RegExp(`^${tokenGroup}`, "m"), `DESIGN.md 必须定义 ${tokenGroup} Token`);
}
assert.match(machineReadableDesign, /SF Pro/, "英文规范必须采用 SF Pro 风格");
assert.match(machineReadableDesign, /思源黑体/, "中文规范必须采用思源黑体风格");
assert.match(machineReadableDesign, /择程AI.*系统自带字体/, "产品规范必须明确择程AI使用系统自带字体");
assert.doesNotMatch(machineReadableDesign, /Instrument Serif/, "字体规范不得继续使用 Instrument Serif");

const designSystemPage = read("web/src/app/design-system/page.tsx");
assert.match(designSystemPage, /readFileSync\(path\.join\(careerOneRoot\(\), "DESIGN\.md"\)/, "UI 规范页必须从根目录 DESIGN.md 读取 Token");
assert.match(designSystemPage, /yaml\.load\(/, "UI 规范页必须解析 DESIGN.md 的 YAML frontmatter");
assert.match(designSystemPage, /DesignSystemShowcase/, "UI 规范页必须把解析后的 Token 交给组件展台");

const designSystemShowcase = read("web/src/components/design-system-showcase.tsx");
for (const section of ["颜色", "字体", "尺度", "组件", "原则"]) {
  assert.match(designSystemShowcase, new RegExp(`label: "${section}"`), `UI 规范页必须提供${section}分区`);
}
assert.match(designSystemShowcase, /navigator\.clipboard\.writeText/, "Token 展台必须支持复制 Token 名称和值");
assert.doesNotMatch(designSystemShowcase, /#[0-9a-fA-F]{6}/, "组件展台不得硬编码品牌色，颜色值必须来自 DESIGN.md 或语义 CSS Token");
assert.match(designSystemShowcase, /系统 UI 字体/, "UI 规范页必须解释产品使用系统 UI 字体");
assert.doesNotMatch(designSystemShowcase, /font-display|Instrument Serif/, "UI 规范页不得继续渲染衬线展示字体");

assert.match(globalStyles, /--font-sans:\s*-apple-system,\s*BlinkMacSystemFont/, "产品主体必须优先使用系统 UI 字体");
assert.match(globalStyles, /"PingFang SC"/, "产品中文字体栈必须包含系统苹方");
assert.doesNotMatch(globalStyles, /--font-display:\s*var\(--font-instrument-serif\)/, "产品展示字体不得继续映射到衬线字体");
assert.doesNotMatch(webLayout, /instrumentSerif/, "根布局不得继续加载 Instrument Serif");

const buttonSource = read("web/src/components/ui/button.tsx");
assert.match(buttonSource, /tertiary:\s*"[^"]*border-outline-border[^"]*bg-surface[^"]*text-outline-text[^"]*hover:border-outline-border-hover[^"]*hover:bg-outline-bg/, "通用第三优先级按钮必须使用中性描边 Token");
assert.doesNotMatch(buttonSource, /tertiary:\s*"[^"]*hover:(?:border|bg|text)-brand/, "通用第三优先级按钮 hover 不得使用品牌色");
assert.match(read("AGENTS.md"), /DESIGN_SYSTEM\.md/, "AGENTS 必须声明前端设计 source of truth");
assert.match(read("CLAUDE.md"), /DESIGN_SYSTEM\.md/, "CLAUDE 必须声明前端设计 source of truth");

const webIcon = read("web/src/app/icon.svg");
assert.match(webIcon, /<linearGradient[^>]*id="brand-gradient"/, "择程AI图标必须使用品牌渐变");
assert.match(webIcon, /fill="url\(#brand-gradient\)"/, "择程AI图标背景必须引用品牌渐变");

const portalsView = read("web/src/components/portals-view.tsx");
assert.match(
  portalsView,
  /data-ui-structural="switch-track"[\s\S]{0,260}data-ui-switch-thumb className="absolute left-0 top-0\.5 size-5/,
  "岗位来源开关必须使用共享轨道，并为圆点保留明确的水平锚点",
);
assert.match(
  globalStyles,
  /\[data-ui-switch-thumb\][\s\S]{0,220}transform:\s*translateX\(0\.125rem\)[\s\S]{0,280}aria-checked="true"[\s\S]{0,160}translateX\(1\.25rem\)/,
  "共享开关圆点必须在关闭和开启状态下保持在轨道内",
);

const navItems = read("web/src/lib/nav-items.ts");
assert.doesNotMatch(navItems, /href:\s*"\/cn-diagnose"[^\n]*chip:\s*"中国"/, "中国大陆是默认市场，岗位诊断导航不应重复显示中国标签");
assert.match(
  navItems,
  /href:\s*"\/cn-diagnose"[^\n]*label:\s*"岗位评估"[^\n]*feature:\s*"jobDiagnosis"/,
  "主导航必须展示岗位评估入口并沿用功能门控",
);
for (const [href, label] of [
  ["/explore", "发现岗位"],
  ["/config", "设置"],
]) {
  assert.doesNotMatch(
    navItems,
    new RegExp(`href:\\s*"${href}"|label:\\s*"${label}"`),
    `${label}必须从主导航隐藏，但页面路由可以继续保留`,
  );
}

const appShell = read("web/src/components/app-shell.tsx");
assert.doesNotMatch(appShell, /AssistantConsole/, "专注插件阶段不得在全局壳层显示问助手入口");
assert.match(appShell, />择路扬帆，前程似锦</, "桌面菜单底部必须显示品牌口号");
assert.match(appShell, /tracking-\[0\.14em\][^"]*whitespace-nowrap|whitespace-nowrap[^"]*tracking-\[0\.14em\]/, "桌面品牌口号必须使用舒展且不换行的字距");
assert.match(appShell, /h-7[^"]*items-center[^"]*justify-between|items-center[^"]*justify-between[^"]*h-7/, "桌面品牌口号行必须在紧凑固定高度内与主题按钮垂直居中");
assert.match(appShell, /-mx-4[^"]*border-t[^"]*px-4|border-t[^"]*-mx-4[^"]*px-4/, "桌面品牌口号分隔线必须横跨侧栏宽度，同时保持内容内边距");
assert.match(appShell, /font-normal[^"]*leading-none|leading-none[^"]*font-normal/, "桌面品牌口号必须使用纤细字重并收紧行盒");
assert.doesNotMatch(appShell, /本地优先\s*·\s*\{releaseDisplayLabel\(\)\}/, "桌面菜单底部不得继续显示旧定位与版本");

const mobileNav = read("web/src/components/mobile-nav.tsx");
assert.match(mobileNav, /\.co-mdrawer\{[^}]*box-shadow:none/s, "关闭的移动菜单不得把阴影投射到桌面页面内");
assert.match(mobileNav, /\.co-mdrawer\.open\{[^}]*box-shadow:-16px 0 48px -16px rgba\(0,0,0,\.4\)/s, "移动菜单只在打开时显示分层阴影");
assert.match(mobileNav, />择路扬帆，前程似锦</, "移动菜单底部必须显示品牌口号");
assert.match(mobileNav, /tracking-\[0\.14em\][^"]*whitespace-nowrap|whitespace-nowrap[^"]*tracking-\[0\.14em\]/, "移动品牌口号必须使用舒展且不换行的字距");
assert.match(mobileNav, /h-11[^"]*items-center[^"]*justify-between|items-center[^"]*justify-between[^"]*h-11/, "移动品牌口号行必须与主题按钮在固定高度内垂直居中");
assert.match(mobileNav, /font-normal[^"]*leading-none|leading-none[^"]*font-normal/, "移动品牌口号必须使用纤细字重并收紧行盒");
assert.doesNotMatch(mobileNav, /本地优先\s*·\s*\{releaseDisplayLabel\(\)\}/, "移动菜单底部不得继续显示旧定位与版本");
assert.doesNotMatch(appShell, /UsageMeter|usage-meter/, "桌面侧栏不得加载 Web 用量统计模块");
assert.doesNotMatch(mobileNav, /UsageMeter|usage-meter/, "移动菜单不得加载 Web 用量统计模块");
assert.equal(fs.existsSync(path.join(root, "web/src/components/usage-meter.tsx")), false, "Web 不得保留用量统计组件");
assert.equal(fs.existsSync(path.join(root, "web/src/app/api/usage/route.ts")), false, "Web 不得保留本地用量聚合接口");

const betaBanner = read("web/src/components/beta/beta-banner.tsx");
assert.match(betaBanner, /fixed bottom-3 right-3/, "问题反馈入口必须固定在页面右下角");
assert.doesNotMatch(betaBanner, /fixed bottom-3 left-3/, "问题反馈入口不得继续占用页面左下角");
assert.match(betaBanner, /onClick=\{openReport\}[\s\S]{0,360}反馈问题/, "问题反馈入口必须继续打开原有反馈流程");
assert.doesNotMatch(betaBanner, /meta\.version|meta\.sha|releaseChannelLabel/, "问题反馈入口不得继续显示版本、提交或发布通道");

const configForm = read("web/src/components/config-form.tsx");
assert.match(
  configForm,
  /function selectCli\(nextCliId: string\)[\s\S]{0,180}persistConfig\(nextCliId\)/,
  "点击已安装的 Agent 后必须立即保存为默认 CLI",
);
assert.match(
  configForm,
  /function persistConfig\(nextCliId = cliId\)[\s\S]{0,500}localStorage\.setItem\(STORAGE_KEY/,
  "设置页必须通过统一持久化路径保存 Agent 配置",
);
assert.match(configForm, /window\.dispatchEvent\(new Event\(CONFIG_CHANGED_EVENT\)\)/, "Agent 配置保存后必须广播同页面变更事件");
assert.doesNotMatch(configForm, /setCliId\(\(prev\) => prev \|\| list\.find/, "未保存配置时不得自动高亮一个尚未生效的 Agent");

for (const configConsumer of ["web/src/components/assistant-console.tsx"]) {
  const source = read(configConsumer);
  assert.match(source, /addEventListener\(CONFIG_CHANGED_EVENT,/, `${configConsumer} 必须响应同页面 Agent 配置变更`);
  assert.match(source, /removeEventListener\(CONFIG_CHANGED_EVENT,/, `${configConsumer} 卸载时必须清理 Agent 配置监听`);
}

const diagnoseView = read("web/src/components/cn-diagnose/cn-diagnose-view.tsx");
const taskFormat = read("web/src/lib/format.ts");
assert.match(diagnoseView, />岗位评估</, "岗位评估页面必须使用统一标题");
assert.doesNotMatch(diagnoseView, /China Job Diagnosis|中国岗位诊断工作流|中国大陆版岗位诊断/, "岗位评估页面不应重复强调默认市场");
assert.match(diagnoseView, /useJobs\(\)/, "岗位评估必须复用全局 Agent 任务系统");
assert.match(diagnoseView, /function isEvaluationJob/, "岗位评估页必须只筛选评估类 Agent 任务");
assert.match(taskFormat, /EVALUATION_INTENTS[\s\S]{0,100}"evaluate-job"/, "岗位评估页必须兼容 Agent 原生评估任务标识");
assert.match(diagnoseView, /return isEvaluationIntent\(job\.kind\)/, "岗位评估页必须按任务意图分类，不得按标题猜测任务类型");
assert.doesNotMatch(diagnoseView, /function isEvaluationJob[\s\S]{0,220}job\.title/, "岗位评估页不得因简历任务标题含有“评估报告”而误收该任务");
assert.match(diagnoseView, /<ScreenshotEvaluate page="\/cn-diagnose" \/>/, "岗位评估页必须从招聘截图发起 Agent 评估");
assert.doesNotMatch(diagnoseView, /function CurrentEvaluationTaskDetail|<AgentTaskDetailPanel/, "岗位评估页不得重复展示 Agent 任务详情");
assert.match(diagnoseView, />\s*历史评估报告\s*</, "岗位评估页必须使用历史评估报告标题");
assert.match(diagnoseView, /<EvaluationReportCard\s+report=\{report\}/, "历史评估报告必须使用独立报告卡片");
assert.doesNotMatch(diagnoseView, /AgentTaskListCard/, "历史评估报告不得混用 Agent 任务列表卡片");
const screenshotEvaluationPosition = diagnoseView.indexOf('<ScreenshotEvaluate page="/cn-diagnose"');
const reportsPosition = diagnoseView.indexOf('id="evaluation-reports-title"');
assert.ok(screenshotEvaluationPosition >= 0 && reportsPosition > screenshotEvaluationPosition, "招聘截图评估必须位于评估报告列表上方");
assert.doesNotMatch(diagnoseView, /正式 Agent 评估|统一正式评估模式/, "岗位评估页不得保留顶部模式组件");
assert.doesNotMatch(diagnoseView, /startJob|evaluationInput|role="tablist"|岗位描述 JD|AI 岗位评估/, "岗位评估页不得恢复旧的 Web 内执行或文本评估入口");
assert.doesNotMatch(diagnoseView, /\/api\/cn-diagnose|DiagnosisHistory|ResultPanel|诊断记录|HTML 报告|htmlUrl|htmlRel/, "岗位评估页面不得保留旧诊断 API、即时结果或 HTML 历史");
assert.equal(fs.existsSync(path.join(root, "web/src/app/api/cn-diagnose/route.ts")), false, "旧 cn-diagnose API 必须移除");
assert.equal(fs.existsSync(path.join(root, "web/src/lib/cn-diagnose.ts")), false, "旧 HTML 报告渲染器必须移除");

const runApi = read("web/src/app/api/run/route.ts");
assert.match(runApi, /modes\/zh\/_shared\.md/, "正式评估任务必须加载中文共享评估规则");
assert.match(runApi, /modes\/zh\/oferta\.md/, "正式评估任务必须加载中文岗位评估模式");
assert.match(runApi, /node career-one\.mjs reserve-report-num/, "正式评估任务必须保留统一报告编号流程");
assert.match(runApi, /node career-one\.mjs merge/, "正式评估任务必须写入统一求职进度");
assert.match(runApi, /reports\/\{num\}/, "正式评估任务必须写入标准 Markdown 报告");
assert.doesNotMatch(runApi, /EvaluationInput|screenshotDataUrls|renderChinaDiagnosisHtml|diagnosis-history\.json|markets\/china-mainland\/output/, "统一执行器不得保留已下线的 Web 截图评估或旧 HTML 诊断链路");
assert.match(runApi, /kind === "pdf"[\s\S]{0,260}status:\s*409/, "Web 执行器必须拒绝直接拉起 Agent 生成 PDF");

const agentRunsApi = read("web/src/app/api/agent-runs/route.ts");
assert.match(agentRunsApi, /action === "queue"/, "共享任务接口必须提供 Web 到 Agent 的排队入口");
assert.match(agentRunsApi, /rootScript\("agent-inbox"\)/, "Web 排队任务必须写入本地 Agent 待办");
assert.match(agentRunsApi, /pushOption\(args,\s*"--instruction",\s*instruction\)/, "共享任务接口必须把原始 Agent 指令持久化到同一个任务");
assert.match(agentRunsApi, /path\.basename\(id\)/, "任务附件目录必须丢弃用户输入中的路径组成部分");
assert.match(agentRunsApi, /fs\.realpathSync\(taskDir\)/, "任务附件写入前必须校验真实目录边界");
assert.match(agentRunsApi, /fs\.lstatSync\(taskDir\)\.isSymbolicLink\(\)/, "任务附件目录不得接受符号链接");

const gitignore = read(".gitignore");
for (const privatePath of ["article-digest.md", "task_plan.md", "findings.md", "progress.md", "/*.png"]) {
  assert.match(gitignore, new RegExp(`^${privatePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"), `必须默认忽略本地文件：${privatePath}`);
}
const noUserDataWorkflow = read(".github/workflows/no-user-data.yml");
assert.match(noUserDataWorkflow, /\^modes\\\/_custom\\\.md\$/, "PR 用户数据门禁必须覆盖 modes/_custom.md");
const rootTestSuite = read("test-all.mjs");
assert.doesNotMatch(rootTestSuite, /const leakPatterns\s*=/, "公开测试不得硬编码旧身份标识");
assert.match(rootTestSuite, /trackedUserLayerFiles/, "根测试必须按用户层路径阻止隐私文件被跟踪");
assert.match(rootTestSuite, /highConfidenceSecretPatterns/, "根测试必须扫描公开文件中的高置信度凭据");

const jobStore = read("web/src/components/jobs/job-store.tsx");
assert.match(jobStore, /queueAgentTask/, "全局任务系统必须提供 Agent 原生任务排队能力");
assert.match(jobStore, /action:\s*"queue"/, "Agent 原生任务必须进入 queued 状态，而不是直接执行");
assert.match(jobStore, /runStatus:\s*run\.status/, "Web 必须保留 queued、running 等共享任务原始状态");
assert.match(jobStore, /instruction:\s*run\.instruction/, "Web 必须恢复任务最初的 Agent 交接指令");
assert.match(jobStore, /buildExistingTaskInstruction/, "任务详情页必须能够从原任务恢复续接指令");
assert.match(jobStore, /已有待办任务 ID/, "续接指令必须明确声明这是已有任务");
assert.match(jobStore, /不要创建新任务/, "续接指令必须阻止 Agent 重复创建任务");

assert.match(jobDetailPage, /buildExistingTaskInstruction\(job\)/, "任务详情页必须复用当前任务 ID 构建续接指令");
assert.match(jobDetailPage, /复制并交给 Agent|复制续接指令/, "任务详情页必须提供可见的 Agent 续接按钮");
assert.match(jobDetailPage, /如果原 Agent 仍在执行/, "运行中的任务必须提醒用户不要重复启动");
assert.doesNotMatch(jobDetailPage, /queueAgentTask|action:\s*"queue"/, "任务详情页复制指令不得创建新任务");

const generatePdfButton = read("web/src/components/generate-pdf-button.tsx");
assert.match(generatePdfButton, /queueAgentTask/, "定制简历按钮必须把任务交给用户自己的 Agent");
assert.match(generatePdfButton, />\s*在 Agent 中生成\s*</, "定制简历的默认入口必须明确显示在 Agent 中生成");
assert.match(generatePdfButton, /任务已加入 Agent 待办/, "PDF 交接完成后必须明确告知任务已进入待办");
assert.match(generatePdfButton, /复制指令/, "PDF 交接弹窗必须提供可靠的指令复制入口");
assert.doesNotMatch(generatePdfButton, /\bstartJob\b/, "定制简历按钮不得再从 Web 直接启动 Agent CLI");

const actionRegistry = read("web/src/app/actions/registry.ts");
assert.match(actionRegistry, /generatePdf:[\s\S]{0,600}queueAgentTask/, "Web 助手生成 PDF 动作也必须进入 Agent 待办");
assert.doesNotMatch(actionRegistry, /generatePdf:[\s\S]{0,600}ctx\.startJob/, "Web 助手不得绕过待办直接生成 PDF");

const assistantApi = read("web/src/app/api/assistant/route.ts");
assert.match(assistantApi, /generatePdf[\s\S]{0,220}Agent 待办/, "Web 助手必须把 PDF 动作解释为 Agent 待办交接");

const careerOneSkill = read(".agents/skills/career-one/SKILL.md");
assert.match(careerOneSkill, /Web 工作台不得直接启动 Agent CLI/, "Skill 必须明确 Web 只交接、不直接执行 Agent 任务");
assert.match(careerOneSkill, /已有待办任务 ID[\s\S]{0,260}run progress/, "Skill 必须指导 Agent 接手已有 queued 任务而不是重复创建");

const careerOneLib = read("web/src/lib/career-one.ts");
assert.doesNotMatch(careerOneLib, /ReportLocale|reports["'],\s*locale/, "每份报告必须是独立记录，不能把中文报告建模为同编号的语言变体");

const pipelineDetail = read("web/src/app/pipeline/[id]/page.tsx");
assert.doesNotMatch(pipelineDetail, /zh-CN|lang=/, "求职详情不得提供同一记录的语言切换");
assert.match(pipelineDetail, /view === "report"/, "求职详情必须把岗位评估报告作为独立视图");

const pipelineView = read("web/src/components/pipeline-view.tsx");
assert.match(pipelineView, /const TABS = \[\s*"ALL",\s*"INBOX",/, "求职进度必须把“全部”放在标签导航首位");
assert.match(pipelineView, /const tab: Tab = [^\n]+ : "ALL";/, "裸 /pipeline 页面必须默认停留在“全部”标签");
assert.match(pipelineView, /setParams\(\{ tab: t === "ALL" \? null : t \}\)/, "“全部”必须使用无 tab 参数的规范 URL");
assert.match(pipelineView, /import \{ StatusSelect \} from "@\/components\/status-select"/, "求职进度列表必须复用统一状态写回组件");
assert.match(pipelineView, /<StatusSelect\s+n=\{r\.n\}\s+current=\{r\.status\}/, "用户必须能在求职进度列表直接修改每条记录的状态");
assert.match(pipelineView, /showLabel=\{false\}/, "列表内状态选择器不得重复显示状态标签");
assert.match(pipelineView, /compact/, "列表内状态选择器必须使用紧凑反馈样式");
assert.doesNotMatch(pipelineView, /const STATUS_LABELS/, "求职进度列表不得复制状态标签映射");

const statusSelect = read("web/src/components/status-select.tsx");
assert.match(statusSelect, /aria-label=\{ariaLabel\}/, "状态下拉框必须提供可访问名称");
assert.match(statusSelect, /compact \?/, "统一状态选择器必须提供列表紧凑反馈模式");

const reportView = read("web/src/components/report-view.tsx");
assert.match(reportView, /<ReportBackButton\s*\/>/, "评估报告必须使用浏览历史返回组件");
assert.doesNotMatch(reportView, /href="\/pipeline"[\s\S]{0,160}求职进度/, "评估报告不得把返回入口固定为求职进度");
assert.match(pipelineView, /export function ReportBackButton/, "求职进度客户端模块必须提供报告返回组件");
assert.match(pipelineView, /window\.history\.length > 1[\s\S]{0,120}router\.back\(\)/, "评估报告存在上一页时必须返回真实入口");
assert.match(pipelineView, /router\.replace\("\/pipeline"\)/, "直接打开评估报告时必须提供安全回退");
assert.doesNotMatch(reportView, /报告语言|>中文<|>原文</, "中文和英文报告是两条记录，不得渲染语言 Tab");
assert.match(reportView, /function isWebHiddenSection[\s\S]{0,160}machine summary/i, "求职详情必须识别 Web 端隐藏的机器摘要");
assert.match(reportView, /rest\.filter\(\(s\) => !isWebHiddenSection\(s\.heading\)\)/, "求职详情必须在 Web 渲染前过滤机器摘要");
assert.doesNotMatch(reportView, /"machine summary": "机器摘要"/, "求职详情不得继续暴露机器摘要标题");
assert.match(reportView, /评估规则-面向求职者/, "求职详情必须使用面向求职者的评估规则分隔标题");
assert.doesNotMatch(reportView, /技术细节 · 面向开发者/, "求职详情不得继续使用面向开发者的技术细节标题");
assert.match(reportView, /"面试开场话术": "打招呼话术"/, "求职详情必须把历史报告的旧标题映射为打招呼话术");
assert.match(reportView, /"建议向猎头追问": "向招聘方追问"/, "求职详情必须把历史报告的猎头标题映射为招聘方标题");
assert.match(reportView, /"建议向招聘方追问": "向招聘方追问"/, "求职详情必须把历史报告的建议追问标题映射为新标题");
assert.match(reportView, /"必须追问": "向招聘方追问"/, "求职详情必须把即时报告的旧追问标题映射为新标题");
assert.match(reportView, /"沟通后的分流规则": "沟通后分流规则"/, "求职详情必须把旧分流标题映射为新标题");
assert.match(reportView, /"岗位概览": "岗位预览"/, "求职详情必须把历史报告的岗位概览显示为岗位预览");
assert.match(reportView, /function arrangeReportSections/, "求职详情必须统一重排新旧岗位报告模块");
assert.match(reportView, /insertSubsectionBefore/, "求职详情必须把匹配雷达放到能力与缺口补强上方");
assert.match(reportView, /const positiveSignals = take\(\/\^正向信号\$\/,\s*bExists\)/, "求职详情必须把历史报告的独立正向信号收进简历匹配分析");
assert.match(reportView, /insertSubsectionBefore\(content,\s*"正向信号",\s*positiveSignalsContent\)/, "求职详情必须把正向信号放到匹配雷达下方");
assert.match(reportView, /moveSectionAfter\([\s\S]*section\.letter === "G"[\s\S]*section\.letter === "D"/, "求职详情必须把职位真实性评估移动到薪酬竞争力与市场需求下方");
assert.match(reportView, /for \(const letter of \["E", "F"\]\)/, "求职详情必须成组提取针对性定制方案和面试备考计划");
assert.match(reportView, /arranged\.splice\(deferredInsertIndex,\s*0,\s*\.\.\.deferredSections\)/, "求职详情必须把针对性定制方案和面试备考计划放到沟通后分流规则下方");
assert.match(reportView, /const expanded = !anyAB && i === 0;/, "岗位预览和简历匹配分析必须与其他章节一致使用默认收起的抽屉");
assert.match(
  reportView,
  /<span className="shrink-0 whitespace-nowrap text-sm font-medium">\s*<span className="tabular-nums">\{i \+ 1\}、<\/span>\s*\{cleanHeading\(s\.heading\)\}\s*<\/span>/,
  "求职详情的用户可见模块必须按实际顺序展示紧凑中文编号",
);
assert.doesNotMatch(
  reportView,
  /className="[^"]*bg-brand-soft[^"]*"[\s\S]{0,100}\{i \+ 1\}/,
  "求职详情的连续编号不得使用额外色块背景",
);
assert.match(reportView, /heading\.match\(\/\^\(\?:Block/, "求职详情必须继续解析内部 A-G 模块 ID 以兼容历史报告");
assert.match(reportView, /shrink-0[^"]*whitespace-nowrap|whitespace-nowrap[^"]*shrink-0/, "求职详情抽屉标题必须保持单行且不得参与压缩");
assert.match(reportView, /min-w-0[^"]*flex-1[^"]*truncate|flex-1[^"]*min-w-0[^"]*truncate/, "求职详情抽屉副标题必须优先压缩并截断");
assert.ok(
  taskFormat.includes("const ORDERED_LIST_ITEM = /^\\s*\\d+\\s*[.)、）]"),
  "求职详情预览必须识别常见中文与西文有序列表标记",
);
assert.match(reportView, /const teaser = reportSectionPreview\(s\.content\)/, "求职详情抽屉必须通过共享格式化方法计算可选副标题");
assert.match(reportView, /\{teaser && \(/, "有序列表等无有效预览内容时不得渲染空洞副标题");
assert.match(reportView, /verdict\|结论\|最终建议/, "求职详情只能按明确标题识别结论章节");
assert.match(reportView, /verdict && \([\s\S]{0,220}border border-border bg-surface\/30/, "结论卡片必须使用与下方抽屉一致的中性背景和边框");
assert.match(reportView, /<p className="mb-2 text-lg font-bold text-foreground">结论<\/p>/, "结论标题必须使用加大、加粗的前景色文字");
assert.doesNotMatch(reportView, /<p className="[^"]*text-brand[^"]*">结论<\/p>/, "结论标题不得继续使用品牌黄色");
assert.doesNotMatch(reportView, /find\(\(s\) => s\.letter === "F"\)/, "F 章节可能是面试计划，不能固定当作结论");

const scoreMethodology = read("web/src/components/score-methodology.tsx");
assert.doesNotMatch(scoreMethodology, /career-one\.org\/methodology/, "评分说明不得链接到失效的外部方法页");
assert.doesNotMatch(scoreMethodology, /查看上游完整方法说明/, "评分说明不得继续显示误导性的上游链接");
assert.match(scoreMethodology, /const SCORING_FACTORS/, "评分说明必须把评分因子与综合判断分开建模");
assert.match(scoreMethodology, /5 个评分因子/, "评分说明必须展示五因子评分模型");
for (const factor of ["简历匹配度", "职业方向", "职级与职责", "薪酬竞争力", "组织与文化"]) {
  assert.match(scoreMethodology, new RegExp(factor), `评分说明必须展示评分因子：${factor}`);
}
assert.doesNotMatch(scoreMethodology, /\["风险信号",/, "风险信号不得继续作为数值评分因子");
assert.match(scoreMethodology, /综合判断/, "评分说明必须解释综合判断");
assert.match(scoreMethodology, /真实性评级不修改数值分/, "评分说明必须明确真实性评级不修改匹配分");
assert.match(scoreMethodology, /const REPORT_MODULES/, "评分说明必须按用户可见顺序单独建模报告模块");
assert.doesNotMatch(scoreMethodology, /const BLOCKS|\["[A-G]",/, "评分说明不得向用户暴露内部 A-G 模块 ID");
assert.doesNotMatch(scoreMethodology, /G 的职位真实性评级/, "评分说明的用户可见文案不得继续引用内部字母 ID");
assert.match(scoreMethodology, /REPORT_MODULES\.map\(\(description, index\)/, "评分说明必须按模块数组顺序生成连续数字");
assert.match(scoreMethodology, /aria-hidden="true"[\s\S]{0,240}\{index \+ 1\}/, "评分说明必须显示连续数字序号");
for (const moduleTitle of [
  "岗位预览",
  "简历匹配分析",
  "级别判断与求职策略",
  "薪酬竞争力与市场需求",
  "职位真实性评估",
  "打招呼话术",
  "向招聘方追问",
  "你在这个岗位里的最佳表达",
  "沟通后分流规则",
  "针对性定制方案",
  "面试备考计划",
]) {
  assert.match(scoreMethodology, new RegExp(moduleTitle), `评分说明必须按当前报告顺序展示模块：${moduleTitle}`);
}

const chineseScoringRules = read("modes/zh/_shared.md");
assert.match(chineseScoringRules, /5 个评分因子/, "中文共享规则必须使用五因子评分模型");
assert.match(chineseScoringRules, /\| 职级与职责匹配度 .* \|/, "中文共享规则必须增加职级与职责评分");
assert.doesNotMatch(chineseScoringRules, /^\| 红线警告 .* \|$/m, "中文共享规则不得把风险作为数值评分因子");
assert.match(chineseScoringRules, /最终建议.*综合匹配分.*职位真实性评级/s, "中文共享规则必须组合匹配分与真实性评级形成最终建议");

const englishScoringRules = read("modes/_shared.md");
assert.match(englishScoringRules, /5 scoring factors/, "英文共享规则必须使用五因子评分模型");
assert.match(englishScoringRules, /\| Level and responsibility fit \|/, "英文共享规则必须增加职级与职责评分");
assert.doesNotMatch(englishScoringRules, /^\| Red flags \|/m, "英文共享规则不得把风险作为数值评分因子");
assert.match(englishScoringRules, /final recommendation.*global match score.*posting legitimacy/is, "英文共享规则必须组合匹配分与真实性评级形成最终建议");

const batchPrompt = read("batch/batch-prompt.md");
assert.match(batchPrompt, /\| Level and responsibilities \| X\/5 \|/, "批处理提示必须输出职级与职责评分");
assert.doesNotMatch(batchPrompt, /^\| Red flags \|/m, "批处理提示不得继续用风险扣减匹配分");

const patternAnalyzer = read("scripts/analysis/analyze-patterns.mjs");
assert.match(patternAnalyzer, /levelResponsibilityRegex/, "历史分析器必须能解析新的职级与职责评分");
assert.match(patternAnalyzer, /legacyRedFlagsRegex/, "历史分析器必须保留旧报告风险分的兼容解析");

const explorerView = read("web/src/components/explore/explorer-view.tsx");
assert.match(explorerView, /function ScreenshotEvaluate[\s\S]{0,12000}<Button\s+[\s\S]{0,120}ref=\{triggerRef\}/, "截图评估主动作必须复用共享 Button");
assert.match(buttonSource, /primary:\s*"[^"]*bg-brand[^"]*hover:bg-brand-200/, "共享主按钮 hover 必须复用加深的品牌色");
assert.doesNotMatch(explorerView, /function ScreenshotEvaluate[\s\S]{0,9000}hover:brightness-110/, "截图评估主按钮 hover 不得通过提高亮度变浅");
assert.match(explorerView, /function SearchKeywordsCard/, "发现岗位必须展示已确认的搜索标签");
assert.match(explorerView, /selectTargetRoleTags\(filters\.positive, MAX_TARGET_ROLE_TAGS\)/, "发现岗位必须从画像筛选目标岗位标签");
assert.match(explorerView, /navigator\.clipboard\.writeText\(formatJobSearchKeywords\(values\)\)/, "搜索标签必须支持复制到招聘平台");
assert.match(explorerView, /已根据 \$\{seededFrom\.join\(" \+ "\)\} 整理/, "搜索标签必须说明已确认的信息来源");
assert.doesNotMatch(explorerView, /function DiscoverBar|function SaveSettingsBar|action:\s*"save-rules"/, "发现岗位不得恢复旧的链接评估或页面内规则保存组件");
assert.match(explorerView, /<h1 className="page-title">发现岗位<\/h1>/, "发现岗位必须保留统一中文标题");

const filterBuilder = read("web/src/components/explore/filter-builder.tsx");
assert.match(filterBuilder, /useState\(true\)/, "地区与扫描范围必须默认展开");
assert.match(filterBuilder, /aria-label={`复制全部\$\{label\}`}/, "岗位关键词复制按钮必须复用同一交互组件");
assert.match(filterBuilder, /label="目标岗位"/, "目标岗位必须保留复制按钮");
assert.match(explorerView, /<SearchTagGroup label="排除关键词" values=\{filters\.negative\} tone="negative" \/>/, "排除关键词必须提供复制按钮");
for (const [name, host] of [
  ["BOSS直聘", "www.zhipin.com"],
  ["猎聘", "www.liepin.com"],
  ["脉脉", "maimai.cn"],
  ["智联招聘", "www.zhaopin.com"],
]) {
  const sourceIndex = filterBuilder.indexOf(`name: "${name}"`);
  assert.notEqual(sourceIndex, -1, `搜索渠道必须声明${name}`);
  assert.ok(
    filterBuilder.slice(sourceIndex, sourceIndex + 240).includes(`https://${host}`),
    `搜索渠道必须提供${name}官网入口`,
  );
}
for (const removedChannel of ["公共招聘平台", "用户主动采集", "前程无忧"]) {
  assert.doesNotMatch(filterBuilder, new RegExp(removedChannel), `搜索渠道不得继续显示${removedChannel}`);
}
assert.match(filterBuilder, /target="_blank"[\s\S]{0,80}rel="noreferrer"/, "招聘平台官网入口必须安全地在新窗口打开");

const explorePortals = read("web/src/lib/core/portals.ts");
assert.match(explorePortals, /profileLocation[\s\S]{0,500}filters\.alwaysAllow\s*=\s*\[profileCity\]/, "地区为空时必须从 Agent 维护的个人画像填入已确认城市");

const reportFormat = read("web/src/lib/format.ts");
assert.match(reportFormat, /高置信度/, "求职详情必须本地化岗位真实性等级");
assert.match(reportFormat, /Offer:\s*"已获 Offer"/, "求职详情必须本地化 Offer 状态");

assert.match(chineseOfferMode, /^# 评估报告:/m, "中文版报告模板必须使用中文标题");
assert.match(chineseOfferMode, /^## F\) 面试备考计划/m, "中文版报告模板必须包含中文面试备考内容");
const trackerMerger = read("scripts/tracker/merge-tracker.mjs");
assert.match(trackerMerger, /function extractReportLanguage/, "合并器必须识别报告语言标签");
assert.match(
  trackerMerger,
  /additionLanguage\s*=\s*extractReportLanguage[\s\S]*existingLanguage\s*=\s*extractReportLanguage/,
  "合并器不得把不同语言的同岗位报告折叠为一条记录",
);
assert.match(
  read("scripts/system/verify-pipeline.mjs"),
  /language\s*=\s*e\.notes\.match\(\/\\\[report-language:/,
  "流水线校验器必须按报告语言区分独立记录",
);

const portalsPage = read("web/src/app/portals/page.tsx");
assert.match(portalsPage, />岗位来源</, "招聘来源页面必须使用不误导的‘岗位来源’名称");
assert.match(
  portalsPage,
  /这里保留历史岗位来源设置，不会自动爬取或启动 Agent 搜索。请在招聘网站自行找到职位，再到“岗位评估”提交招聘截图或完整 JD。/,
  "岗位来源页面必须准确说明本地设置不会自动爬取或启动 Agent",
);

for (const headerFile of [
  "web/src/app/portals/page.tsx",
  "web/src/app/apply/page.tsx",
  "web/src/components/cn-diagnose/cn-diagnose-view.tsx",
  "web/src/components/pipeline-view.tsx",
  "web/src/app/interview/page.tsx",
  "web/src/components/cv-editor.tsx",
  "web/src/components/config-form.tsx",
  "web/src/app/jobs/page.tsx",
  "web/src/components/home/today-dashboard.tsx",
  "web/src/components/home/first-run-home.tsx",
]) {
  const source = read(headerFile);
  const heading = source.indexOf("<h1");
  assert.ok(heading >= 0, `${headerFile} 必须包含页面主标题`);
}
assert.doesNotMatch(
  read("web/src/components/cn-diagnose/cn-diagnose-view.tsx"),
  /<header[^>]*>[\s\S]{0,500}<div className="relative max-w-4xl">/,
  "岗位诊断标题内容不得通过中间容器限制宽度",
);

for (const tab of ["招聘平台", "目标公司", "搜索规则"]) {
  assert.match(portalsView, new RegExp(tab), `岗位来源页面必须包含${tab}标签`);
}
const portalsApi = read("web/src/app/api/portals/route.ts");
for (const platform of ["BOSS直聘", "猎聘", "脉脉", "智联招聘", "前程无忧"]) {
  assert.match(`${portalsView}\n${portalsApi}`, new RegExp(platform), `招聘平台标签必须包含${platform}`);
}

assert.match(portalsApi, /export async function GET\(/, "岗位来源 API 必须提供本地配置读取接口");
assert.match(portalsApi, /recruitment_platforms/, "招聘平台必须与技术 job_boards 分开保存");
assert.match(portalsApi, /add-company/, "目标公司必须支持用户自定义添加");
assert.match(portalsApi, /save-rules/, "现有搜索规则必须支持从 Web 保存");

assert.ok(
  fs.existsSync(path.join(root, ".agents/skills/career-one/SKILL.md")),
  "必须保留唯一的 career-one Skill",
);

const profileExample = read("config/profile.example.yml");
assert.match(profileExample, /primary:\s*zh-CN/, "默认语言必须是 zh-CN");
assert.match(profileExample, /modes_dir:\s*modes\/zh/, "默认模式目录必须是 modes/zh");

const scaffolder = json("scaffolder/package.json");
assert.equal(scaffolder.name, "career-one", "npm 安装器必须占用 career-one 发布命名空间");
assert.equal(scaffolder.version, runtimeReleaseConfig.version, "npm 安装器必须与发布配置一致");
assert.equal(scaffolder.author.name, "NumberX", "npm 安装器必须声明当前维护者");
assert.equal(scaffolder.contributors, undefined, "npm 安装器的上游署名只保留在 LICENSE");
assert.equal(scaffolder.bin["career-one"], "bin/cli.mjs", "脚手架必须暴露 career-one 命令");
assert.deepEqual(Object.keys(scaffolder.bin), ["career-one"], "脚手架不得保留旧命令别名");
assert.ok(scaffolder.files.includes("LICENSE"), "npm 安装器必须打包完整 MIT LICENSE");
assert.equal(
  scaffolder.repository.url,
  "git+https://github.com/luyu925065781/career-one.git",
  "npm 安装器必须指向择程AI自己的 GitHub 仓库",
);

const updater = read("update-system.mjs");
assert.match(updater, /github\.com\/luyu925065781\/career-one\.git/, "更新器必须从择程AI仓库获取系统更新");
assert.match(updater, /RAW_VERSION_URL\('develop'\)/, "开发通道更新检查必须读取 develop 分支版本");
assert.match(updater, /RELEASES_LATEST_API/, "正式通道更新检查必须读取最新稳定 Release");

const scaffolderCli = read("scaffolder/bin/cli.mjs");
const scaffolderInstallerCore = read("scaffolder/bin/installer-core.mjs");
assert.match(
  scaffolderInstallerCore,
  /REPOSITORY_URL\s*=\s*["']https:\/\/github\.com\/luyu925065781\/career-one\.git["']/,
  "安装器仓库常量必须指向择程AI仓库",
);
assert.match(
  scaffolderCli,
  /const cloneArgs = \["clone", "--depth=1", `--branch=\$\{tag\}`, "--", REPOSITORY_URL, target\]/,
  "安装器必须使用统一仓库常量，并在仓库与目录参数前结束 Git 选项解析",
);

const storyBankModule = await import(pathToFileURL(path.join(root, "web/src/lib/story-bank.mjs")));
const adversarialWhitespace = "\t".repeat(50_000);
const adversarialStoryBank = `# 面试故事库\n\n## S01${adversarialWhitespace}·${adversarialWhitespace}线性解析验证\n\n### S 情境\n\n- 安全测试\n`;
assert.deepEqual(
  storyBankModule.parseStoryBank(adversarialStoryBank).stories.map(({ id, title }) => ({ id, title })),
  [{ id: "S01", title: "线性解析验证" }],
  "故事库解析器必须能在线性时间内处理超长不可信空白输入",
);
assert.match(
  readme,
  /git clone https:\/\/github\.com\/luyu925065781\/career-one\.git/,
  "中文 README 必须展示真实可用的公开仓库获取方式",
);

const releaseConfig = json("release-please-config.json");
assert.equal(releaseConfig.packages["."]["package-name"], "career-one", "Release Please 主组件必须使用 career-one");

const releaseWorkflow = read(".github/workflows/release.yml");
assert.match(releaseWorkflow, /workflow_dispatch:/, "发布构建必须由维护者手动触发");
assert.doesNotMatch(releaseWorkflow, /\n\s+push:/, "发布工作流不得在每次 main push 时自动运行");
assert.match(releaseWorkflow, /npm run build:distributions/, "发布构建必须生成 Codex 与 WorkBuddy 安装包");

const sbomWorkflow = read(".github/workflows/sbom.yml");
assert.match(sbomWorkflow, /career-one-sbom\.spdx\.json/, "SBOM 资产必须使用 career-one 命名空间");
assert.doesNotMatch(sbomWorkflow, /gh release upload/, "Anchore 已上传 Release 资产，不得再次重复上传");

console.log("career-one migration contract: ok");
