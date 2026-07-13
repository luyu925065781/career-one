#!/usr/bin/env node
// career-one scaffolder — one-command local install.
// Clones the repo at the latest release tag and installs dependencies.
// It deliberately does NOT create cv.md / config/profile.yml / portals.yml:
// the agent runs a conversational onboarding on first launch (see AGENTS.md
// "First Run — Onboarding"), which is triggered precisely by those files
// being absent. Pre-creating them from the examples would suppress that
// onboarding and leave the user with placeholder data.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, delimiter } from "node:path";
import { ensureSkillEntrypoints } from "./skill-entrypoints.mjs";

const REPO = "https://github.com/luyu925065781/career-one.git";
const LATEST_RELEASE = "https://api.github.com/repos/luyu925065781/career-one/releases/latest";
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";

// career-one is AI-agnostic: every one of these CLIs reads AGENTS.md and works
// out of the box. We only detect them to tailor the final message — we never
// install, configure, or remove anything per-CLI.
const SUPPORTED_CLIS = [
  { name: "Claude Code", cmd: "claude" },
  { name: "Gemini CLI", cmd: "gemini" },
  { name: "Codex", cmd: "codex" },
  { name: "WorkBuddy / CodeBuddy", cmd: "codebuddy" },
  { name: "TRAE", cmd: "trae-cli" },
  { name: "Qwen Code", cmd: "qwen" },
  { name: "OpenCode", cmd: "opencode" },
  { name: "GitHub Copilot CLI", cmd: "copilot" },
  { name: "Antigravity CLI", cmd: "agy" },
  { name: "Grok Build CLI", cmd: "grok" },
];

const USAGE = `择程AI（career-one）— 创建本地优先的 AI 求职工作区。

用法：
  career-one init [目录]          创建新工作区（默认：./career-one）

完成后，在该目录中打开你的 Agent。首次使用时，Agent 会通过对话生成 cv.md 和个人配置。
项目仓库：https://github.com/luyu925065781/career-one`;

function die(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function has(cmd, arg = "--version") {
  try {
    execFileSync(cmd, [arg], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Is `cmd` resolvable on PATH? Manual lookup so it works cross-platform
// without spawning which/where (and without any dependency).
function onPath(cmd) {
  const exts = process.platform === "win32" ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";") : [""];
  for (const dir of (process.env.PATH || "").split(delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      try {
        if (existsSync(join(dir, cmd + ext))) return true;
      } catch {}
    }
  }
  return false;
}

function detectClis() {
  return SUPPORTED_CLIS.filter((c) => onPath(c.cmd));
}

async function latestTag() {
  try {
    const res = await fetch(LATEST_RELEASE, {
      headers: { "User-Agent": "career-one-cli", Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.tag_name || null;
  } catch {
    return null;
  }
}

async function main() {
  const [cmd, dirArg] = process.argv.slice(2);

  if (!cmd || cmd === "-h" || cmd === "--help") {
    console.log(USAGE);
    process.exit(cmd ? 0 : 1);
  }
  if (cmd !== "init") die(`Unknown command "${cmd}".\n${USAGE}`);

  const target = dirArg || "career-one";
  if (existsSync(target) && readdirSync(target).length > 0) {
    die(`Target folder "${target}" already exists and is not empty. Pick another name.`);
  }
  if (!has("git")) die("git is required but was not found on PATH. Install git and try again.");

  // Pretty path for messages: "./career-one" for relative, as-is for absolute.
  const isAbsolute = target.startsWith("/") || /^[A-Za-z]:/.test(target);
  const display = isAbsolute ? target : `./${target}`;

  // 1. Clone at the latest stable release (fall back to the default branch).
  const tag = await latestTag();
  console.log(`\n→ 正在安装择程AI（career-one）${tag ? ` @ ${tag}` : ""} 到 ${display} ...`);
  const cloneArgs = ["clone", "--depth=1"];
  if (tag) cloneArgs.push("--branch", tag);
  cloneArgs.push(REPO, target);
  try {
    execFileSync("git", cloneArgs, { stdio: "inherit" });
  } catch {
    die("git clone failed. Check your network connection and try again.");
  }

  // 2. Install dependencies.
  console.log("\n→ Installing dependencies (npm install) ...");
  try {
    execFileSync(NPM, ["install"], { cwd: target, stdio: "inherit" });
  } catch {
    console.warn('\n! npm install failed — you can re-run it manually later with "npm install".');
  }

  // 2b. Bootstrap CLI skill entrypoints (covers CLIs added after the cloned release).
  const bootstrapped = ensureSkillEntrypoints(target);
  if (bootstrapped.length > 0) {
    console.log(`\n→ Bootstrapped ${bootstrapped.length} CLI skill entrypoint(s) for this workspace`);
  }

  // 3. Next steps. We do NOT scaffold cv.md / profile.yml / portals.yml here:
  // their absence is what triggers the agent's conversational onboarding on
  // first launch, which sets them up far better than copying placeholders.
  console.log(`\n✓ 择程AI已安装到 ${display}\n`);
  console.log("下一步：");
  console.log(`  1. cd ${target}`);

  // Tailor the "open your AI tool" line to whatever CLI is installed.
  const detected = detectClis();
  if (detected.length === 1) {
    console.log(`  2. 打开工作区：${detected[0].cmd}   （已检测到 ${detected[0].name}）`);
  } else if (detected.length > 1) {
    console.log(`  2. 使用任一已检测到的 Agent：${detected.map((c) => c.cmd).join(", ")}`);
  } else {
    console.log(`  2. 在此目录打开你的 Agent，例如：${SUPPORTED_CLIS.map((c) => c.cmd).join(", ")}`);
  }

  console.log("\n首次启动后，用户自己的 Agent 会通过中文对话完善简历、个人画像和目标岗位，");
  console.log("并把 cv.md、报告和进度数据保存在当前电脑中。");
  console.log("\n择程AI不绑定 Agent：Codex、Claude Code、TRAE、Qwen、OpenCode、Copilot、Antigravity 和 Grok 均可使用。");
  console.log("\n可选（生成 PDF 时需要）：");
  console.log("  npx playwright install chromium\n");
}

main().catch((err) => die(err?.message || String(err)));
