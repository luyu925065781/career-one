#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));

export const RELEASE_CHANNELS = ["stable", "beta", "development"];
export const FEATURE_STAGES = ["stable", "beta", "development", "hidden"];
export const VERSION_RE =
  /^\d+\.\d+\.\d+(?:-(?:dev|next|alpha|beta|rc)(?:\.[0-9A-Za-z-]+)*)?$/;

const PACKAGE_FILES = [
  "package.json",
  "package-lock.json",
  "web/package.json",
  "web/package-lock.json",
  "scaffolder/package.json",
  "packages/codex-plugin/career-one/.codex-plugin/plugin.json",
];
const WEB_CONFIG_MIRROR = "web/release.config.json";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeAtomic(path, content) {
  const tempDir = mkdtempSync(join(dirname(path), ".release-"));
  const tempPath = join(tempDir, "next");
  try {
    writeFileSync(tempPath, content);
    renameSync(tempPath, path);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function writeJson(path, value) {
  writeAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}

function packageVersion(json) {
  return typeof json?.version === "string" ? json.version : "";
}

function currentBranch(root) {
  try {
    return execFileSync("git", ["branch", "--show-current"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

export function stageEnabled(stage, channel) {
  if (stage === "hidden") return false;
  if (channel === "development") return true;
  if (channel === "beta") return stage === "stable" || stage === "beta";
  return stage === "stable";
}

export function channelMatchesVersion(channel, version) {
  if (!VERSION_RE.test(version)) return false;
  const prerelease = version.split("-", 2)[1] || "";
  if (channel === "stable") return prerelease === "";
  if (channel === "development") {
    return prerelease.startsWith("dev") || prerelease.startsWith("next");
  }
  return (
    prerelease.startsWith("alpha") ||
    prerelease.startsWith("beta") ||
    prerelease.startsWith("rc")
  );
}

export function validateReleaseState(config, options = {}) {
  const errors = [];
  const branch = options.branch || "";
  const expectedChannel = options.expectedChannel || "";

  if (!config || typeof config !== "object") {
    return ["release.config.json 必须是对象"];
  }
  if (!RELEASE_CHANNELS.includes(config.channel)) {
    errors.push(`未知发布通道：${config.channel || "(空)"}`);
  }
  if (!VERSION_RE.test(String(config.version || ""))) {
    errors.push(`版本号不是受支持的 SemVer：${config.version || "(空)"}`);
  } else if (!channelMatchesVersion(config.channel, config.version)) {
    errors.push(`版本 ${config.version} 与通道 ${config.channel} 不匹配`);
  }
  if (expectedChannel && config.channel !== expectedChannel) {
    errors.push(`当前通道是 ${config.channel}，但命令要求 ${expectedChannel}`);
  }
  if (config.channel === "stable" && branch && branch !== "main") {
    errors.push(`稳定版只能从 main 发布，当前分支是 ${branch}`);
  }
  if (
    config.channel === "development" &&
    branch &&
    branch !== "develop" &&
    !branch.startsWith("codex/")
  ) {
    errors.push(`开发版应从 develop 或 codex/* 分支验证，当前分支是 ${branch}`);
  }
  if (!config.features || typeof config.features !== "object") {
    errors.push("features 必须是非空对象");
  } else {
    const entries = Object.entries(config.features);
    if (entries.length === 0) errors.push("features 不能为空");
    for (const [feature, stage] of entries) {
      if (!FEATURE_STAGES.includes(stage)) {
        errors.push(`功能 ${feature} 使用了未知阶段 ${stage}`);
      }
    }
  }
  return errors;
}

export function readReleaseState(root = ROOT) {
  const configPath = join(root, "release.config.json");
  if (!existsSync(configPath)) {
    throw new Error(`缺少 ${configPath}`);
  }
  return readJson(configPath);
}

export function verifyRelease({
  root = ROOT,
  expectedChannel = "",
  branch = currentBranch(root),
} = {}) {
  const config = readReleaseState(root);
  const errors = validateReleaseState(config, { expectedChannel, branch });
  const mirrorPath = join(root, WEB_CONFIG_MIRROR);
  if (!existsSync(mirrorPath)) {
    errors.push(`缺少构建镜像：${WEB_CONFIG_MIRROR}`);
  } else if (JSON.stringify(readJson(mirrorPath)) !== JSON.stringify(config)) {
    errors.push(`${WEB_CONFIG_MIRROR} 与根 release.config.json 不一致`);
  }

  const versionPath = join(root, "VERSION");
  const version = existsSync(versionPath)
    ? readFileSync(versionPath, "utf8").trim().split(/\s+/)[0]
    : "";
  if (version !== config.version) {
    errors.push(`VERSION=${version || "(缺失)"}，release.config.json=${config.version}`);
  }

  for (const relative of PACKAGE_FILES) {
    const path = join(root, relative);
    if (!existsSync(path)) {
      errors.push(`缺少版本文件：${relative}`);
      continue;
    }
    const json = readJson(path);
    if (packageVersion(json) !== config.version) {
      errors.push(`${relative}=${packageVersion(json) || "(缺失)"}，应为 ${config.version}`);
    }
    if (
      relative.endsWith("package-lock.json") &&
      json.packages?.[""]?.version !== config.version
    ) {
      errors.push(
        `${relative} packages[""].version=${json.packages?.[""]?.version || "(缺失)"}，应为 ${config.version}`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    version: config.version,
    channel: config.channel,
    branch,
    features: config.features,
  };
}

function updatePackageVersion(path, version) {
  const json = readJson(path);
  json.version = version;
  if (json.packages?.[""]) json.packages[""].version = version;
  writeJson(path, json);
}

export function prepareRelease({
  root = ROOT,
  channel,
  version,
  branch = currentBranch(root),
} = {}) {
  if (!RELEASE_CHANNELS.includes(channel)) {
    throw new Error(`--channel 必须是 ${RELEASE_CHANNELS.join("、")}`);
  }
  if (!channelMatchesVersion(channel, version || "")) {
    throw new Error(`版本 ${version || "(空)"} 与通道 ${channel} 不匹配`);
  }
  if (channel === "stable" && branch && branch !== "main") {
    throw new Error(`稳定版只能在 main 准备，当前分支是 ${branch}`);
  }

  const configPath = join(root, "release.config.json");
  const config = readJson(configPath);
  config.version = version;
  config.channel = channel;
  writeJson(configPath, config);
  writeJson(join(root, WEB_CONFIG_MIRROR), config);
  writeAtomic(join(root, "VERSION"), `${version} # x-release-please-version\n`);

  for (const relative of PACKAGE_FILES) {
    const path = join(root, relative);
    if (!existsSync(path)) throw new Error(`缺少版本文件：${relative}`);
    updatePackageVersion(path, version);
  }

  return verifyRelease({ root, expectedChannel: channel, branch });
}

function parseArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      values[key] = next;
      i += 1;
    } else {
      values[key] = true;
    }
  }
  return values;
}

function printResult(result) {
  console.log(JSON.stringify(result, null, 2));
}

function runCli() {
  const command = process.argv[2] || "status";
  const args = parseArgs(process.argv.slice(3));
  if (command === "status") {
    printResult({
      ...readReleaseState(),
      branch: currentBranch(ROOT),
    });
    return;
  }
  if (command === "verify") {
    const result = verifyRelease({ expectedChannel: args.channel || "" });
    printResult(result);
    if (!result.ok) process.exitCode = 1;
    return;
  }
  if (command === "prepare") {
    const result = prepareRelease({
      channel: args.channel,
      version: args.version,
    });
    printResult(result);
    if (!result.ok) process.exitCode = 1;
    return;
  }
  console.error(
    "Usage: node release.mjs [status|verify [--channel stable|beta|development]|prepare --channel ... --version ...]",
  );
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
