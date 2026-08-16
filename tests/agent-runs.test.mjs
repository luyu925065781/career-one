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
  mkdirSync(join(fixture, "config"), { recursive: true });
  writeFileSync(join(fixture, "cv.md"), "# CV\n\nold resume\n");
  writeFileSync(join(fixture, "config", "profile.yml"), "target_role: old role\n");
  writeFileSync(join(fixture, "modes", "_profile.md"), "# Profile\n\nold value\n");

  const runs = await import(pathToFileURL(join(ROOT, "scripts/agent/agent-runs.mjs")).href);

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

  const queued = runs.createRun({
    root: fixture,
    id: "run-queued-pdf-1",
    intent: "pdf",
    title: "生成岗位定制简历",
    subtitle: "Acme · AI 产品经理",
    source: "web",
    input: "042",
    page: "/pipeline/42",
    status: "queued",
    instruction: "已有待办任务 ID：run-queued-pdf-1。请继续这个任务，不要创建新任务。",
  });
  assert.equal(queued.status, "queued");
  assert.equal(queued.instruction, "已有待办任务 ID：run-queued-pdf-1。请继续这个任务，不要创建新任务。");
  assert.ok(queued.progress.some((step) => step.label === "已加入 Agent 待办"));
  const claimed = runs.updateRun({
    root: fixture,
    id: queued.id,
    status: "running",
    progress: "Agent 已接手任务",
  });
  assert.equal(claimed.status, "running");
  assert.equal(claimed.instruction, queued.instruction);
  pass("Web can queue a durable task that the user's Agent later claims");

  const waitingForInput = runs.updateRun({
    root: fixture,
    id: queued.id,
    status: "waiting_input",
    progress: "等待用户确认目标职级",
    question: "请确认您的主要目标职级。",
  });
  assert.equal(waitingForInput.status, "waiting_input");
  assert.equal(waitingForInput.question, "请确认您的主要目标职级。");
  assert.equal(waitingForInput.completedAt, undefined);
  mkdirSync(join(fixture, "data", "task-attachments", queued.id), { recursive: true });
  const screenshotPath = `data/task-attachments/${queued.id}/01-123456789abc.png`;
  writeFileSync(join(fixture, screenshotPath), "local screenshot fixture");
  const attachedWhileWaiting = runs.updateRun({
    root: fixture,
    id: queued.id,
    progress: "招聘截图已保存到本地附件目录",
    artifacts: [{ path: screenshotPath, label: "招聘截图 1 · image.png" }],
    instruction: `已有待办任务 ID：${queued.id}。请读取 ${screenshotPath}。`,
  });
  assert.equal(attachedWhileWaiting.status, "waiting_input");
  assert.equal(attachedWhileWaiting.question, waitingForInput.question);
  assert.equal(attachedWhileWaiting.artifacts[0].path, screenshotPath);
  assert.match(attachedWhileWaiting.instruction, /data\/task-attachments/);
  pass("Task attachments persist without replacing a waiting task or its question");
  const resumedAfterInput = runs.updateRun({
    root: fixture,
    id: queued.id,
    status: "running",
    progress: "已收到用户回答，继续处理",
  });
  assert.equal(resumedAfterInput.status, "running");
  assert.equal(resumedAfterInput.question, undefined);
  pass("Agent runs can pause for a concrete user answer and resume with the same task ID");

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

  const profileConfigDraft = join(fixture, "draft-profile-config.yml");
  const profileNarrativeDraft = join(fixture, "draft-profile-narrative.md");
  writeFileSync(profileConfigDraft, "target_role: confirmed role\n");
  writeFileSync(profileNarrativeDraft, "# Profile\n\nconfirmed narrative\n");
  const bundledProfileRun = runs.createRun({
    root: fixture,
    id: "run-profile-bundle-1",
    intent: "update-profile",
    title: "一次确认完整画像",
    source: "agent",
  });
  const configProposal = runs.createProposal({
    root: fixture,
    runId: bundledProfileRun.id,
    target: "config/profile.yml",
    draftPath: profileConfigDraft,
    summary: "更新结构化画像",
  });
  const narrativeProposal = runs.createProposal({
    root: fixture,
    runId: bundledProfileRun.id,
    target: "modes/_profile.md",
    draftPath: profileNarrativeDraft,
    summary: "更新画像叙事",
  });
  runs.decideProposal({ root: fixture, proposalId: configProposal.id, decision: "approve" });
  const profileStillWaiting = runs.getRun(fixture, bundledProfileRun.id);
  assert.equal(profileStillWaiting.status, "waiting_approval");
  assert.equal(profileStillWaiting.completedAt, undefined);
  assert.equal(readFileSync(join(fixture, "config", "profile.yml"), "utf8"), "target_role: confirmed role\n");
  assert.equal(readFileSync(join(fixture, "modes", "_profile.md"), "utf8"), "# Profile\n\nnew confirmed value\n");
  runs.decideProposal({ root: fixture, proposalId: narrativeProposal.id, decision: "approve" });
  assert.equal(runs.getRun(fixture, bundledProfileRun.id).status, "completed");
  assert.equal(readFileSync(join(fixture, "modes", "_profile.md"), "utf8"), "# Profile\n\nconfirmed narrative\n");
  pass("A bundled profile update stays pending until every user-layer proposal is settled");

  const resumedProposalRun = runs.updateRun({
    root: fixture,
    id: proposalRun.id,
    status: "running",
    progress: "继续优化同一任务",
  });
  assert.equal(resumedProposalRun.completedAt, undefined);
  runs.updateRun({ root: fixture, id: proposalRun.id, status: "completed" });
  const revisedDraft = join(fixture, "draft-profile-revised.md");
  writeFileSync(revisedDraft, "# Profile\n\nrevised confirmed value\n");
  runs.createProposal({
    root: fixture,
    runId: proposalRun.id,
    target: "modes/_profile.md",
    draftPath: revisedDraft,
    summary: "继续优化同一文件",
  });
  const waitingAgain = runs.getRun(fixture, proposalRun.id);
  assert.equal(waitingAgain.status, "waiting_approval");
  assert.equal(waitingAgain.completedAt, undefined);
  pass("Reusing a completed task clears stale completion state while new work is active");

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
    /escapes the workspace through a symlink|符号链接.*超出了当前工作区/i,
  );
  pass("Proposal writes cannot escape through a symlinked user-layer directory");

  runs.archiveRun({ root: fixture, id: created.id });
  assert.equal(runs.listRuns(fixture).some((run) => run.id === created.id), false);
  assert.equal(runs.listRuns(fixture, { includeArchived: true }).some((run) => run.id === created.id), true);
  pass("Finished runs can be archived without deleting their artifacts");

  const queuedForArchive = runs.createRun({
    root: fixture,
    id: "run-queued-archive-1",
    intent: "discover",
    title: "搜索公开岗位",
    source: "web",
    status: "queued",
    instruction: "继续这项待确认任务。",
  });
  const archivedQueued = runs.archiveRun({ root: fixture, id: queuedForArchive.id });
  assert.equal(typeof archivedQueued.archivedAt, "string");
  assert.equal(runs.listRuns(fixture).some((run) => run.id === queuedForArchive.id), false);
  assert.equal(runs.getRun(fixture, queuedForArchive.id)?.id, queuedForArchive.id);
  assert.equal(
    runs.listRuns(fixture, { includeArchived: true }).some((run) => run.id === queuedForArchive.id),
    true,
  );
  pass("Queued runs can be soft-deleted while preserving their durable task record");
} catch (error) {
  fail(`agent run contract crashed: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  rmSync(fixture, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
}
