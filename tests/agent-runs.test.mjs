import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, pass, fail } from "./helpers.mjs";

console.log("\nagent-runs.mjs — shared Agent/Web run and proposal contract");

const fixture = mkdtempSync(join(tmpdir(), "career-one-agent-runs-"));
const outside = mkdtempSync(join(tmpdir(), "career-one-agent-runs-outside-"));
try {
  mkdirSync(join(fixture, "data"), { recursive: true });
  mkdirSync(join(fixture, "output"), { recursive: true });
  mkdirSync(join(fixture, "modes"), { recursive: true });
  writeFileSync(join(fixture, "cv.md"), "# CV\n\nold resume\n");
  writeFileSync(join(fixture, "modes", "_profile.md"), "# Profile\n\nold value\n");

  const runs = await import(pathToFileURL(join(ROOT, "agent-runs.mjs")).href);

  const created = runs.createRun({
    root: fixture,
    id: "run-fixed-1",
    intent: "evaluate-job",
    title: "岗位评估",
    subtitle: "Acme · AI 产品经理",
    source: "agent",
    input: "https://example.com/jobs/1",
    page: "/pipeline",
  });
  assert.equal(created.id, "run-fixed-1");
  assert.equal(created.status, "running");
  assert.equal(created.source, "agent");
  assert.equal(runs.listRuns(fixture).length, 1);
  pass("Agent and Web share one durable run record");

  runs.updateRun({ root: fixture, id: created.id, status: "running", progress: "正在读取岗位与简历" });
  const completed = runs.updateRun({
    root: fixture,
    id: created.id,
    status: "completed",
    summary: "匹配度较高，建议进一步沟通",
    score: 4.3,
    artifacts: [{ path: "reports/042-acme-2026-07-15.md", label: "岗位诊断报告", page: "/pipeline/42" }],
  });
  assert.equal(completed.status, "completed");
  assert.equal(completed.score, 4.3);
  assert.equal(completed.page, "/pipeline/42");
  assert.deepEqual(completed.links, {
    workbench: "/jobs",
    task: "/jobs/run-fixed-1",
    result: "/pipeline/42",
  });
  assert.equal(completed.artifacts[0].path, "reports/042-acme-2026-07-15.md");
  assert.ok(completed.progress.some((step) => step.label === "正在读取岗位与简历"));
  pass("Run progress, result and Web deep-link artifacts persist together");

  const draft = join(fixture, "draft-profile.md");
  writeFileSync(draft, "# Profile\n\nnew confirmed value\n");
  const proposalRun = runs.createRun({
    root: fixture,
    id: "run-proposal-1",
    intent: "update-profile",
    title: "更新求职画像",
    source: "agent",
  });
  const proposal = runs.createProposal({
    root: fixture,
    runId: proposalRun.id,
    target: "modes/_profile.md",
    draftPath: draft,
    summary: "更新目标岗位叙事",
  });
  assert.equal(proposal.status, "pending");
  assert.equal(proposal.baseContent, "# Profile\n\nold value\n");
  assert.equal(runs.getRun(fixture, proposalRun.id).status, "waiting_approval");
  assert.equal(runs.getRun(fixture, proposalRun.id).page, "/config");
  assert.equal(runs.getRun(fixture, proposalRun.id).links.result, "/config");
  assert.equal(readFileSync(join(fixture, "modes", "_profile.md"), "utf8"), "# Profile\n\nold value\n");
  runs.decideProposal({ root: fixture, proposalId: proposal.id, decision: "approve" });
  assert.equal(readFileSync(join(fixture, "modes", "_profile.md"), "utf8"), "# Profile\n\nnew confirmed value\n");
  assert.equal(runs.getRun(fixture, proposalRun.id).status, "completed");
  pass("Agent changes remain proposals until an explicit approval applies them");

  const cvDraft = join(fixture, "draft-cv.md");
  writeFileSync(cvDraft, "# CV\n\nnew confirmed resume\n");
  const cvRun = runs.createRun({ root: fixture, id: "run-cv-1", intent: "update-cv", title: "修改简历", source: "agent" });
  runs.createProposal({
    root: fixture,
    runId: cvRun.id,
    target: "cv.md",
    draftPath: cvDraft,
    summary: "优化简历表达",
  });
  assert.equal(runs.getRun(fixture, cvRun.id).page, "/cv");
  assert.equal(runs.getRun(fixture, cvRun.id).links.result, "/cv");
  pass("User-layer proposals automatically point to their contextual Web page");

  const staleDraft = join(fixture, "stale-draft.md");
  writeFileSync(staleDraft, "# Profile\n\nstale proposal\n");
  const staleRun = runs.createRun({ root: fixture, id: "run-stale-1", intent: "update-profile", title: "更新画像", source: "agent" });
  const stale = runs.createProposal({
    root: fixture,
    runId: staleRun.id,
    target: "modes/_profile.md",
    draftPath: staleDraft,
    summary: "一个会过期的修改",
  });
  writeFileSync(join(fixture, "modes", "_profile.md"), "# Profile\n\nuser edited after proposal\n");
  assert.throws(
    () => runs.decideProposal({ root: fixture, proposalId: stale.id, decision: "approve" }),
    /changed since the proposal|已发生变化/i,
  );
  assert.equal(readFileSync(join(fixture, "modes", "_profile.md"), "utf8"), "# Profile\n\nuser edited after proposal\n");
  pass("Stale proposals cannot overwrite newer user edits");

  assert.throws(
    () => runs.createProposal({ root: fixture, runId: staleRun.id, target: "AGENTS.md", draftPath: staleDraft, summary: "unsafe" }),
    /not an approved user-layer target|不允许/i,
  );
  pass("Proposal writes are restricted to approved user-layer files");

  symlinkSync(outside, join(fixture, "writing-samples"), "dir");
  assert.throws(
    () => runs.createProposal({ root: fixture, runId: staleRun.id, target: "writing-samples/private.md", draftPath: staleDraft, summary: "unsafe symlink" }),
    /escapes the workspace through a symlink/i,
  );
  pass("Proposal writes cannot escape through a symlinked user-layer directory");

  runs.archiveRun({ root: fixture, id: created.id });
  assert.equal(runs.listRuns(fixture).some((run) => run.id === created.id), false);
  assert.equal(runs.listRuns(fixture, { includeArchived: true }).some((run) => run.id === created.id), true);
  pass("Finished runs can be archived without deleting their artifacts");
} catch (error) {
  fail(`agent run contract crashed: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  rmSync(fixture, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
}
