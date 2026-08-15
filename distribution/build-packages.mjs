#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  RUNTIME_PATHS,
  STARTER_DIRECTORIES,
  isDistributionOnlyExclusion,
  isUserDataPath,
  normalizeRuntimePath,
} from "./runtime-paths.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SKILL_SOURCE = join(ROOT, ".agents", "skills", "career-one");
const CODEX_SOURCE = join(ROOT, "packages", "codex-plugin", "career-one");
const DEFAULT_OUTPUT = join(ROOT, "dist", "marketplaces");
const SAFE_USER_SCAFFOLDS = new Set(["writing-samples/README.md", "interview-prep/sessions/README.md"]);

function toRelative(source) {
  return normalizeRuntimePath(relative(ROOT, source).split(sep).join("/"));
}

function includeSource(source) {
  const rel = toRelative(source);
  if (!rel || rel.startsWith("..")) return true;
  if (SAFE_USER_SCAFFOLDS.has(rel)) return true;
  return !isUserDataPath(rel) && !isDistributionOnlyExclusion(rel);
}

function copyRuntimePath(relativePath, runtimeRoot) {
  const source = join(ROOT, ...relativePath.replace(/\/$/, "").split("/"));
  if (!existsSync(source)) return;
  const target = join(runtimeRoot, ...relativePath.replace(/\/$/, "").split("/"));
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true, filter: includeSource });
}

export function buildRuntime(runtimeRoot) {
  mkdirSync(runtimeRoot, { recursive: true });
  for (const path of RUNTIME_PATHS) copyRuntimePath(path, runtimeRoot);
  for (const optional of ["plugins-registry.json"]) {
    copyRuntimePath(optional, runtimeRoot);
  }

  for (const directory of STARTER_DIRECTORIES) {
    const path = join(runtimeRoot, ...directory.split("/"));
    mkdirSync(path, { recursive: true });
    const keep = join(path, ".gitkeep");
    if (!existsSync(keep)) writeFileSync(keep, "");
  }
  return runtimeRoot;
}

function buildSkill(target) {
  cpSync(SKILL_SOURCE, target, { recursive: true });
  buildRuntime(join(target, "assets", "runtime"));
  return target;
}

function buildWorkBuddyArchive(workBuddyRoot, archive) {
  rmSync(archive, { force: true });
  const result = spawnSync("zip", ["-qr", archive, "career-one"], { cwd: workBuddyRoot, encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(`无法生成 WorkBuddy 技能包：${result.error?.message || result.stderr || "zip failed"}`);
  }
  return archive;
}

export function buildDistributions({ outputRoot = DEFAULT_OUTPUT } = {}) {
  const root = resolve(outputRoot);
  const codex = join(root, "codex", "career-one");
  const workbuddy = join(root, "workbuddy", "career-one");
  const workbuddyArchive = join(root, "workbuddy", "career-one-workbuddy.zip");

  rmSync(join(root, "codex"), { recursive: true, force: true });
  rmSync(join(root, "workbuddy"), { recursive: true, force: true });
  mkdirSync(dirname(codex), { recursive: true });
  mkdirSync(dirname(workbuddy), { recursive: true });

  cpSync(CODEX_SOURCE, codex, { recursive: true });
  buildSkill(join(codex, "skills", "career-one"));
  buildSkill(workbuddy);
  buildWorkBuddyArchive(dirname(workbuddy), workbuddyArchive);

  return { codex, workbuddy, workbuddyArchive };
}

function optionValue(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : null;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const output = optionValue(process.argv.slice(2), "--output");
  const built = buildDistributions({ outputRoot: output || DEFAULT_OUTPUT });
  console.log(JSON.stringify(built, null, 2));
}
