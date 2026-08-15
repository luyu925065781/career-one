#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLED_RUNTIME = join(SKILL_ROOT, "assets", "runtime");
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";
const MIN_NODE_VERSION = "20.9.0";

function nodeVersionAtLeast(version, minimum) {
  const current = version.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const required = minimum.split(".").map((part) => Number.parseInt(part, 10) || 0);
  for (let index = 0; index < Math.max(current.length, required.length); index++) {
    if ((current[index] || 0) > (required[index] || 0)) return true;
    if ((current[index] || 0) < (required[index] || 0)) return false;
  }
  return true;
}

if (!nodeVersionAtLeast(process.versions.node, MIN_NODE_VERSION)) {
  console.error(
    `择程AI需要 Node.js ${MIN_NODE_VERSION} 或更高版本（当前为 v${process.versions.node}）。` +
      "推荐安装 Node.js 22 LTS 或更新的 LTS 版本。",
  );
  process.exit(2);
}

const COMMANDS = {
  "agent-inbox": { script: "scripts/agent/agent-inbox.mjs", defaults: ["list"] },
  add: { script: "scripts/application/add-entry.mjs", defaults: [] },
  "application-answers": { script: "scripts/application/application-answers.mjs", defaults: [] },
  archive: { script: "scripts/application/archive-posting.mjs", defaults: [] },
  "build-cv-latex": { script: "scripts/generate/build-cv-latex.mjs", defaults: [] },
  "build-dashboard": { script: "scripts/system/build-dashboard.mjs", defaults: [] },
  "classify-tier": { script: "scripts/scan/classify-tier.mjs", defaults: [] },
  "cover-letter": { script: "scripts/generate/generate-cover-letter.mjs", defaults: [] },
  dedup: { script: "scripts/tracker/dedup-tracker.mjs", defaults: [] },
  doctor: { script: "doctor.mjs", defaults: ["--json"] },
  extract: { script: "scripts/liveness/browser-extract.mjs", defaults: [] },
  verify: { script: "scripts/system/verify-pipeline.mjs", defaults: [] },
  "verify-portals": { script: "scripts/system/verify-portals.mjs", defaults: [] },
  "validate-portals": { script: "scripts/system/validate-portals.mjs", defaults: [] },
  "validate-plugin-registry": { script: "scripts/plugins/validate-plugin-registry.mjs", defaults: [] },
  "followup-seed": { script: "scripts/tracker/followup-seed.mjs", defaults: [] },
  "followup-cadence": { script: "scripts/analysis/followup-cadence.mjs", defaults: [] },
  gemini: { script: "scripts/integrations/gemini-eval.mjs", defaults: [] },
  "invite-match": { script: "scripts/tracker/invite-match.mjs", defaults: [] },
  latex: { script: "scripts/generate/generate-latex.mjs", defaults: [] },
  liveness: { script: "scripts/liveness/check-liveness.mjs", defaults: [] },
  merge: { script: "scripts/tracker/merge-tracker.mjs", defaults: [] },
  normalize: { script: "scripts/tracker/normalize-statuses.mjs", defaults: [] },
  ollama: { script: "scripts/integrations/ollama-eval.mjs", defaults: [] },
  openai: { script: "scripts/integrations/openai-eval.mjs", defaults: [] },
  openrouter: { script: "scripts/integrations/openrouter-runner.mjs", defaults: [] },
  patterns: { script: "scripts/analysis/analyze-patterns.mjs", defaults: [] },
  scan: { script: "scripts/scan/scan.mjs", defaults: [] },
  "scan-full": { script: "scripts/scan/scan-ats-full.mjs", defaults: [] },
  tracker: { script: "scripts/tracker/tracker.mjs", defaults: [] },
  find: { script: "scripts/tracker/find.mjs", defaults: [] },
  pdf: { script: "scripts/generate/generate-pdf.mjs", defaults: [] },
  plugins: { script: "scripts/plugins/plugins.mjs", defaults: ["list"] },
  "plugin-audit": { script: "scripts/plugins/plugin-audit.mjs", defaults: [] },
  "plugin-install": { script: "scripts/plugins/plugin-install.mjs", defaults: [] },
  "prepare-application": { script: "scripts/application/prepare-application.mjs", defaults: [] },
  "process-quality": { script: "scripts/analysis/process-quality.mjs", defaults: [] },
  reconcile: { script: "scripts/tracker/reconcile-pipeline.mjs", defaults: [] },
  release: { script: "scripts/system/release.mjs", defaults: ["status"] },
  "reply-watch": { script: "scripts/application/reply-watch.mjs", defaults: [] },
  reposts: { script: "scripts/analysis/detect-reposts.mjs", defaults: [] },
  "reserve-report-num": { script: "scripts/tracker/reserve-report-num.mjs", defaults: [] },
  "salary-gap": { script: "scripts/analysis/salary-gap.mjs", defaults: [] },
  "set-status": { script: "scripts/tracker/set-status.mjs", defaults: [] },
  star: { script: "scripts/application/match-star.mjs", defaults: [] },
  stats: { script: "scripts/analysis/stats.mjs", defaults: [] },
  "sync-check": { script: "scripts/system/cv-sync-check.mjs", defaults: [] },
  cn: { script: "scripts/tracker/market-cn.mjs", defaults: ["status"] },
  status: { script: "scripts/tracker/market-cn.mjs", defaults: ["status"] },
  run: { script: "scripts/agent/agent-runs.mjs", defaults: ["list"] },
  web: { script: "start-web.mjs", defaults: ["--open"], alwaysDefaults: true },
};

