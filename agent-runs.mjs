#!/usr/bin/env node

import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const CONTRACT_VERSION = 1;
const MAX_RUNS = 200;
const MAX_PROGRESS = 60;
const MAX_DRAFT_BYTES = 2 * 1024 * 1024;
const RUN_STATUSES = new Set(["queued", "running", "waiting_approval", "completed", "failed", "cancelled"]);
const SOURCES = new Set(["agent", "web"]);
const ALLOWED_TARGETS = new Set([
  "cv.md",
  "article-digest.md",
  "voice-dna.md",
  "config/profile.yml",
  "modes/_profile.md",
  "modes/_custom.md",
  "portals.yml",
]);
const ALLOWED_TARGET_PREFIXES = ["interview-prep/", "writing-samples/"];

function now() {
  return new Date().toISOString();
}

function cleanText(value, max = 300) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function cleanId(value, prefix = "run") {
  const raw = String(value ?? "").trim();
  if (raw && /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,96}$/.test(raw)) return raw;
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
}

function normalizePage(value) {
  const page = String(value ?? "").trim();
  if (!page) return undefined;
  if (!page.startsWith("/") || page.startsWith("//") || /[\r\n]/.test(page)) throw new Error("Web page must be an in-app relative route");
  return page.slice(0, 300);
}

function normalizeArtifact(root, artifact) {
  const rawPath = String(artifact?.path ?? "").trim().replaceAll("\\", "/");
  if (!rawPath || isAbsolute(rawPath) || rawPath.split("/").includes("..")) throw new Error("Artifact path must stay inside the workspace");
  const absolute = resolve(root, rawPath);
  if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) throw new Error("Artifact path escapes the workspace");
  return {
    path: rawPath.slice(0, 500),
    label: cleanText(artifact?.label || rawPath, 120),
    page: normalizePage(artifact?.page),
  };
}

function statePath(root) {
  return join(root, "data", "agent-runs.json");
}

function lockPath(root) {
  return join(root, "data", ".agent-runs.lock");
}

function proposalsDir(root) {
  return join(root, "output", "proposals");
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function withLock(root, fn) {
  const dir = dirname(statePath(root));
  mkdirSync(dir, { recursive: true });
  const lock = lockPath(root);
  let fd;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      fd = openSync(lock, "wx");
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      try {
        if (Date.now() - statSync(lock).mtimeMs > 30_000) unlinkSync(lock);
      } catch {
        // Another process released it between stat/unlink.
      }
      sleep(20);
    }
  }
  if (fd === undefined) throw new Error("Agent run registry is busy; try again");
  try {
    return fn();
  } finally {
    try { closeSync(fd); } catch { /* already closed */ }
    try { unlinkSync(lock); } catch { /* already released */ }
  }
}

function atomicWrite(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  const temp = join(dirname(file), `.${randomUUID()}.tmp`);
  writeFileSync(temp, content, "utf8");
  renameSync(temp, file);
}