const HELP = `择程AI（career-one）便携命令

用法：
  career-one.mjs init [目录] [--skip-install]  初始化本地求职工作区
  career-one.mjs locate [--workspace 目录]    定位当前求职工作区
  career-one.mjs doctor [参数]                检查工作区
  career-one.mjs verify [参数]                验证求职数据
  career-one.mjs scan [参数]                  运行公开来源扫描
  career-one.mjs tracker [参数]               查询求职进度
  career-one.mjs find [参数]                  查找报告或岗位
  career-one.mjs pdf [参数]                   生成 PDF
  career-one.mjs status                       查看中国大陆工作区状态
  career-one.mjs run [start|progress|wait|complete|fail|list|propose|approve|reject]
                                              记录 Agent/Web 共享任务与待确认修改
  career-one.mjs web [--page /页面]             启动或复用工作台并打开指定页面
  career-one.mjs version                      显示运行时版本

岗位评估、简历定制和面试准备属于 Agent 工作流，由 SKILL.md 调度。`;

function fail(message, code = 1) {
  console.error(`择程AI：${message}`);
  process.exit(code);
}

function optionValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : null;
}

function withoutOption(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return [...args];
  return args.filter((_, itemIndex) => itemIndex !== index && itemIndex !== index + 1);
}

function findWorkspace(start) {
  let current = resolve(start);
  while (true) {
    if (existsSync(join(current, "AGENTS.md")) && existsSync(join(current, "doctor.mjs"))) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function resolveWorkspace(args) {
  const explicit = optionValue(args, "--workspace") || process.env.CAREER_ONE_WORKSPACE;
  const workspace = explicit ? resolve(explicit) : findWorkspace(process.cwd());
  if (!workspace) fail("当前目录不是择程AI工作区。请先运行 init，或传入 --workspace <目录>。");
  return workspace;
}

function run(command, args) {
  const spec = COMMANDS[command];
  const workspace = resolveWorkspace(args);
  const forwarded = withoutOption(args, "--workspace");
  const finalArgs = spec.alwaysDefaults
    ? [...spec.defaults, ...forwarded]
    : forwarded.length ? forwarded : spec.defaults;
  const script = join(workspace, spec.script);
  if (!existsSync(script)) fail(`工作区缺少 ${spec.script}，请重新安装或更新择程AI。`);
  const result = spawnSync(process.execPath, [script, ...finalArgs], { cwd: workspace, stdio: "inherit" });
  if (result.error) fail(result.error.message);
  process.exit(result.status ?? 1);
}

function init(args) {
  const positional = args.find((arg) => !arg.startsWith("-"));
  const target = resolve(positional || "career-one");
  const skipInstall = args.includes("--skip-install");

  if (!existsSync(BUNDLED_RUNTIME)) {
    fail("当前 Skill 不包含运行时资源。请安装 Codex Plugin 或 WorkBuddy 完整技能包。", 2);
  }
  if (existsSync(target) && readdirSync(target).length > 0) {
    fail(`目标目录 ${target} 不是空目录；为保护已有文件，初始化已停止。`, 2);
  }

  mkdirSync(target, { recursive: true });
  cpSync(BUNDLED_RUNTIME, target, { recursive: true, force: false, errorOnExist: true });

  if (!skipInstall) {
    const install = spawnSync(NPM, ["install", "--ignore-scripts"], { cwd: target, stdio: "inherit" });
    if (install.error || install.status !== 0) {
      fail(`工作区已创建，但依赖安装失败。请进入 ${target} 后运行 npm install --ignore-scripts。`);
    }
    const webDir = join(target, "web");
    if (existsSync(join(webDir, "package.json"))) {
      const webInstall = spawnSync(NPM, ["install", "--ignore-scripts"], { cwd: webDir, stdio: "inherit" });
      if (webInstall.error || webInstall.status !== 0) {
        fail(`基础工作区已创建，但 Web 依赖安装失败。请进入 ${webDir} 后运行 npm install --ignore-scripts。`);
      }
    }
  }

  console.log(`择程AI工作区已创建：${target}`);
  console.log("下一步：在该目录打开 Codex 或 WorkBuddy，由 Agent 完成中文 onboarding。");
}

function printLocation(args) {
  const workspace = resolveWorkspace(args);
  console.log(JSON.stringify({ workspace, skillRoot: SKILL_ROOT, localFirst: true }));
}

function printVersion(args) {
  const workspace = optionValue(args, "--workspace") || findWorkspace(process.cwd());
  const versionFile = workspace ? join(resolve(workspace), "VERSION") : join(BUNDLED_RUNTIME, "VERSION");
  console.log(existsSync(versionFile) ? readFileSync(versionFile, "utf8").trim().split(/\s+/)[0] : "unknown");
}

const [command = "help", ...args] = process.argv.slice(2);
if (command === "help" || command === "-h" || command === "--help") {
  console.log(HELP);
} else if (command === "init") {
  init(args);
} else if (command === "locate") {
  printLocation(args);
} else if (command === "version") {
  printVersion(args);
} else if (COMMANDS[command]) {
  run(command, args);
} else {
  fail(`未知命令 ${command}\n\n${HELP}`, 2);
}