function readState(root) {
  const file = statePath(root);
  if (!existsSync(file)) return { version: CONTRACT_VERSION, runs: [] };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read data/agent-runs.json safely: ${error.message}`);
  }
  if (!parsed || parsed.version !== CONTRACT_VERSION || !Array.isArray(parsed.runs)) {
    throw new Error("Unsupported or corrupt Agent run registry");
  }
  return parsed;
}

function writeState(root, state) {
  const runs = [...state.runs]
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, MAX_RUNS);
  atomicWrite(statePath(root), `${JSON.stringify({ version: CONTRACT_VERSION, runs }, null, 2)}\n`);
}

function proposalPath(root, proposalId) {
  const id = cleanId(proposalId, "proposal");
  if (id !== proposalId) throw new Error("Invalid proposal id");
  return join(proposalsDir(root), `${id}.json`);
}

function hashContent(content) {
  return createHash("sha256").update(content).digest("hex");
}

function normalizeTarget(root, value) {
  const target = String(value ?? "").trim().replaceAll("\\", "/").replace(/^\.\//, "");
  if (!target || isAbsolute(target) || target.split("/").includes("..")) throw new Error("Proposal target is not an approved user-layer target");
  if (!ALLOWED_TARGETS.has(target) && !ALLOWED_TARGET_PREFIXES.some((prefix) => target.startsWith(prefix))) {
    throw new Error("Proposal target is not an approved user-layer target");
  }
  const absolute = resolve(root, target);
  if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) throw new Error("Proposal target escapes the workspace");

  // Existing targets and parent directories may not escape through symlinks.
  const realRoot = realpathSync(root);
  let existingAncestor = absolute;
  while (!existsSync(existingAncestor) && existingAncestor !== root) existingAncestor = dirname(existingAncestor);
  const realAncestor = realpathSync(existingAncestor);
  if (realAncestor !== realRoot && !realAncestor.startsWith(`${realRoot}${sep}`)) {
    throw new Error("Proposal target escapes the workspace through a symlink");
  }
  return { target, absolute };
}

function proposalSummary(root, id) {
  try {
    const proposal = JSON.parse(readFileSync(proposalPath(root, id), "utf8"));
    return {
      id: proposal.id,
      title: proposal.title,
      summary: proposal.summary,
      target: proposal.target,
      status: proposal.status,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
    };
  } catch {
    return null;
  }
}

function pageForTarget(target) {
  if (target === "cv.md" || target === "article-digest.md" || target === "voice-dna.md" || target.startsWith("writing-samples/")) {
    return "/cv";
  }
  if (target.startsWith("interview-prep/")) return "/interview";
  if (target === "portals.yml") return "/portals";
  if (["config/profile.yml", "modes/_profile.md", "modes/_custom.md"].includes(target)) return "/config";
  return undefined;
}

function attachProposalSummaries(root, run) {
  return {
    ...run,
    links: {
      workbench: "/jobs",
      task: `/jobs/${run.id}`,
      result: run.page,
    },
    proposals: (run.proposalIds ?? []).map((id) => proposalSummary(root, id)).filter(Boolean),
  };
}

export function createRun({
  root: rawRoot = process.cwd(),
  id,
  intent,
  title,
  subtitle,
  source = "agent",
  input,
  page,
  instruction,
  status = "running",
}) {
  const root = resolve(rawRoot);
  const runId = cleanId(id, "run");
  const normalizedIntent = cleanText(intent, 80);
  const normalizedTitle = cleanText(title, 140);
  if (!normalizedIntent || !normalizedTitle) throw new Error("Run intent and title are required");
  if (!SOURCES.has(source)) throw new Error("Run source must be agent or web");
  if (!["queued", "running"].includes(status)) throw new Error("New runs must start as queued or running");
  const timestamp = now();
  const run = {
    version: CONTRACT_VERSION,
    id: runId,
    intent: normalizedIntent,
    title: normalizedTitle,
    subtitle: cleanText(subtitle, 180) || undefined,
    source,
    input: cleanText(input, 500) || undefined,
    page: normalizePage(page),
    instruction: cleanText(instruction, 1_000) || undefined,
    status,
    progress: [{
      kind: "status",
      label: status === "queued" ? "已加入 Agent 待办" : "任务已创建",
      at: timestamp,
    }],
    artifacts: [],
    proposalIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return withLock(root, () => {
    const state = readState(root);
    if (state.runs.some((item) => item.id === runId)) throw new Error(`Run ${runId} already exists`);
    state.runs.unshift(run);
    writeState(root, state);
    return attachProposalSummaries(root, run);
  });
}

export function getRun(rawRoot, id) {
  const root = resolve(rawRoot);
  const run = readState(root).runs.find((item) => item.id === id);
  return run ? attachProposalSummaries(root, run) : null;
}

export function listRuns(rawRoot = process.cwd(), { includeArchived = false } = {}) {
  const root = resolve(rawRoot);
  return readState(root).runs
    .filter((run) => includeArchived || !run.archivedAt)
    .map((run) => attachProposalSummaries(root, run));
}

export function updateRun({ root: rawRoot = process.cwd(), id, status, progress, summary, score, error, page, artifacts }) {
  const root = resolve(rawRoot);
  return withLock(root, () => {
    const state = readState(root);
    const index = state.runs.findIndex((item) => item.id === id);
    if (index < 0) throw new Error(`Run ${id} not found`);
    const current = state.runs[index];
    const timestamp = now();
    const next = { ...current, updatedAt: timestamp };
    if (status !== undefined) {
      if (!RUN_STATUSES.has(status)) throw new Error(`Unsupported run status: ${status}`);
      next.status = status;
      if (["completed", "failed", "cancelled"].includes(status)) next.completedAt = timestamp;
    }
    if (progress) {
      next.progress = [
        ...(current.progress ?? []),
        { kind: "status", label: cleanText(progress, 180), at: timestamp },
      ].slice(-MAX_PROGRESS);
    }
    if (summary !== undefined) next.summary = cleanText(summary, 500);
    if (error !== undefined) next.error = cleanText(error, 500);
    if (score !== undefined && score !== null && score !== "") {
      const parsed = Number(score);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5) throw new Error("Run score must be between 0 and 5");
      next.score = parsed;
    }
    if (page !== undefined) next.page = normalizePage(page);
    if (artifacts !== undefined) {
      const incoming = artifacts.map((artifact) => normalizeArtifact(root, artifact));
      const merged = new Map((current.artifacts ?? []).map((artifact) => [artifact.path, artifact]));
      for (const artifact of incoming) merged.set(artifact.path, artifact);
      next.artifacts = [...merged.values()].slice(0, 20);
      if (page === undefined) {
        const artifactPage = incoming.find((artifact) => artifact.page)?.page;
        if (artifactPage) next.page = artifactPage;
      }
    }
    state.runs[index] = next;
    writeState(root, state);
    return attachProposalSummaries(root, next);
  });
}

export function archiveRun({ root: rawRoot = process.cwd(), id }) {
  const root = resolve(rawRoot);
  return withLock(root, () => {
    const state = readState(root);
    const index = state.runs.findIndex((item) => item.id === id);
    if (index < 0) throw new Error(`Run ${id} not found`);
    state.runs[index] = { ...state.runs[index], archivedAt: now(), updatedAt: now() };
    writeState(root, state);
    return attachProposalSummaries(root, state.runs[index]);
  });
}

export function getProposal(rawRoot, proposalId) {
  const root = resolve(rawRoot);
  const file = proposalPath(root, proposalId);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

export function createProposal({ root: rawRoot = process.cwd(), runId, target: rawTarget, draftPath, summary, title }) {
  const root = resolve(rawRoot);
  const run = getRun(root, runId);
  if (!run) throw new Error(`Run ${runId} not found`);
  const { target, absolute } = normalizeTarget(root, rawTarget);
  if (!draftPath || !existsSync(draftPath)) throw new Error("Proposal draft file not found");
  const proposedContent = readFileSync(draftPath, "utf8");
  if (Buffer.byteLength(proposedContent) > MAX_DRAFT_BYTES) throw new Error("Proposal draft is too large");
  const currentContent = existsSync(absolute) ? readFileSync(absolute, "utf8") : null;
  const timestamp = now();
  const proposal = {
    version: CONTRACT_VERSION,
    id: cleanId(undefined, "proposal"),
    runId,
    title: cleanText(title || `修改 ${target}`, 140),
    summary: cleanText(summary, 500),
    target,
    baseHash: currentContent === null ? null : hashContent(currentContent),
    baseContent: currentContent,
    proposedContent,
    status: "pending",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  atomicWrite(proposalPath(root, proposal.id), `${JSON.stringify(proposal, null, 2)}\n`);

  withLock(root, () => {
    const state = readState(root);
    const index = state.runs.findIndex((item) => item.id === runId);
    if (index < 0) throw new Error(`Run ${runId} not found`);
    const proposalIds = [...new Set([...(state.runs[index].proposalIds ?? []), proposal.id])];
    state.runs[index] = {
      ...state.runs[index],
      page: state.runs[index].page || pageForTarget(target),
      status: "waiting_approval",
      proposalIds,
      updatedAt: timestamp,
      progress: [
        ...(state.runs[index].progress ?? []),
        { kind: "status", label: "等待用户确认修改", at: timestamp },
      ].slice(-MAX_PROGRESS),
    };
    writeState(root, state);
  });
  return proposal;
}

export function decideProposal({ root: rawRoot = process.cwd(), proposalId, decision }) {
  const root = resolve(rawRoot);
  if (!["approve", "reject"].includes(decision)) throw new Error("Proposal decision must be approve or reject");
  return withLock(root, () => {
    const proposal = getProposal(root, proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);
    if (proposal.status !== "pending") throw new Error(`Proposal ${proposalId} is already ${proposal.status}`);
    const timestamp = now();

    if (decision === "approve") {
      const { absolute } = normalizeTarget(root, proposal.target);
      const currentContent = existsSync(absolute) ? readFileSync(absolute, "utf8") : null;
      const currentHash = currentContent === null ? null : hashContent(currentContent);
      if (currentHash !== proposal.baseHash) {
        const stale = { ...proposal, status: "stale", updatedAt: timestamp };
        atomicWrite(proposalPath(root, proposal.id), `${JSON.stringify(stale, null, 2)}\n`);
        throw new Error("Target changed since the proposal was created; review it again before applying");
      }
      atomicWrite(absolute, proposal.proposedContent);
    }

    const settled = {
      ...proposal,
      status: decision === "approve" ? "applied" : "rejected",
      updatedAt: timestamp,
      decidedAt: timestamp,
    };
    atomicWrite(proposalPath(root, proposal.id), `${JSON.stringify(settled, null, 2)}\n`);

    const state = readState(root);
    const index = state.runs.findIndex((item) => item.id === proposal.runId);
    if (index >= 0) {
      const current = state.runs[index];
      const stillPending = (current.proposalIds ?? [])
        .filter((id) => id !== proposal.id)
        .some((id) => proposalSummary(root, id)?.status === "pending");
      state.runs[index] = {
        ...current,
        status: stillPending ? "waiting_approval" : "completed",
        updatedAt: timestamp,
        completedAt: stillPending ? current.completedAt : timestamp,
        progress: [
          ...(current.progress ?? []),
          { kind: "status", label: decision === "approve" ? "用户已确认并应用修改" : "用户已拒绝修改", at: timestamp },
        ].slice(-MAX_PROGRESS),
      };
      writeState(root, state);
    }
    return settled;
  });
}

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : undefined;
}

function repeatedOptions(args, name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1]) values.push(args[index + 1]);
  }
  return values;
}

function cliRoot(args) {
  return resolve(option(args, "--workspace") || process.env.CAREER_ONE_WORKSPACE || process.cwd());
}

function artifactFromCli(value) {
  const [path, label, page] = String(value).split("|");
  return { path, label: label || path, page: page || undefined };
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function cliHelp() {
  return `择程AI共享任务协议\n\n` +
    `  node agent-runs.mjs start --intent <意图> --title <标题> [--source agent|web]\n` +
    `  node agent-runs.mjs queue --intent <意图> --title <标题> [--source web] [--instruction <续接指令>]\n` +
    `  node agent-runs.mjs progress <run-id> --label <进度>\n` +
    `  node agent-runs.mjs complete <run-id> [--summary <摘要>] [--artifact path|label|/page]\n` +
    `  node agent-runs.mjs fail <run-id> --error <原因>\n` +
    `  node agent-runs.mjs list | get <run-id> | archive <run-id>\n` +
    `  node agent-runs.mjs propose <run-id> --target <用户文件> --draft <草稿文件> --summary <摘要>\n` +
    `  node agent-runs.mjs proposal <proposal-id> | approve <proposal-id> | reject <proposal-id>\n`;
}

export function runCli(argv = process.argv.slice(2)) {
  const [command = "list", positional, ...rest] = argv;
  const args = positional === undefined ? rest : [positional, ...rest];
  const root = cliRoot(args);
  if (["help", "--help", "-h"].includes(command)) {
    process.stdout.write(cliHelp());
    return 0;
  }
  if (command === "start" || command === "queue") {
    print(createRun({
      root,
      id: option(args, "--id"),
      intent: option(args, "--intent"),
      title: option(args, "--title"),
      subtitle: option(args, "--subtitle"),
      source: option(args, "--source") || "agent",
      input: option(args, "--input"),
      page: option(args, "--page"),
      instruction: option(args, "--instruction"),
      status: command === "queue" ? "queued" : "running",
    }));
    return 0;
  }
  if (command === "list") {
    print({ runs: listRuns(root, { includeArchived: args.includes("--all") }) });
    return 0;
  }
  if (command === "get") {
    const run = getRun(root, positional);
    if (!run) throw new Error(`Run ${positional} not found`);
    print(run);
    return 0;
  }
  if (command === "progress") {
    print(updateRun({ root, id: positional, status: "running", progress: option(args, "--label") }));
    return 0;
  }
  if (command === "complete") {
    print(updateRun({
      root,
      id: positional,
      status: "completed",
      progress: option(args, "--label") || "任务已完成",
      summary: option(args, "--summary"),
      score: option(args, "--score"),
      page: option(args, "--page"),
      artifacts: repeatedOptions(args, "--artifact").map(artifactFromCli),
    }));
    return 0;
  }
  if (command === "fail") {
    print(updateRun({ root, id: positional, status: "failed", progress: "任务执行失败", error: option(args, "--error") }));
    return 0;
  }
  if (command === "archive") {
    print(archiveRun({ root, id: positional }));
    return 0;
  }
  if (command === "propose") {
    print(createProposal({
      root,
      runId: positional,
      target: option(args, "--target"),
      draftPath: option(args, "--draft"),
      summary: option(args, "--summary"),
      title: option(args, "--title"),
    }));
    return 0;
  }
  if (command === "proposal") {
    const proposal = getProposal(root, positional);
    if (!proposal) throw new Error(`Proposal ${positional} not found`);
    print(proposal);
    return 0;
  }
  if (command === "approve" || command === "reject") {
    print(decideProposal({ root, proposalId: positional, decision: command }));
    return 0;
  }
  throw new Error(`Unknown command ${command}\n\n${cliHelp()}`);
}

const invokedAsScript = process.argv[1] && existsSync(process.argv[1])
  ? pathToFileURL(realpathSync(process.argv[1])).href
  : "";
if (import.meta.url === invokedAsScript) {
  try {
    process.exitCode = runCli();
  } catch (error) {
    console.error(`择程AI：${error.message}`);
    process.exitCode = 1;
  }
}
