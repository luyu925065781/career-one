import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { KNOWN } from "./src/lib/clis.ts";
import { companyInitials, resolveCompanyIdentity } from "./src/lib/company.ts";
import { isEvaluationIntent, localizeUserMessage, parseReport, reportSectionPreview } from "./src/lib/format.ts";

function readSource(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const jobsPageSource = readSource("./src/app/jobs/page.tsx");
const applyPageSource = readSource("./src/app/apply/page.tsx");
const jobDetailSource = readSource("./src/app/jobs/[id]/page.tsx");
const jobStoreSource = readSource("./src/components/jobs/job-store.tsx");
const agentRunsApiSource = readSource("./src/app/api/agent-runs/route.ts");
const careerOneLibSource = readSource("./src/lib/career-one.ts");
const cvPdfApiSource = readSource("./src/app/api/cv-pdf/route.ts");
const runApiSource = readSource("./src/app/api/run/route.ts");
const assistantApiSource = readSource("./src/app/api/assistant/route.ts");
const assistantConsoleSource = readSource("./src/components/assistant-console.tsx");
const applyProviderSource = readSource("./src/components/apply/apply-provider.tsx");
const cvIngestSource = readSource("./src/components/cv/cv-ingest.tsx");
const generatePdfButtonSource = readSource("./src/components/generate-pdf-button.tsx");
const applyDiagnoseSource = readSource("./src/lib/apply/diagnose.ts");
const applySessionSource = readSource("./src/lib/apply/session.ts");
const copyableCommandSource = readSource("./src/components/copyable-command.tsx");
const applyViewSource = readSource("./src/components/apply-view.tsx");
const agentRunsContractSource = readSource("../scripts/agent/agent-runs.mjs");
const workerCardSource = readSource("./src/components/jobs/worker-card.tsx");
const workerPillsSource = readSource("./src/components/jobs/worker-pills.tsx");
const companyLogoSource = readSource("./src/components/company-logo.tsx");
const diagnosisViewSource = readSource("./src/components/cn-diagnose/cn-diagnose-view.tsx");
const diagnosisPageSource = readSource("./src/app/cn-diagnose/page.tsx");
const pipelineViewSource = readSource("./src/components/pipeline-view.tsx");
const explorerViewSource = readSource("./src/components/explore/explorer-view.tsx");
const explorePageSource = readSource("./src/app/explore/page.tsx");
const exploreProviderSource = readSource("./src/components/explore/explore-provider.tsx");
const exploreModeToggleSource = readSource("./src/components/explore/explore-mode-toggle.tsx");
const resultsListSource = readSource("./src/components/explore/results-list.tsx");
const cvEditorSource = readSource("./src/components/cv-editor.tsx");
const profilePageSource = readSource("./src/app/profile/page.tsx");
const interviewPageSource = readSource("./src/app/interview/page.tsx");
const portalsPageSource = readSource("./src/app/portals/page.tsx");
const configFormSource = readSource("./src/components/config-form.tsx");
const primaryNavSource = readSource("./src/lib/nav-items.ts");
const releaseSource = readSource("./src/lib/release.ts");
const reportViewSource = readSource("./src/components/report-view.tsx");
const gitIgnoreSource = readSource("../.gitignore");
const dataContractSource = readSource("../DATA_CONTRACT.md");
const pipelineDetailPageSource = readSource("./src/app/pipeline/[id]/page.tsx");
const todayDashboardSource = readSource("./src/components/home/today-dashboard.tsx");
const followUpCardSource = readSource("./src/components/home/follow-up-card.tsx");
const decisionCardSource = readSource("./src/components/home/decision-card.tsx");
const discoveryCardSource = readSource("./src/components/explore/discovery-card.tsx");
const quickEvaluateSource = readSource("./src/components/quick-evaluate.tsx");
const onboardingBannerSource = readSource("./src/components/onboarding-banner.tsx");
const aiSearchBoxSource = readSource("./src/components/explore/ai-search-box.tsx");
const aiSearchApiSource = readSource("./src/app/api/explore/ai/route.ts");
const costBadgeSource = readSource("./src/components/cost/cost-badge.tsx");
const filterBuilderSource = readSource("./src/components/explore/filter-builder.tsx");
const statCardSource = readSource("./src/components/ui/stat-card.tsx");
const homePageSource = readSource("./src/app/page.tsx");
const analyticsPageSource = readSource("./src/app/analytics/page.tsx");
const heroGlowSource = readSource("./src/components/hero-glow.tsx");
const designSystemShowcaseSource = readSource("./src/components/design-system-showcase.tsx");
const badgeSource = readSource("./src/components/ui/badge.tsx");
const buttonSource = readSource("./src/components/ui/button.tsx");
const cardSource = readSource("./src/components/ui/card.tsx");
const PAGE_SHELL_SOURCES = [
  "./src/app/apply/page.tsx",
  "./src/app/interview/page.tsx",
  "./src/app/profile/page.tsx",
  "./src/app/jobs/page.tsx",
  "./src/app/jobs/[id]/page.tsx",
  "./src/app/portals/page.tsx",
  "./src/components/cn-diagnose/cn-diagnose-view.tsx",
  "./src/components/config-form.tsx",
  "./src/components/cv-editor.tsx",
  "./src/components/explore/explorer-view.tsx",
  "./src/components/home/first-run-home.tsx",
  "./src/components/home/today-dashboard.tsx",
  "./src/components/pipeline-view.tsx",
  "./src/components/report-view.tsx",
];

function cli(id) {
  const spec = KNOWN.find((item) => item.id === id);
  assert.ok(spec, `missing CLI spec: ${id}`);
  return spec;
}

test("CLI registry keeps stable unique identifiers", () => {
  const ids = KNOWN.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("WorkBuddy uses the official CodeBuddy headless command", () => {
  const spec = cli("workbuddy");
  assert.equal(spec.bin, "codebuddy");
  assert.equal(spec.run, "codebuddy -p");

  const readArgs = spec.args("总结项目");
  assert.ok(readArgs.includes("-p"));
  assert.ok(readArgs.includes("总结项目"));
  const readAllowedTools = readArgs[readArgs.indexOf("--allowedTools") + 1];
  assert.equal(readAllowedTools, "Read,Glob,Grep");
  assert.doesNotMatch(readAllowedTools, /Write|Bash/);

  const writeArgs = spec.args("生成报告", { workspaceWrite: true, liveSearch: true });
  const allowedTools = writeArgs[writeArgs.indexOf("--allowedTools") + 1];
  assert.match(allowedTools, /Write/);
  assert.match(allowedTools, /Bash\(node:\*\)/);
  assert.match(allowedTools, /WebSearch/);
});

test("TRAE uses the official trae-cli run command", () => {
  const spec = cli("trae");
  assert.equal(spec.bin, "trae-cli");
  assert.equal(spec.run, "trae-cli run");
  assert.deepEqual(spec.args("评估岗位"), ["run", "评估岗位"]);
});

test("Agent task history keeps task details and report access inside the dense table", () => {
  assert.match(jobsPageSource, /href=\{`\/jobs\/\$\{job\.id\}`\}/);
  assert.match(jobsPageSource, /findReportHref\(job\)/);
  assert.match(jobsPageSource, /打开报告/);
  assert.match(jobsPageSource, /查看任务/);
});

test("evaluation artifacts use the canonical 岗位评估报告 label", () => {
  assert.match(workerPillsSource, /function artifactDisplayLabel/);
  assert.match(workerPillsSource, /return "岗位评估报告"/);
  assert.equal(
    (workerPillsSource.match(/\{artifactDisplayLabel\(artifact\)\}/g) ?? []).length,
    3,
    "linked, unlinked, and unavailable artifacts must use the same canonical label",
  );
});

test("all successfully completed Agent tasks use success chrome while score tone stays independent", () => {
  assert.match(
    workerCardSource,
    /export function pillTone[\s\S]{0,240}if \(j\.status === "done"\) return "good"/,
    "every valid completed task must render its check and progress bar as successful",
  );
  assert.match(workerCardSource, /const statusTone = pillTone\(job\)/);
  assert.match(workerCardSource, /const resultTone = TONE\[job\.result\?\.tone \?\? statusTone\]/);
  assert.match(workerCardSource, /resultTone\.chip/);
  assert.match(workerCardSource, /good:\s*\{\s*bar:\s*"bg-success-solid\/75"/);
  assert.match(agentRunsContractSource, /status:\s*decision === "approve" \? "applied" : "rejected"/);
  assert.match(agentRunsContractSource, /用户已确认并应用修改/);
});

test("Agent task history uses status tabs, a type filter, and a responsive semantic table", () => {
  assert.match(jobsPageSource, /const TASK_STATUS_TABS =/);
  assert.match(jobsPageSource, /\{ key: "invalid", label: "已失效" \}/);
  assert.doesNotMatch(jobsPageSource, /\{ key: "error", label: "出错" \}/);
  assert.match(jobsPageSource, /role="tablist"/);
  assert.match(jobsPageSource, /role="tab"/);
  assert.match(jobsPageSource, /role="tabpanel"/);
  assert.match(jobsPageSource, /ArrowLeft/);
  assert.match(jobsPageSource, /ArrowRight/);
  assert.match(jobsPageSource, /Home/);
  assert.match(jobsPageSource, /End/);
  assert.match(jobsPageSource, /任务类型/);
  assert.match(jobsPageSource, /value=\{typeFilter\}/);
  assert.match(
    jobsPageSource,
    /<span className="relative[^"]*">\s*<select[\s\S]{0,320}className="[^"]*appearance-none[^"]*pr-10/,
    "the task type select must reserve space for an inset custom arrow",
  );
  assert.match(
    jobsPageSource,
    /<ChevronDown\s+className="pointer-events-none absolute right-3[^"]*"\s+aria-hidden="true"/,
    "the task type select arrow must stay inset and ignore pointer events",
  );
  assert.match(jobsPageSource, /<table/);
  assert.match(jobsPageSource, /<th scope="col"/);
  assert.match(jobsPageSource, /className="[^"]*hidden[^"]*md:table[^"]*"/);
  assert.match(jobsPageSource, /md:hidden/);
  assert.doesNotMatch(jobsPageSource, /AgentTaskListCard/);
  assert.doesNotMatch(workerPillsSource, /export function AgentTaskListCard/);
  assert.match(diagnosisViewSource, /<EvaluationReportCard\s+report=\{report\}/);
  assert.doesNotMatch(diagnosisViewSource, /AgentTaskListCard/);
});

test("evaluation report history only contains successful artifact-backed reports and links the whole card", () => {
  assert.match(workerPillsSource, /export function findReportArtifact/);
  assert.match(
    workerPillsSource,
    /if \(job\.status !== "done" \|\| isInvalidJob\(job\)\) return null/,
  );
  assert.doesNotMatch(
    workerPillsSource,
    /if \(job\.page\?\.startsWith\("\/pipeline\/"\)\) return job\.page/,
  );
  assert.match(diagnosisViewSource, /function evaluationReportFromJob/);
  assert.match(diagnosisViewSource, /job\.status !== "done"/);
  assert.match(diagnosisViewSource, /artifact\.path\.startsWith\("reports\/"\)/);
  assert.match(diagnosisViewSource, /artifact\.path\.endsWith\("\.md"\)/);
  assert.match(
    diagnosisViewSource,
    /evaluationJobs\s*\.map\(\(job\) => evaluationReportFromJob\(job, reportIdentities\)\)\s*\.filter\(isEvaluationReportRecord\)/,
  );
  assert.match(diagnosisViewSource, /data-evaluation-report-card/);
  assert.match(diagnosisViewSource, /href=\{report\.href\}/);
  assert.match(diagnosisViewSource, /aria-label=\{`打开评估报告：\$\{report\.title\}`\}/);
});

test("evaluation report names come from canonical tracker identity instead of screenshot task titles", () => {
  assert.match(diagnosisPageSource, /readApplications\(\)/);
  assert.match(diagnosisPageSource, /reportIdentities=\{reportIdentities\}/);
  assert.match(diagnosisViewSource, /reportIdentities\.find/);
  assert.match(diagnosisViewSource, /title:\s*confirmedDisplayValue\(identity\?\.role\)/);
  assert.match(diagnosisViewSource, /company:\s*confirmedDisplayValue\(identity\?\.company\)/);
  assert.doesNotMatch(diagnosisViewSource, /title:\s*job\.title/);
  assert.match(diagnosisViewSource, /\{report\.company && \(/);
  assert.match(diagnosisViewSource, /text-xs text-muted/);
});

test("company identity distinguishes undisclosed employers from unverified names", () => {
  assert.deepEqual(resolveCompanyIdentity("OpenAI"), { kind: "known", label: "OpenAI" });
  assert.deepEqual(resolveCompanyIdentity("?", "招聘平台代招（机构未显示）"), {
    kind: "undisclosed",
    label: "公司未披露",
  });
  assert.deepEqual(resolveCompanyIdentity("?", "招聘平台截图（待核实）"), {
    kind: "unverified",
    label: "公司待核实",
  });
  assert.deepEqual(resolveCompanyIdentity("Confidential"), {
    kind: "undisclosed",
    label: "公司未披露",
  });
  assert.equal(companyInitials("?"), "");
});

test("company placeholders use a neutral entity icon and semantic accessible names", () => {
  assert.match(companyLogoSource, /Building2/);
  assert.match(companyLogoSource, /identity\.kind !== "known"/);
  assert.match(companyLogoSource, /bg-outline-bg text-icon-muted/);
  assert.doesNotMatch(companyLogoSource, /hsl\(/);
  assert.match(pipelineViewSource, /resolveCompanyIdentity\(r\.company, r\.via\)/);
  assert.match(pipelineViewSource, /<CompanyLogo name=\{r\.company\} size=\{28\}/);
  assert.match(pipelineViewSource, /\{companyIdentity\.label\}/);
  assert.match(
    pipelineViewSource,
    /href=\{`\/pipeline\/\$\{r\.n\}`\} className="[^"]*whitespace-nowrap[^"]*"/,
  );
  assert.match(pipelineViewSource, /更新 \$\{companyIdentity\.label\} · \$\{r\.role\} 的求职状态/);
  assert.match(reportViewSource, /resolveCompanyIdentity\(app\.company, app\.via\)/);
  assert.match(reportViewSource, /\{reportCompanyLabel\}/);
  assert.match(decisionCardSource, /resolveCompanyIdentity\(app\.company, app\.via\)/);
  assert.match(decisionCardSource, /\{companyIdentity\.label\}/);
  assert.match(followUpCardSource, /resolveCompanyIdentity\(followup\.company\)/);
  assert.match(followUpCardSource, /\{companyIdentity\.label\}/);
});

test("pipeline prioritizes the role before the company in order and typography", () => {
  assert.match(
    pipelineViewSource,
    /const SORT_KEYS = \["role", "company", "score", "status", "date"\] as const/,
  );

  const rowStart = pipelineViewSource.indexOf('<tr key={`${r.n}-${i}`}');
  assert.ok(rowStart >= 0, "the tracker row must exist");
  const trackerRow = pipelineViewSource.slice(rowStart, rowStart + 2_200);
  assert.ok(
    trackerRow.indexOf("{r.role}") < trackerRow.indexOf("{companyIdentity.label}"),
    "the role cell must render before the company cell",
  );
  assert.match(
    trackerRow,
    /<Link\s+href=\{`\/pipeline\/\$\{r\.n\}`\}\s+className="[^"]*font-semibold[^"]*text-foreground[^"]*"\s*>\s*\{r\.role\}\s*<\/Link>/,
  );
  assert.match(
    trackerRow,
    /<td className="px-4 py-3 text-muted">[\s\S]{0,240}<CompanyLogo name=\{r\.company\} size=\{28\}/,
  );
});

test("Agent task detail stays on task pages while job evaluation starts with screenshot input", () => {
  assert.match(workerPillsSource, /export function AgentTaskDetailPanel/);
  assert.match(workerPillsSource, /data-agent-task-detail/);
  assert.match(workerPillsSource, /<section className="dot-bg[^"]*">\s*<HeroGlow \/>/);
  assert.doesNotMatch(
    workerPillsSource,
    /\(job\.status === "running" \|\| job\.status === "waiting"\) && <HeroGlow \/>/,
  );
  assert.match(workerPillsSource, /由 Agent 原生入口发起/);
  assert.match(workerPillsSource, /job\.steps\.map/);
  assert.match(workerPillsSource, />生成结果</);
  assert.match(jobDetailSource, /<AgentTaskDetailPanel\s+job=\{job\}\s+titleLevel="h1"/);
  assert.doesNotMatch(diagnosisViewSource, /AgentTaskDetailPanel|CurrentEvaluationTaskDetail|currentEvaluation|当前岗位评估/);
  assert.match(workerPillsSource, /artifactPlacement\?: "summary" \| "after-steps"/);
  assert.match(workerPillsSource, /artifactPlacement = "after-steps"/);
  assert.match(workerPillsSource, /<div className="grid w-full gap-2">/);
  assert.doesNotMatch(workerPillsSource, /compact && "max-w-xl"/);
  assert.match(
    workerPillsSource,
    /artifactPlacement === "summary" && artifacts\.length > 0[\s\S]{0,260}data-task-summary-artifacts/,
  );
  assert.match(
    workerPillsSource,
    /artifactPlacement === "after-steps" && artifacts\.length > 0[\s\S]{0,260}>生成结果</,
  );
  const screenshotIndex = diagnosisViewSource.indexOf('<ScreenshotEvaluate page="/cn-diagnose" />');
  const reportsIndex = diagnosisViewSource.indexOf('id="evaluation-reports-title"');
  assert.ok(screenshotIndex >= 0, "the screenshot evaluator must be rendered");
  assert.ok(reportsIndex > screenshotIndex, "screenshot evaluation must be the first module before report history");
  assert.match(diagnosisViewSource, />\s*历史评估报告\s*</);
  assert.doesNotMatch(diagnosisViewSource, /最近一次岗位评估|单独打开任务|role="progressbar"|evaluationProgress/);
});

test("job diagnosis always exposes screenshot evaluation before loading or showing reports", () => {
  assert.match(explorerViewSource, /export function ScreenshotEvaluate/);
  assert.match(explorerViewSource, /page = "\/cn-diagnose"/);
  assert.match(diagnosisViewSource, /import \{ ScreenshotEvaluate \} from "@\/components\/explore\/explorer-view"/);
  assert.match(diagnosisViewSource, /const \{ jobs, jobsReady \} = useJobs\(\)/);
  assert.match(diagnosisViewSource, /<section className="mt-2" aria-label="招聘截图评估">\s*<ScreenshotEvaluate page="\/cn-diagnose" \/>/);
  assert.match(diagnosisViewSource, /!jobsReady\s*\?/);
  assert.doesNotMatch(diagnosisViewSource, /evaluationJobs\.length === 0\s*\?/);
  assert.match(diagnosisViewSource, /<ScreenshotEvaluate page="\/cn-diagnose" \/>/);
  assert.match(diagnosisViewSource, /执行记录请在 Agent 任务中查看/);
});

test("Agent task detail removes a duplicate page shortcut when the artifact already links there", () => {
  assert.match(
    workerPillsSource,
    /const hasMatchingPageArtifact = job\.artifacts\?\.some\(\(artifact\) => artifact\.available !== false && artifact\.page === job\.page\) \?\? false/,
  );
  assert.match(workerPillsSource, /\{job\.page && !hasMatchingPageArtifact && \(/);
  assert.match(workerPillsSource, /if \(artifact\.page && artifact\.available !== false\)[\s\S]*reportPageHref\(artifact\.page\)/);
});

test("queued Agent tasks can be resumed from their detail page without creating a new task ID", () => {
  assert.match(agentRunsContractSource, /instruction:\s*cleanText\(instruction,\s*1_000\)/);
  assert.match(agentRunsApiSource, /pushOption\(args,\s*"--instruction",\s*instruction\)/);
  assert.match(jobStoreSource, /instruction:\s*run\.instruction/);
  assert.match(jobStoreSource, /export function buildExistingTaskInstruction/);
  assert.match(jobStoreSource, /已有待办任务 ID/);
  assert.match(jobStoreSource, /不要创建新任务/);

  assert.match(jobDetailSource, /buildExistingTaskInstruction\(job\)/);
  assert.match(jobDetailSource, /复制并交给 Agent|复制续接指令/);
  assert.match(jobDetailSource, /复制下面的指令交给当前 Agent，让它继续完成这项任务。/);
  assert.match(jobDetailSource, /如果原 Agent 仍在执行/);
  assert.match(jobDetailSource, /不会创建新任务/);
  assert.match(
    jobDetailSource,
    /<\/AgentTaskDetailPanel>\s*\{canContinue && \(\s*<AgentTaskContinuation/,
    "the task status must be shown before the continuation action",
  );
  assert.doesNotMatch(jobDetailSource, /queueAgentTask|action:\s*"queue"/);
});

test("Agent tasks waiting for user input show the concrete question and an answer handoff", () => {
  assert.match(agentRunsContractSource, /"waiting_input"/);
  assert.match(agentRunsContractSource, /if \(command === "wait"\)/);
  assert.match(agentRunsContractSource, /question:\s*option\(args, "--question"\)/);
  assert.match(agentRunsApiSource, /action === "wait" && id/);
  assert.match(agentRunsApiSource, /pushOption\(args, "--question", body\.question\)/);

  assert.match(jobStoreSource, /SharedRunStatus =[\s\S]{0,180}"waiting_input"/);
  assert.match(jobStoreSource, /question\?: string/);
  assert.match(jobStoreSource, /run\.status === "queued" \|\| run\.status === "waiting_input" \|\| run\.status === "waiting_approval"/);
  assert.match(jobStoreSource, /question:\s*run\.question/);
  assert.match(jobStoreSource, /export function buildWaitingInputInstruction/);

  assert.match(jobDetailSource, /job\.runStatus === "waiting_input"/);
  assert.match(jobDetailSource, /buildWaitingInputInstruction\(job/);
  assert.match(jobDetailSource, />Agent 等待您的回答</);
  assert.match(jobDetailSource, /aria-label="您的回答"/);
  assert.match(jobDetailSource, /复制回答并继续/);
  assert.match(jobDetailSource, /请粘贴到原 Agent 对话中/);

  assert.match(workerPillsSource, /job\.runStatus === "waiting_input"/);
  assert.match(workerPillsSource, /等待您回复/);
  assert.match(workerCardSource, /job\.runStatus === "waiting_input"[\s\S]{0,160}等待您回复/);
});

test("invalid Agent tasks include failed, cancelled, and interrupted runs and expose retry", () => {
  assert.match(
    jobStoreSource,
    /export function isInvalidJob[\s\S]{0,320}job\.status === "error"[\s\S]{0,180}job\.runStatus === "failed"[\s\S]{0,120}job\.runStatus === "cancelled"/,
  );
  assert.match(
    jobStoreSource,
    /run\.status === "failed" \|\| run\.status === "cancelled"[\s\S]{0,80}\? "error"/,
    "persisted failed and cancelled runs must enter the invalid task group",
  );
  assert.match(
    jobStoreSource,
    /j\.status === "running"[\s\S]{0,120}status: "error" as const[\s\S]{0,160}页面重新加载，任务已中断/,
    "interrupted legacy local runs must enter the invalid task group",
  );
  assert.match(
    jobStoreSource,
    /const persistentAgentTask = Boolean\(j\.runStatus\) \|\| j\.id\.startsWith\("run-web-"\);[\s\S]{0,180}j\.status === "running" && !persistentAgentTask/,
    "a persisted Agent handoff must survive a page reload",
  );
  assert.doesNotMatch(
    jobStoreSource,
    /localFinishedBeforeSync/,
    "the shared Agent run must override a stale local completion or interruption state",
  );
  assert.match(workerPillsSource, /error: "已失效"/);
  assert.doesNotMatch(workerPillsSource, /error: "出错"|> 出错</);
  assert.match(workerCardSource, /isInvalidJob\(job\)/);
  assert.match(
    jobDetailSource,
    /const invalid = isInvalidJob\(job\)[\s\S]{0,260}const isAgentHandoff =[\s\S]{0,220}invalid/,
    "all invalid Web runs must expose the Agent retry handoff",
  );
  assert.match(jobDetailSource, /invalid\s*\?\s*"重新交给 Agent 处理"/);
  assert.match(jobDetailSource, /invalid\s*\?\s*"复制重试指令"/);
  assert.match(jobDetailSource, /继续时会复用当前任务 ID，不会创建新任务/);
});

test("product-authored user feedback is Chinese and historical English failures are localized", () => {
  assert.equal(
    localizeUserMessage("The CLI produced no output — is it installed and authenticated?"),
    "Agent CLI 没有返回任何内容。请确认所选 CLI 已安装并完成登录，然后重试。",
  );
  assert.equal(
    localizeUserMessage("Interrupted (page reloaded)"),
    "页面重新加载，任务已中断",
  );

  assert.doesNotMatch(runApiSource, /The CLI produced no output|The CLI exited with an error|This evaluation didn't save a report|This run hit an error/);
  assert.match(runApiSource, /Agent CLI 没有返回任何内容。请确认所选 CLI 已安装并完成登录，然后重试。/);
  assert.doesNotMatch(assistantApiSource, /no output — is the CLI authenticated/);
  assert.doesNotMatch(assistantConsoleSource, /no output — is the CLI authenticated|Connection error/);
  assert.doesNotMatch(jobStoreSource, /Interrupted \(page reloaded\)|Failed to start|Connection error|"Done"/);
  assert.doesNotMatch(applyProviderSource, /Couldn't|The agent|The planner|Pre-fill ended|stream error/);
  assert.doesNotMatch(cvIngestSource, /Couldn't|Connect an AI CLI|That file|Your CV/);
  assert.doesNotMatch(applyDiagnoseSource, /message:\s*(?:"|`)[A-Z][a-z]/);
  assert.doesNotMatch(applySessionSource, /message:\s*(?:"|`)[A-Z][a-z]|throw new Error\("[A-Z][a-z]/);
  assert.doesNotMatch(copyableCommandSource, /Copied to clipboard|Copy command|title=\{copied \? "Copied" : "Copy"\}/);
  assert.doesNotMatch(followUpCardSource, /note:\s*"Followed up"/);
  assert.doesNotMatch(applyViewSource, /f\.label \|\| "Yes"/);
});

test("queued Agent tasks can be soft-deleted without losing their durable record", () => {
  assert.match(jobDetailSource, /const canDelete = job\.runStatus === "queued"/);
  assert.match(jobDetailSource, /<QueuedTaskArchiveButton job=\{job\}\s*\/>/);
  assert.match(jobDetailSource, /role="alertdialog"/);
  assert.match(jobDetailSource, /aria-modal="true"/);
  assert.match(jobDetailSource, /删除这项待确认任务？/);
  assert.match(jobDetailSource, /只进行逻辑删除/);
  assert.match(jobDetailSource, /任务记录、任务 ID 和已生成产物都会保留/);
  assert.match(jobDetailSource, /await removeJob\(job\.id\)/);
  assert.match(jobDetailSource, /router\.replace\("\/jobs"\)/);
  assert.match(jobDetailSource, /event\.key === "Escape"/);
  assert.match(jobDetailSource, /event\.key !== "Tab"/);

  assert.match(jobStoreSource, /removeJob:\s*\(id: string\) => Promise<void>/);
  assert.match(
    jobStoreSource,
    /const removeJob = useCallback\(async \(id: string\) => \{[\s\S]*action: "archive"[\s\S]*if \(!response\.ok\)[\s\S]*setJobs/,
  );
  assert.match(agentRunsApiSource, /action === "archive" && id/);
  assert.match(agentRunsContractSource, /archivedAt: now\(\)/);
  assert.match(agentRunsContractSource, /\.filter\(\(run\) => includeArchived \|\| !run\.archivedAt\)/);
});

test("approved Agent proposals navigate only after every bundled proposal is settled", () => {
  assert.match(jobDetailSource, /<ProposalReview[^>]*resultPage=\{job\.page\}/);
  assert.match(
    jobDetailSource,
    /function ProposalReview\(\{\s*proposal,\s*resultPage,\s*onSettled,\s*\}[\s\S]{0,320}const router = useRouter\(\)/,
  );
  assert.match(
    jobDetailSource,
    /if \(action === "approve" && result\.run\?\.status === "completed" && resultPage\?\.startsWith\("\/"\) && !resultPage\.startsWith\("\/\/"\)\)\s*\{\s*router\.replace\(resultPage\);\s*return;/,
    "approval must continue to the result page only after no bundled proposal remains pending",
  );
  assert.match(
    agentRunsApiSource,
    /const proposal = runContract\(\[action, text\(body\.proposalId\)!\]\)[\s\S]{0,240}runContract\(\["get", proposal\.runId\]\)[\s\S]{0,120}\{ proposal, run \}/,
    "proposal decisions must return the updated parent run so the UI can avoid an early redirect",
  );
  assert.doesNotMatch(
    jobDetailSource,
    /if \(action === "reject"[\s\S]{0,120}router\.(?:push|replace)/,
    "rejecting a proposal must keep the user on the review page",
  );
});

test("job discovery is a manual handoff and does not expose Agent scanning", () => {
  assert.doesNotMatch(explorerViewSource, /ExploreModeToggle|AgentScanHandoff|discover\(|在 Agent 中开始扫描/);
  assert.match(explorerViewSource, /你自己在招聘网站找到感兴趣的岗位/);
  assert.match(explorerViewSource, /择程AI不爬取招聘网站/);
  assert.doesNotMatch(explorerViewSource, /<QuickEvaluate|粘贴岗位网址进行评估/);
  assert.match(explorerViewSource, /Web 会把截图保存到当前本地工作区/);
  assert.doesNotMatch(explorerViewSource, /<AiSearchBox|paramsToAi|mode === "ai"|setMode|setAiIntent/);
  assert.doesNotMatch(exploreProviderSource, /\bExploreMode\b|\bsetMode\b|\baiIntent\b|\bsetAiIntent\b/);
  assert.doesNotMatch(resultsListSource, /\bmode\b|\bisAi\b|候选岗位|kind=\{isAi/);
});

test("career profile removes the duplicate search card and copies roles from the canonical row", () => {
  assert.doesNotMatch(profilePageSource, /seedExploreFilters|SearchKeywordsCard|岗位筛选标签/);
  assert.match(profilePageSource, /import \{ CopyTagValuesButton \} from "@\/components\/explore\/explorer-view"/);
  assert.match(profilePageSource, /\{ label: "目标岗位", values: roleValues, compact: true, copyable: true \}/);
  assert.match(profilePageSource, /copyable && <CopyTagValuesButton label=\{label\} values=\{values\} \/>/);
  assert.match(explorerViewSource, /export function CopyTagValuesButton/);
  assert.match(explorerViewSource, /aria-label=\{`复制\$\{label\}`\}/);
  assert.match(explorerViewSource, /formatJobSearchKeywords/);
  assert.match(explorerViewSource, /navigator\.clipboard\.writeText/);
  assert.match(explorerViewSource, /const SOURCES = \[/);
  assert.match(explorerViewSource, /BOSS直聘/);
  assert.match(explorerViewSource, /猎聘/);
  assert.match(explorerViewSource, /智联招聘/);
  assert.match(explorerViewSource, /脉脉/);
  assert.match(explorerViewSource, /https:\/\/maimai\.cn\//);
  assert.doesNotMatch(explorerViewSource, /拉勾|lagou\.com/);
  assert.match(explorerViewSource, /完整 JD/);
  assert.match(explorerViewSource, /招聘截图/);
  assert.doesNotMatch(explorerViewSource, /岗位详情链接|岗位链接作为补充|<QuickEvaluate/);
  assert.match(explorerViewSource, /第一步，找岗位/);
  assert.match(explorerViewSource, /第二步 · 交给 Agent/);
  assert.doesNotMatch(explorerViewSource, /第一步 · 自己找|第二步 · 带回来|第三步 · 交给 Agent|把岗位信息带回工作台/);
  assert.match(explorerViewSource, /sm:grid-cols-2/);
  assert.doesNotMatch(explorerViewSource, /sm:grid-cols-3/);
  assert.match(explorerViewSource, /把岗位信息交给 Agent，开始评估/);
  assert.match(explorerViewSource, /ScreenshotEvaluate/);
  assert.match(explorerViewSource, /上传或粘贴招聘截图/);
  assert.match(explorerViewSource, /保存并交给 Agent 评估/);
  assert.match(explorerViewSource, /不会上传到外部服务/);
  assert.match(explorerViewSource, /岗位评估由你自己的 Agent 完成/);
  assert.doesNotMatch(explorerViewSource, /FilterBuilder|保存设置|排除岗位|地区与扫描范围/);
});

test("Web screenshot evaluations persist local task attachments and expose them in reports", () => {
  assert.match(explorerViewSource, /queueAgentTaskWithAttachments/);
  assert.match(explorerViewSource, /attachToAgentTask/);
  assert.match(explorerViewSource, /attachments:\s*screenshots/);
  assert.match(explorerViewSource, /正在保存到本地/);
  assert.match(explorerViewSource, /data\/task-attachments\/&lt;任务ID&gt;\//);

  assert.match(jobStoreSource, /value\.startsWith\("data\/task-attachments\/"\)/);
  assert.match(jobStoreSource, /\*\*Screenshots:\*\*/);
  assert.match(jobStoreSource, /attachmentPaths/);
  assert.match(jobStoreSource, /queueAgentTaskWithAttachments/);
  assert.match(jobStoreSource, /attachToAgentTask/);

  assert.match(agentRunsApiSource, /MAX_SCREENSHOT_BYTES\s*=\s*8 \* 1024 \* 1024/);
  assert.match(agentRunsApiSource, /validateImageSignature/);
  assert.match(agentRunsApiSource, /"task-attachments"/);
  assert.match(agentRunsApiSource, /path\.basename\(id\)/);
  assert.match(agentRunsApiSource, /fs\.realpathSync\(taskDir\)/);
  assert.match(agentRunsApiSource, /fs\.lstatSync\(taskDir\)\.isSymbolicLink\(\)/);
  assert.match(agentRunsApiSource, /class TaskAttachmentNotFoundError extends Error/);
  assert.match(agentRunsApiSource, /error instanceof TaskAttachmentNotFoundError/);
  assert.match(agentRunsApiSource, /status: 404/);
  assert.match(agentRunsApiSource, /action === "attach" && id/);
  assert.match(agentRunsApiSource, /Content-Disposition/);
  assert.match(agentRunsContractSource, /if \(command === "attach"\)/);

  assert.match(reportViewSource, /field\("Screenshots"\)/);
  assert.match(reportViewSource, /岗位原始截图/);
  assert.match(reportViewSource, /\/api\/agent-runs\?attachment=/);
  assert.match(reportViewSource, /截图保存在当前工作区/);
  assert.match(gitIgnoreSource, /data\/task-attachments\//);
  assert.match(dataContractSource, /data\/task-attachments\/\*/);
});

test("isolated user data keeps using the running Web version's task protocol", () => {
  assert.match(careerOneLibSource, /export function careerOneSystemRoot\(/);
  assert.match(
    careerOneLibSource,
    /export function rootScript[\s\S]{0,220}careerOneSystemRoot\(\)/,
    "system scripts must not be resolved from an isolated user-data root",
  );
  assert.doesNotMatch(
    agentRunsApiSource,
    /stderr\.trim\(\)\.split\("\\n"\)\.at\(-1\)/,
    "the API must not expose the last line of CLI help as the user-facing error",
  );
  assert.match(
    agentRunsApiSource,
    /当前工作区的 Agent 任务协议版本不兼容/,
    "protocol mismatches need a stable Chinese error instead of raw CLI usage",
  );
});

test("report parser preserves the task screenshot header for the report gallery", () => {
  const meta = parseReport([
    "# 评估报告: ? — 资深 Agent 工程师",
    "",
    "**Date:** 2026-08-14",
    "**Screenshots:** data/task-attachments/run-web-evaluate-123/01-abcdef123456.png",
    "",
    "---",
    "",
    "## A) 岗位预览",
  ].join("\n"));
  assert.deepEqual(
    meta.fields.find((field) => field.label === "Screenshots"),
    {
      label: "Screenshots",
      value: "data/task-attachments/run-web-evaluate-123/01-abcdef123456.png",
    },
  );
});

test("job discovery prefers Chinese target roles and limits display and copy to five", () => {
  assert.match(explorerViewSource, /const MAX_TARGET_ROLE_TAGS = 5;/);
  assert.match(
    explorerViewSource,
    /const targetRoleValues = selectTargetRoleTags\(filters\.positive, MAX_TARGET_ROLE_TAGS\);/,
  );
  assert.match(explorerViewSource, /<SearchTagGroup label="目标岗位" values=\{targetRoleValues\} \/>/);
  assert.doesNotMatch(explorerViewSource, /<SearchTagGroup label="目标岗位" values=\{filters\.positive\} \/>/);
});

test("the retired Agent search surface remains a safe handoff and cannot start a model inside Web", () => {
  assert.match(aiSearchBoxSource, /useJobs\(\)/);
  assert.match(aiSearchBoxSource, /queueAgentTask\(taskOpts\)/);
  assert.match(aiSearchBoxSource, /<AgentTaskHandoffDialog/);
  assert.match(aiSearchBoxSource, /交给 Agent 搜索/);
  assert.match(aiSearchBoxSource, /等待 Agent 处理/);
  assert.doesNotMatch(aiSearchBoxSource, /cliConfigured|cliName|Agent CLI|搜索公开信息/);

  assert.match(jobStoreSource, /opts\.kind === "discover"/);
  assert.match(jobStoreSource, /请使用择程AI根据以下目标搜索公开岗位/);
  assert.match(jobStoreSource, /请继续这个任务，不要创建新任务/);

  assert.match(costBadgeSource, /tip\?: string/);
  assert.match(aiSearchBoxSource, /Web 工作台不会启动模型/);
  assert.doesNotMatch(explorerViewSource, /BlockedCard|CLI_NAMES|cliConfigured|discoverAI/);
  assert.doesNotMatch(exploreProviderSource, /\/api\/explore\/ai|discoverAI|career-one:config/);

  assert.match(aiSearchApiSource, /status:\s*410/);
  assert.match(aiSearchApiSource, /AGENT_HANDOFF_REQUIRED/);
  assert.doesNotMatch(aiSearchApiSource, /spawn\(|resolveCli|child_process/);
});

test("Web task entry points queue Agent handoffs and never start a configured CLI", () => {
  assert.doesNotMatch(jobStoreSource, /fetch\("\/api\/run"/);
  assert.doesNotMatch(jobStoreSource, /career-one:config|cliId|尚未配置 Agent CLI/);
  assert.match(jobStoreSource, /const startJob = useCallback[\s\S]{0,220}queueAgentTask\(opts\)\.id/);
  assert.match(jobStoreSource, /opts\.kind === "evaluate"/);
  assert.match(jobStoreSource, /岗位有效性/);
  assert.match(jobStoreSource, /评估本次招聘截图/);

  assert.match(quickEvaluateSource, /queueAgentTask\(taskOpts\)/);
  assert.match(quickEvaluateSource, /<AgentTaskHandoffDialog/);
  assert.match(quickEvaluateSource, /交给 Agent 评估/);
  assert.doesNotMatch(quickEvaluateSource, /startJob\(|\/api\/run/);

  assert.match(discoveryCardSource, /queueAgentTask\(taskOpts\)/);
  assert.match(discoveryCardSource, /<AgentTaskHandoffDialog/);
  assert.match(discoveryCardSource, /交给 Agent 评估/);
  assert.doesNotMatch(
    discoveryCardSource.match(/const evaluate = \(\) => \{([\s\S]*?)\n  \};/)?.[1] ?? "",
    /addToPipeline/,
    "evaluating a discovery card must not implicitly write the posting into the pipeline",
  );
  assert.doesNotMatch(discoveryCardSource, /startJob\(|\/api\/run/);
});

test("evaluation handoffs let the Agent preflight onboarding and resume the same task", () => {
  assert.match(jobStoreSource, /const EVALUATION_PREFLIGHT =/);
  assert.match(jobStoreSource, /node doctor\.mjs --json/);
  assert.match(jobStoreSource, /onboardingNeeded/);
  assert.match(jobStoreSource, /不得评估、评分、生成报告或更新求职记录/);
  assert.match(jobStoreSource, /保留当前岗位输入和附件/);
  assert.match(jobStoreSource, /run wait/);
  assert.match(jobStoreSource, /继续同一任务完成评估/);
  assert.match(jobStoreSource, /面试故事库不作为阻塞项/);

  const evaluationInstructionSource = jobStoreSource.slice(
    jobStoreSource.indexOf('if (opts.kind === "evaluate")'),
    jobStoreSource.indexOf('if (opts.kind === "profile")'),
  );
  assert.equal(
    evaluationInstructionSource.match(/\$\{EVALUATION_PREFLIGHT\}/g)?.length,
    2,
    "both screenshot and URL evaluation handoffs must enforce the same Agent preflight",
  );
});

test("a fresh workspace does not resurrect stale browser Agent tasks", () => {
  assert.match(jobStoreSource, /const JOBS_KEY_PREFIX = "career-one:jobs:"/);
  assert.match(jobStoreSource, /function jobsStorageKey\(workspaceId: string\)/);
  assert.match(jobStoreSource, /payload\.workspaceId/);
  assert.match(jobStoreSource, /localStorage\.getItem\(jobsStorageKey\(workspaceId\)\)/);
  assert.match(jobStoreSource, /localStorage\.setItem\(storageKey/);
  assert.doesNotMatch(jobStoreSource, /localStorage\.getItem\(JOBS_KEY\)/);
  assert.doesNotMatch(jobStoreSource, /localStorage\.setItem\(JOBS_KEY,/);

  assert.match(agentRunsApiSource, /function workspaceFingerprint\(/);
  assert.match(agentRunsApiSource, /workspaceId:\s*workspaceFingerprint\(\)/);
  assert.match(agentRunsApiSource, /function errorResponse[\s\S]{0,820}workspaceId:\s*workspaceFingerprint\(\)/);
  assert.match(jobDetailSource, /const \{ jobs, jobsReady, refreshJobs \} = useJobs\(\)/);
  assert.match(jobDetailSource, /if \(!jobsReady\)/);
  assert.match(jobDetailSource, /当前工作区中找不到这项任务/);
  assert.match(jobStoreSource, /const sharedProtocolLoaded = useRef\(false\)/);
  assert.match(jobStoreSource, /sharedProtocolLoaded\.current = true/);
  assert.match(jobStoreSource, /const optimistic = base\.filter/);
  assert.match(jobStoreSource, /return \[\.\.\.optimistic, \.\.\.merged\]/);
  assert.doesNotMatch(jobStoreSource, /const notRegisteredYet = current\.filter/);
});

test("Agent task artifacts expose server-verified availability and missing files are not clickable", () => {
  assert.match(agentRunsApiSource, /function artifactExistsInWorkspace\(/);
  assert.match(agentRunsApiSource, /available:\s*artifactExistsInWorkspace\(/);
  assert.match(jobStoreSource, /available\?: boolean/);
  assert.match(workerPillsSource, /artifact\.available === false/);
  assert.match(workerPillsSource, /文件已不可用/);
  assert.match(workerPillsSource, /aria-disabled="true"/);
  assert.match(
    workerPillsSource,
    /artifact\.page && artifact\.available !== false/,
    "a missing artifact must render as a disabled row instead of a link",
  );
});

test("profile setup is an explicit onboarding step without reviving a second onboarding flow", () => {
  assert.doesNotMatch(homePageSource, /OnboardingBanner/);
  assert.match(homePageSource, /const \{ missing, hasCv \} = doctorState\(\)/);
  assert.match(homePageSource, /setupMissing=\{missing\}/);

  assert.match(onboardingBannerSource, /export function ProfileSetupChecklist/);
  assert.match(onboardingBannerSource, /kind:\s*"profile"/);
  assert.doesNotMatch(onboardingBannerSource, /kind:\s*"portals"/);
  assert.match(onboardingBannerSource, /queueAgentTask\(taskOpts\)/);
  assert.match(onboardingBannerSource, /<AgentTaskHandoffDialog/);
  assert.match(onboardingBannerSource, /在 Agent 中完善画像/);
  assert.doesNotMatch(onboardingBannerSource, /在 Agent 中配置岗位来源/);
  assert.match(onboardingBannerSource, /data-profile-setup/);
  assert.doesNotMatch(onboardingBannerSource, /"cv\.md"|fetch\("\/api\/doctor"|dismissed/);
  assert.doesNotMatch(onboardingBannerSource, /career-one:config|cliId|co-assistant|href="\/config"/);

  assert.match(jobStoreSource, /opts\.kind === "profile"/);
  assert.match(jobStoreSource, /config\/profile\.yml/);
  assert.match(jobStoreSource, /modes\/_profile\.md/);

  assert.match(todayDashboardSource, /const profileSetupMissing =/);
  assert.match(todayDashboardSource, /const profileSetupNeeded =/);
  assert.match(todayDashboardSource, /"\/profile"/);
  assert.match(todayDashboardSource, /<ProfileSetupChecklist missing=\{profileSetupMissing\} \/>/);

  assert.doesNotMatch(explorerViewSource, /AgentScanHandoff|在 Agent 中开始扫描/);
  assert.match(explorerViewSource, /择程AI不爬取招聘网站/);
});

test("profile onboarding collects every confirmation in one response instead of serial follow-ups", () => {
  const profileInstruction = jobStoreSource.match(
    /if \(opts\.kind === "profile"\) \{([\s\S]*?)\n  \}/,
  )?.[1] ?? "";

  assert.match(profileInstruction, /一次性列出所有仍需用户确认的项目/);
  assert.match(profileInstruction, /姓名和联系方式/);
  assert.match(profileInstruction, /所在城市、时区/);
  assert.match(profileInstruction, /目标岗位与职级/);
  assert.match(profileInstruction, /地点、工作方式与迁居意愿/);
  assert.match(profileInstruction, /目标薪资范围与最低接受值/);
  assert.match(profileInstruction, /核心优势与代表成果/);
  assert.match(profileInstruction, /动力来源、理想工作方式与求职红线/);
  assert.match(profileInstruction, /公开项目、文章、案例或作品集/);
  assert.match(profileInstruction, /不得拆分为多轮逐项追问/);
  assert.match(profileInstruction, /没有回答的项目保留为“待确认”/);
  assert.doesNotMatch(profileInstruction, /逐步确认/);

  assert.match(onboardingBannerSource, /一次确认完整画像/);
});

test("profile setup comes immediately after CV and before interview stories everywhere", () => {
  const dashboardProfileIndex = todayDashboardSource.indexOf('title: "完善求职画像"');
  const dashboardStoryIndex = todayDashboardSource.indexOf('title: "整理面试故事库"');
  assert.ok(dashboardProfileIndex >= 0, "the Dashboard must expose profile setup as a workflow step");
  assert.ok(dashboardStoryIndex > dashboardProfileIndex, "profile setup must precede interview stories");
  assert.match(todayDashboardSource.slice(dashboardProfileIndex), /complete:\s*profileSetupMissing\.length === 0/);

  const storyInstruction = jobStoreSource.match(
    /if \(opts\.kind === "story-bank"\) \{([\s\S]*?)\n  \}/,
  )?.[1] ?? "";
  assert.match(storyInstruction, /先确认 config\/profile\.yml 和 modes\/_profile\.md 已存在/);
  assert.match(storyInstruction, /画像缺失时不要生成面试故事/);

  const assistantCvIndex = assistantApiSource.indexOf("1. CV FIRST");
  const assistantProfileIndex = assistantApiSource.indexOf("2. PROFILE SECOND");
  const assistantStoryIndex = assistantApiSource.indexOf("3. STORIES THIRD");
  assert.ok(assistantCvIndex >= 0);
  assert.ok(assistantProfileIndex > assistantCvIndex);
  assert.ok(assistantStoryIndex > assistantProfileIndex);
  assert.doesNotMatch(assistantApiSource, /WOW #1|Then DEEPEN/);
});

test("retired discovery links converge on profile or direct job evaluation", () => {
  assert.match(explorePageSource, /permanentRedirect\("\/profile"\)/);
  assert.doesNotMatch(explorePageSource, /ExplorerView|seedExploreFilters|doctorState/);
  assert.match(discoveryCardSource, /page: "\/cn-diagnose"/);
  assert.doesNotMatch(discoveryCardSource, /page: "\/explore"/);
  assert.match(cvIngestSource, /router\.push\("\/profile"\)/);
  assert.doesNotMatch(cvIngestSource, /filtersToParams|\/explore/);
  assert.doesNotMatch(todayDashboardSource, /href="\/explore"|href: "\/explore"/);
  assert.doesNotMatch(cvEditorSource, /href="\/explore"|发现岗位/);
  assert.doesNotMatch(pipelineViewSource, /href="\/explore"|去发现岗位|“发现岗位”/);
  assert.match(assistantApiSource, /4\. SCORE DIRECTLY/);
  assert.doesNotMatch(assistantApiSource, /4\. DISCOVER AND SCORE/);
  assert.doesNotMatch(aiSearchApiSource, /请在“发现岗位”中/);
  assert.doesNotMatch(portalsPageSource, /当前请在“发现岗位”/);
});

test("an empty CV guides new users into their own Agent without starting a model in Web", () => {
  assert.match(cvEditorSource, /\{!exists && loaded && <CvAgentOnboarding \/>/);
  assert.match(cvEditorSource, /data-cv-agent-onboarding/);
  assert.match(cvEditorSource, /在 Agent 中创建简历/);
  assert.match(cvEditorSource, /Web 工作台只保存待办和交接指令，不会在这里启动模型/);
  assert.match(cvEditorSource, /export function CreateCvWithAgentAction/);
  assert.match(cvEditorSource, /kind:\s*"cv"/);
  assert.match(cvEditorSource, /input:\s*"cv\.md"/);
  assert.match(cvEditorSource, /page:\s*"\/cv"/);
  assert.match(cvEditorSource, /queueAgentTask\(taskOpts\)/);
  assert.match(cvEditorSource, /<AgentTaskHandoffDialog/);
  assert.match(cvEditorSource, /job\?\.runStatus === "queued"/);
  assert.match(cvEditorSource, /job\?\.runStatus === "waiting_approval"/);
  assert.doesNotMatch(cvEditorSource, /startJob\(|\/api\/run/);

  assert.match(jobStoreSource, /opts\.kind === "cv"/);
  assert.match(jobStoreSource, /创建 cv\.md/);
  assert.match(jobStoreSource, /不得虚构经历、指标、技能或个人贡献/);
  assert.match(jobStoreSource, /待确认提案/);
});

test("evaluation reports exclude resume generation while Agent history keeps every task", () => {
  assert.equal(isEvaluationIntent("evaluate"), true);
  assert.equal(isEvaluationIntent("evaluate-job"), true);
  assert.equal(isEvaluationIntent("pdf"), false);
  assert.equal(isEvaluationIntent(undefined), false);
  assert.match(diagnosisViewSource, /return isEvaluationIntent\(job\.kind\)/);
  assert.match(diagnosisViewSource, /jobs\s*\.filter\(isEvaluationJob\)/);
  assert.doesNotMatch(diagnosisViewSource, /function isEvaluationJob[\s\S]{0,220}job\.title/);
  assert.match(jobsPageSource, /\{filteredJobs\.map\(\(job\) =>/);
});

test("Agent task page header follows the pipeline page layout", () => {
  const sharedHeaderClass = /<div className="flex items-end justify-between gap-4">/;
  assert.match(pipelineViewSource, sharedHeaderClass);
  assert.match(jobsPageSource, sharedHeaderClass);
  assert.match(jobsPageSource, /<div className="page-shell py-8 max-sm:pb-24"[^>]*>/);

  const headerPosition = jobsPageSource.indexOf('<div className="flex items-end justify-between gap-4">');
  const taskListPosition = jobsPageSource.indexOf('role="tablist"');
  assert.ok(headerPosition >= 0, "missing standalone Agent task page header");
  assert.ok(taskListPosition > headerPosition, "Agent task list must render below the standalone page header");
  assert.doesNotMatch(jobsPageSource, /<section[^>]*>\s*<header/);
});

test("evaluation report returns to its actual previous entry point", () => {
  assert.match(reportViewSource, /<ReportBackButton\s*\/>/);
  assert.doesNotMatch(reportViewSource, /href="\/pipeline"[\s\S]{0,160}求职进度/);
  assert.match(pipelineViewSource, /export function ReportBackButton/);
  assert.match(pipelineViewSource, /window\.history\.length > 1[\s\S]{0,120}router\.back\(\)/);
  assert.match(pipelineViewSource, /router\.replace\("\/pipeline"\)/);
  assert.match(pipelineViewSource, /aria-label="返回上一页"/);
});

test("application progress detail is distinct from the evaluation report and owns tracking actions", () => {
  assert.match(pipelineDetailPageSource, /searchParams:\s*Promise<\{\s*view\?:\s*string/);
  assert.match(pipelineDetailPageSource, /view === "report"/);
  assert.match(pipelineDetailPageSource, /<ApplicationProgressDetail/);
  assert.match(pipelineDetailPageSource, /<ReportView/);
  assert.match(assistantApiSource, /\/pipeline\/\{n\} \(求职进度详情\)/);
  assert.match(assistantApiSource, /\/pipeline\/\{n\}\?view=report \(岗位评估报告\)/);

  assert.match(pipelineViewSource, /export function ApplicationProgressDetail/);
  assert.match(pipelineViewSource, />当前进度</);
  assert.match(pipelineViewSource, />求职阶段</);
  assert.match(pipelineViewSource, />下一步</);
  assert.match(pipelineViewSource, />对应操作</);
  assert.match(pipelineViewSource, /<StatusSelect/);
  assert.match(pipelineViewSource, /<GeneratePdfButton/);
  assert.match(pipelineViewSource, /<ApplyButton/);
  assert.match(pipelineViewSource, /<DeleteFromTracker/);
  assert.match(pipelineViewSource, /`\/pipeline\/\$\{app\.n\}\?view=report`/);
  assert.match(pipelineViewSource, /function progressNote[\s\S]{0,180}report-language/);

  assert.match(reportViewSource, />岗位评估报告</);
  assert.match(reportViewSource, />\s*查看求职进度\s*</);
  assert.doesNotMatch(reportViewSource, /<StatusSelect|<GeneratePdfButton|<ApplyButton|<DeleteFromTracker/);
});

test("tailored PDF links use the report manifest for anonymous companies", () => {
  assert.match(pipelineViewSource, /reportNumber=\{app\.report\.match\(\/\\\[\(\\d\+\)\\\]\//);
  assert.match(generatePdfButtonSource, /reportNumber\?: string/);
  assert.match(generatePdfButtonSource, /reportNumber[\s\S]{0,240}\/api\/cv-pdf\?report=/);
  assert.match(cvPdfApiSource, /searchParams\.get\("report"\)/);
  assert.match(cvPdfApiSource, /pdf-index\.tsv/);
});

test("report section headings use compact Chinese numbered prefixes without a background", () => {
  assert.match(
    reportViewSource,
    /<span className="shrink-0 whitespace-nowrap text-sm font-medium">\s*<span className="tabular-nums">\{i \+ 1\}、<\/span>\s*\{cleanHeading\(s\.heading\)\}\s*<\/span>/,
  );
  assert.doesNotMatch(
    reportViewSource,
    /className="[^"]*bg-brand-soft[^"]*"[\s\S]{0,100}\{i \+ 1\}/,
  );
  assert.doesNotMatch(reportViewSource, /min-w-5[\s\S]{0,100}\{i \+ 1\}/);
});

test("collapsed report cards preview the first numbered item with the shared length limit", () => {
  for (const marker of [".", ")", "、", "）"]) {
    assert.equal(
      reportSectionPreview(`1${marker} 第一条追问\n2${marker} 第二条追问`),
      "第一条追问",
      `failed ordered-list marker ${marker}`,
    );
  }

  const longFirstItem = "很长".repeat(60);
  assert.equal(reportSectionPreview(`1. ${longFirstItem}\n2. 第二条`), `${longFirstItem.slice(0, 96)}…`);
  assert.equal(reportSectionPreview("普通内容区开头文案"), "普通内容区开头文案");
});

test("Agent task history is reached from the tray icon, not primary navigation", () => {
  const navItemsSource = readSource("./src/lib/nav-items.ts");
  const desktopShellSource = readSource("./src/components/app-shell.tsx");
  const mobileNavSource = readSource("./src/components/mobile-nav.tsx");

  assert.doesNotMatch(navItemsSource, /href: "\/jobs"|label: "Agent 任务"/);
  assert.match(workerPillsSource, /<Link href="\/jobs"[^>]*title="历史记录"[^>]*aria-label="Agent 任务历史"/);
  assert.match(workerPillsSource, /<History className="size-3\.5" \/>/);
  assert.match(desktopShellSource, /NAV_ITEMS\.map/);
  assert.match(mobileNavSource, /NAV_ITEMS\.map/);
});

test("primary navigation retires job discovery and keeps direct evaluation", () => {
  const navItemsSource = readSource("./src/lib/nav-items.ts");

  assert.doesNotMatch(navItemsSource, /href: "\/explore"|label: "发现岗位"|discoverJobs:/);
  assert.match(
    navItemsSource,
    /\{ href: "\/cn-diagnose", label: "岗位评估", icon: ScanSearch, feature: "jobDiagnosis" \}/,
  );
});

test("sidebar keeps interview stories, profile, and CV as its final three destinations", () => {
  const cvIndex = primaryNavSource.indexOf('cv: { href: "/cv"');
  const profileIndex = primaryNavSource.indexOf('profile: { href: "/profile"');
  const storiesIndex = primaryNavSource.indexOf('interviewStories: { href: "/interview"');

  assert.ok(cvIndex >= 0, "CV must remain in primary navigation");
  assert.ok(profileIndex > storiesIndex, "profile must be the second-to-last primary destination");
  assert.ok(cvIndex > profileIndex, "CV must be the last primary destination");
  assert.match(
    primaryNavSource,
    /interviewStories:[^\n]+\n\s+profile:[^\n]+\n\s+cv:[^\n]+\n\} satisfies Record<string, NavItem>;/,
  );
  assert.match(primaryNavSource, /profile: \{ href: "\/profile", label: "求职画像", icon: UserRound, feature: "profile" \}/);
  assert.match(releaseSource, /\| "profile"/);
  assert.match(releaseSource, /\["\/profile", "profile"\]/);

  assert.match(profilePageSource, /readCareerProfileSnapshot/);
  assert.doesNotMatch(profilePageSource, /seedExploreFilters|<SearchKeywordsCard/);
  assert.match(profilePageSource, /<CopyTagValuesButton label=\{label\} values=\{values\} \/>/);
  assert.match(profilePageSource, /const PageIcon = PRIMARY_NAV_ITEMS\.profile\.icon/);
  assert.match(profilePageSource, /<h1 className="page-title">求职画像<\/h1>/);
  assert.match(profilePageSource, /目标岗位与职级/);
  assert.match(profilePageSource, /地点与工作方式/);
  assert.match(profilePageSource, /薪酬边界/);
  assert.match(profilePageSource, /核心优势与成果/);
  assert.match(profilePageSource, /工作偏好与求职红线/);
  assert.match(profilePageSource, /narrative\.motivation/);
  assert.match(profilePageSource, /narrative\.ideal_work_style/);
  assert.match(profilePageSource, /narrative\.red_lines/);
  assert.match(profilePageSource, /联系方式与公开作品/);
  assert.match(profilePageSource, /narrative\.public_work_status/);
  assert.match(profilePageSource, /个性化求职策略/);
  assert.match(profilePageSource, /已确认/);
  assert.match(profilePageSource, /待确认/);
  assert.match(profilePageSource, /<ProfileAgentAction/);
  assert.match(profilePageSource, /href="\/cv"/);
  assert.match(profilePageSource, /href="\/interview"/);
  assert.doesNotMatch(profilePageSource, /fetch\("\/api\/profile"|method:\s*"POST"/);

  assert.match(todayDashboardSource, /title: "完善求职画像"[\s\S]{0,160}href: "\/profile"/);
  assert.doesNotMatch(todayDashboardSource, /href: "#profile-setup"/);
  assert.match(cvEditorSource, /href="\/profile"/);
  assert.doesNotMatch(cvEditorSource, /href="\/#profile-setup"/);
  assert.match(assistantApiSource, /Valid paths:[^\n]*\/profile/);
  assert.match(workerPillsSource, /page === "\/profile"\) return "打开求职画像"/);
  assert.match(readSource("./src/proxy.ts"), /"\/profile\/:path\*"/);
});

test("job sources stays contextual while the retired discovery route redirects to profile", () => {
  const primaryItemsBlock = primaryNavSource.match(
    /export const PRIMARY_NAV_ITEMS = \{([\s\S]*?)\} satisfies Record<string, NavItem>;/,
  )?.[1] ?? "";
  assert.doesNotMatch(primaryItemsBlock, /jobSources|\/portals|岗位来源/);
  assert.match(primaryNavSource, /export const CONTEXTUAL_NAV_ITEMS = \{/);
  assert.match(
    primaryNavSource,
    /jobSources: \{ href: "\/portals", label: "岗位来源", icon: Radar, feature: "jobSources" \}/,
  );
  assert.match(
    primaryNavSource,
    /const ALL_NAV_ITEMS: NavItem\[\] = Object\.values\(PRIMARY_NAV_ITEMS\)/,
  );
  assert.doesNotMatch(primaryItemsBlock, /discoverJobs|\/explore|发现岗位/);
  assert.match(explorePageSource, /permanentRedirect\("\/profile"\)/);
});

test("primary destination headings reuse the exact sidebar icon mapping", () => {
  assert.match(primaryNavSource, /export const PRIMARY_NAV_ITEMS = \{/);

  for (const [key, icon] of [
    ["home", "LayoutDashboard"],
    ["jobDiagnosis", "ScanSearch"],
    ["pipeline", "ListChecks"],
    ["cv", "FileText"],
    ["profile", "UserRound"],
    ["interviewStories", "BookOpenCheck"],
  ]) {
    assert.match(
      primaryNavSource,
      new RegExp(`${key}: \\{ href: "[^"]+", label: "[^"]+", icon: ${icon}, feature: "${key}" \\}`),
      `missing primary navigation icon mapping for ${key}`,
    );
  }

  for (const [source, key] of [
    [todayDashboardSource, "home"],
    [diagnosisViewSource, "jobDiagnosis"],
    [pipelineViewSource, "pipeline"],
    [cvEditorSource, "cv"],
    [profilePageSource, "profile"],
    [interviewPageSource, "interviewStories"],
  ]) {
    assert.match(source, new RegExp(`const PageIcon = PRIMARY_NAV_ITEMS\\.${key}\\.icon;`));
    assert.match(source, /<PageIcon className="[^"]*\btext-icon-brand\b[^"]*" aria-hidden="true" \/>/);
  }

  const designSystemSource = readSource("../DESIGN_SYSTEM.md");
  assert.match(designSystemSource, /主导航页面的一级标题图标必须复用 `PRIMARY_NAV_ITEMS`/);
  assert.match(
    primaryNavSource,
    /export const CONTEXTUAL_NAV_ITEMS = \{[\s\S]*jobSources: \{ href: "\/portals", label: "岗位来源", icon: Radar, feature: "jobSources" \}/,
  );
  assert.match(portalsPageSource, /const PageIcon = CONTEXTUAL_NAV_ITEMS\.jobSources\.icon;/);
  assert.match(portalsPageSource, /不会自动爬取或启动 Agent 搜索/);
  assert.match(
    designSystemSource,
    /从主导航下沉到业务页的入口必须复用 `CONTEXTUAL_NAV_ITEMS`/,
  );
});

test("page title icons are vertically centered with their heading text", () => {
  for (const source of [
    diagnosisViewSource,
    pipelineViewSource,
    profilePageSource,
    interviewPageSource,
    portalsPageSource,
    cvEditorSource,
  ]) {
    assert.match(
      source,
      /<div className="[^"]*\bitems-center\b[^"]*">\s*<PageIcon className="size-6 shrink-0 text-icon-brand" aria-hidden="true" \/>\s*<h1/,
    );
    assert.doesNotMatch(source, /<PageIcon className="[^"]*\bmt-/);
  }
});

test("top-level workbench pages share one semantic title style", () => {
  const globalsSource = readSource("./src/app/globals.css");
  const designSystemSource = readSource("../DESIGN_SYSTEM.md");
  const pageTitleRule = globalsSource.match(/\.page-title\s*\{([\s\S]*?)\}/)?.[1] ?? "";

  assert.match(pageTitleRule, /font-family:\s*var\(--font-display\);/);
  assert.match(pageTitleRule, /font-size:\s*1\.875rem;/);
  assert.match(pageTitleRule, /line-height:\s*2\.25rem;/);
  assert.match(pageTitleRule, /letter-spacing:\s*-0\.025em;/);
  assert.match(pageTitleRule, /color:\s*var\(--landing\);/);

  for (const [source, title] of [
    [diagnosisViewSource, "岗位评估"],
    [pipelineViewSource, "求职进度"],
    [interviewPageSource, "面试故事库"],
    [portalsPageSource, "岗位来源"],
    [cvEditorSource, "简历编辑器"],
    [jobsPageSource, "Agent 任务"],
    [applyPageSource, "申请辅助"],
    [configFormSource, "设置"],
  ]) {
    assert.match(
      source,
      new RegExp(`<h1 className="page-title">${title}</h1>`),
      `${title} must use the shared page-title style`,
    );
  }

  assert.match(designSystemSource, /一级工作流页面标题统一使用 `page-title`/);
});

test("primary navigation makes the dashboard the home and retires the duplicate analytics destination", () => {
  const navItemsSource = readSource("./src/lib/nav-items.ts");

  assert.match(
    navItemsSource,
    /\{ href: "\/", label: "看板", icon: LayoutDashboard, feature: "home" \}/,
  );
  assert.doesNotMatch(navItemsSource, /href: "\/analytics"|label: "数据分析"|BarChart3/);
  assert.match(analyticsPageSource, /import \{ redirect \} from "next\/navigation"/);
  assert.match(analyticsPageSource, /redirect\("\/"\)/);
});

test("feature maturity remains behavior-only and exposes no visible label system", () => {
  const navItemsSource = readSource("./src/lib/nav-items.ts");
  const desktopShellSource = readSource("./src/components/app-shell.tsx");
  const mobileNavSource = readSource("./src/components/mobile-nav.tsx");
  const designSystemSource = readSource("../DESIGN_SYSTEM.md");

  assert.doesNotMatch(navItemsSource, /featureStageLabel|\bchip\??:/);
  assert.doesNotMatch(desktopShellSource, /NAV_ITEMS\.map\(\(\{[^}]*\bchip\b|\{chip\s*&&/);
  assert.doesNotMatch(mobileNavSource, /NAV_ITEMS\.map\(\(\{[^}]*\bchip\b|\{chip\s*&&/);
  assert.doesNotMatch(explorerViewSource, />\s*新\s*</);
  assert.doesNotMatch(
    releaseSource,
    /STAGE_LABELS|CHANNEL_LABELS|featureStageLabel|releaseChannelLabel|releaseDisplayLabel/,
  );
  assert.match(
    designSystemSource,
    /功能成熟度只用于 `isFeatureEnabled\(\)` 控制可用性，不生成或展示“新”“内测”“开发”等标签/,
  );
});

test("desktop slogan uses a full-width divider and centered compact content", () => {
  const desktopShellSource = readSource("./src/components/app-shell.tsx");
  const mobileNavSource = readSource("./src/components/mobile-nav.tsx");

  assert.match(desktopShellSource, /<div className="-mb-4 -mx-4 mt-auto border-t border-border px-4 py-2">[\s\S]{0,100}<div className="flex h-7 items-center/);
  assert.match(mobileNavSource, /<div className="co-msafe mt-auto border-t border-border px-4 pt-2">[\s\S]{0,100}<div className="flex h-11/);
});

test("clearing finished Agent tasks requires one accessible confirmation flow", () => {
  assert.match(jobsPageSource, /<ClearFinishedButton\s*\/>/);
  assert.doesNotMatch(workerPillsSource, /<ClearFinishedButton variant="sidebar"\s*\/>/);
  assert.match(workerPillsSource, /role="alertdialog"/);
  assert.match(workerPillsSource, /aria-modal="true"/);
  assert.match(workerPillsSource, /aria-labelledby=\{titleId\}/);
  assert.match(workerPillsSource, /aria-describedby=\{descriptionId\}/);
  assert.match(workerPillsSource, />\s*清除历史任务\s*<\/button>/);
  assert.match(workerPillsSource, /清除历史任务？/);
  assert.match(workerPillsSource, /报告和已生成文件不会被删除/);
  assert.match(workerPillsSource, /ref=\{cancelRef\}[\s\S]*取消/);
  assert.match(workerPillsSource, /event\.key === "Escape"/);
  assert.match(workerPillsSource, /event\.key !== "Tab"/);
  assert.match(workerPillsSource, /function confirmClear\(\)[\s\S]*clearFinished\(\)/);
});

test("sidebar Agent task tray uses one fixed short capsule scrollbar across Chrome, Edge, and Safari", () => {
  const desktopShellSource = readSource("./src/components/app-shell.tsx");
  const mobileNavSource = readSource("./src/components/mobile-nav.tsx");
  const globalsSource = readSource("./src/app/globals.css");

  assert.match(workerPillsSource, /const recentJobs = jobs\.slice\(0, 10\)/);
  assert.match(workerPillsSource, /const running = jobs\.filter\(\(job\) => job\.status === "running"\)\.length/);
  assert.match(workerPillsSource, /const waiting = jobs\.filter\(\(job\) => job\.status === "waiting"\)\.length/);
  assert.match(workerPillsSource, /recentJobs\.map\(\(j\) =>/);
  assert.doesNotMatch(workerPillsSource, /const activeJobs =/);
  assert.match(workerPillsSource, /data-agent-task-tray[\s\S]{0,180}min-h-0[\s\S]{0,120}flex-1/);
  assert.match(workerPillsSource, /const AGENT_TASK_SCROLL_THUMB_PX = 44;/);
  assert.match(workerPillsSource, /className="agent-task-scroll-shell relative min-h-0 flex-1"/);
  assert.match(workerPillsSource, /<ul[\s\S]{0,220}ref=\{taskListRef\}[\s\S]{0,220}onScroll=\{syncTaskScrollbar\}[\s\S]{0,220}className="[^"]*agent-task-scrollbar[^"]*h-full[^"]*overflow-y-auto[^"]*pb-3[^"]*"/);
  assert.match(
    globalsSource,
    /\.agent-task-scrollbar\s*\{[^}]*scrollbar-width:\s*none;[^}]*\}/,
    "the browser-owned thumb must be hidden so each engine uses the shared capsule indicator",
  );
  assert.match(globalsSource, /\.agent-task-scrollbar::-webkit-scrollbar\s*\{[^}]*display:\s*none;/);
  const taskScrollbarThumbRule =
    globalsSource.match(/\.agent-task-scroll-thumb\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(taskScrollbarThumbRule, /width:\s*3px;/);
  assert.match(taskScrollbarThumbRule, /background-color:\s*color-mix\(in srgb, var\(--faint\) 18%, transparent\);/);
  assert.match(taskScrollbarThumbRule, /border-radius:\s*var\(--radius-button\);/);
  assert.match(
    globalsSource,
    /\.agent-task-scroll-shell:hover \.agent-task-scroll-thumb\s*\{[^}]*background-color:\s*color-mix\(in srgb, var\(--faint\) 34%, transparent\);/,
  );
  assert.match(workerPillsSource, /const thumbHeight = Math\.min\(AGENT_TASK_SCROLL_THUMB_PX, viewportHeight\);/);
  assert.match(workerPillsSource, /const clampedScrollTop = Math\.min\(maxScrollTop, Math\.max\(0, scroller\.scrollTop\)\);/);
  assert.match(workerPillsSource, /thumb\.hidden = maxScrollTop <= 0 \|\| thumbHeight <= 0;/);
  assert.match(workerPillsSource, /thumb\.style\.transform = `translateY\(\$\{thumbTop\}px\)`;/);
  assert.match(
    workerPillsSource,
    /if \(!taskScrollInitializedRef\.current\)\s*\{\s*scroller\.scrollTop = 0;\s*taskScrollInitializedRef\.current = true;/,
  );
  assert.match(workerPillsSource, /resizeObserver\.observe\(scroller\);/);
  assert.match(workerPillsSource, /Array\.from\(scroller\.children\)\.forEach\(\(child\) => resizeObserver\.observe\(child\)\);/);
  assert.match(
    workerPillsSource,
    /className="pointer-events-none absolute inset-y-0 -right-1\.5 w-\[3px\]"/,
    "the capsule must sit in the sidebar gutter instead of touching the task cards",
  );
  assert.match(workerPillsSource, /ref=\{taskScrollThumbRef\}[\s\S]{0,180}aria-hidden="true"[\s\S]{0,180}hidden/);
  assert.match(desktopShellSource, /<aside className="[^"]*overflow-hidden[^"]*"/);
  assert.doesNotMatch(desktopShellSource, /<aside className="[^"]*overflow-y-auto[^"]*"/);
  assert.match(mobileNavSource, /\.co-mdrawer\{[^}]*overflow:hidden/);
  assert.match(jobsPageSource, /\{filteredJobs\.map\(\(job\) =>/);
});

test("Today hero advances onboarding before direct job evaluation", () => {
  assert.match(todayDashboardSource, /const nextGuideStep = guideSteps\.find\(\(step\) => !step\.complete\)/);
  assert.match(todayDashboardSource, /nextGuideStep && allClear/);
  assert.match(todayDashboardSource, /href=\{nextGuideStep\.href\}/);
  assert.match(todayDashboardSource, /\{nextGuideStep\.title\}/);
  assert.match(todayDashboardSource, /\{allClear && !nextGuideStep && \(/);
  assert.match(todayDashboardSource, /<Link href="\/cn-diagnose"[^>]*>\s*岗位评估/);
  assert.match(todayDashboardSource, /<Link href="\/pipeline"[^>]*>\s*求职进度\s*<\/Link>/);
  assert.doesNotMatch(todayDashboardSource, />\s*打开求职进度\s*</);
  assert.doesNotMatch(todayDashboardSource, /QuickEvaluate|粘贴岗位网址进行评估|交给 Agent 评估|消耗 TOKENS/);
  assert.doesNotMatch(todayDashboardSource, /\binBetween\b/);
  assert.doesNotMatch(homePageSource, /inBetween=/);
});

test("Agent history distinguishes loading from empty and folds duplicate failed evaluations", () => {
  assert.match(jobStoreSource, /jobsReady:\s*boolean/);
  assert.match(jobStoreSource, /const \[jobsReady, setJobsReady\] = useState\(false\)/);
  assert.match(jobStoreSource, /\.finally\(\(\) => setJobsReady\(true\)\)/);
  assert.match(jobsPageSource, /const \{ jobs, jobsReady \} = useJobs\(\)/);
  assert.match(jobsPageSource, /function collapseDuplicateFailedEvaluations/);
  assert.match(jobsPageSource, /isInvalidJob\(job\)/);
  assert.match(jobsPageSource, /已折叠.*重复失败记录/);
  assert.match(jobsPageSource, /role="status"/);
  assert.match(jobsPageSource, /正在加载 Agent 任务/);
  assert.match(jobsPageSource, /aria-busy=\{!jobsReady\}/);
  assert.match(jobsPageSource, /!jobsReady\s*\?/);
  assert.match(jobsPageSource, /visibleJobs\.length === 0/);
});

test("the standalone discovery page is replaced by the profile page", () => {
  assert.match(explorePageSource, /import \{ permanentRedirect \} from "next\/navigation"/);
  assert.match(explorePageSource, /permanentRedirect\("\/profile"\)/);
  assert.doesNotMatch(profilePageSource, /岗位筛选标签|<SearchKeywordsCard/);
  assert.match(profilePageSource, /copyable: true/);
  assert.doesNotMatch(primaryNavSource, /discoverJobs|发现岗位|href: "\/explore"/);
});

test("failed evaluation handoffs use explicit retry wording", () => {
  for (const source of [quickEvaluateSource, discoveryCardSource]) {
    assert.match(source, /isInvalidJob/);
    assert.match(source, /重新交给 Agent 评估/);
  }
});

test("new users get one full-width responsive five-step progress indicator inside the Dashboard", () => {
  assert.match(homePageSource, /readStoryBank/);
  assert.doesNotMatch(homePageSource, /assessStoryReadiness|readyStoryCount/);
  assert.match(homePageSource, /hasCv=\{hasCv\}/);
  assert.match(homePageSource, /storyCount=\{storyCount\}/);
  assert.doesNotMatch(homePageSource, /FirstRunHome/);
  assert.doesNotMatch(homePageSource, /if \(phase === "first-run"\) return/);

  assert.match(todayDashboardSource, /data-dashboard-primary-grid/);
  assert.match(todayDashboardSource, /data-dashboard-onboarding-card/);
  assert.doesNotMatch(todayDashboardSource, /data-getting-started-path|GettingStartedPath/);
  assert.doesNotMatch(todayDashboardSource, /xl:grid-cols-\[minmax\(0,1\.55fr\)_minmax\(21rem,0\.85fr\)\]/);
  assert.match(
    todayDashboardSource,
    /data-dashboard-onboarding-card[\s\S]{0,180}className="w-full p-0"/,
    "the onboarding aggregate must inherit the shared Card border, surface, and radius tokens",
  );
  assert.doesNotMatch(
    todayDashboardSource.match(/<Card[\s\S]{0,260}data-dashboard-onboarding-card[\s\S]{0,260}>/)?.[0] ?? "",
    /border-brand|bg-brand|bg-surface\/65/,
    "the onboarding aggregate must not invent a brand-coloured card treatment",
  );
  assert.match(todayDashboardSource, /<ol[^>]*aria-label="新用户求职流程"[^>]*className="[^"]*lg:grid-cols-5[^"]*lg:gap-x-2/);
  assert.doesNotMatch(todayDashboardSource, /(?:md|lg):grid-cols-6/);
  assert.match(todayDashboardSource, /data-step-connector/);
  assert.match(todayDashboardSource, /grid-cols-\[2\.5rem_minmax\(0,1fr\)\][^"]*lg:block[^"]*lg:px-3/);
  assert.match(todayDashboardSource, /aria-current=\{current \? "step" : undefined\}/);
  assert.match(todayDashboardSource, /const guideComplete =/);
  assert.match(todayDashboardSource, /<GettingStartedCard[\s\S]{0,180}setupMissing=\{profileSetupMissing\}/);
  assert.doesNotMatch(todayDashboardSource, /\{!guideComplete && <GettingStartedCard/);
  assert.match(todayDashboardSource, /complete \? "求职流程已完成" : "完成你的求职闭环"/);
  assert.match(todayDashboardSource, /complete:\s*storyCount > 0/);
  assert.doesNotMatch(todayDashboardSource, /readyStoryCount|STORY_READY_TARGET/);
  assert.match(todayDashboardSource, /五个关键环节可按需推进/);
  assert.match(todayDashboardSource, /工作台只推荐当前动作，不限制您进入其他环节/);
  assert.match(todayDashboardSource, /applications\.length > 0/);
  assert.match(todayDashboardSource, /PROGRESS_STARTED_STATES\.has\(canonStatus\(application\.status\)\)/);
  assert.doesNotMatch(todayDashboardSource, /localStorage|sessionStorage/);

  const statsIndex = todayDashboardSource.indexOf("data-dashboard-stats");
  const primaryGridIndex = todayDashboardSource.indexOf("data-dashboard-primary-grid");
  const onboardingCardIndex = todayDashboardSource.indexOf("data-dashboard-onboarding-card");
  assert.ok(statsIndex >= 0, "Dashboard stats must remain present");
  assert.ok(primaryGridIndex > statsIndex, "the Dashboard primary grid must follow the stat cards");
  assert.ok(onboardingCardIndex > primaryGridIndex, "the onboarding card must live inside the Dashboard primary grid");

  const expectedSteps = [
    ["智能编辑简历", "/cv"],
    ["完善求职画像", "/profile"],
    ["整理面试故事库", "/interview"],
    ["岗位评估", "/cn-diagnose"],
    ["求职进度", "/pipeline"],
  ];
  let previous = -1;
  for (const [label, href] of expectedSteps) {
    const index = todayDashboardSource.indexOf(`title: "${label}"`);
    assert.ok(index > previous, `${label} must appear in the requested workflow order`);
    assert.match(todayDashboardSource.slice(index), new RegExp(`href: "${href.replaceAll("/", "\\/")}"`));
    previous = index;
  }
});

test("career-one semantic tokens own status, radius, elevation, and controls", () => {
  const globalsSource = readSource("./src/app/globals.css");

  for (const token of [
    "success",
    "success-surface",
    "success-border",
    "warning",
    "warning-surface",
    "warning-border",
    "danger",
    "danger-surface",
    "danger-border",
    "info",
    "info-surface",
    "info-border",
  ]) {
    assert.match(
      globalsSource,
      new RegExp(`--color-${token}:\\s*var\\(--state-${token}\\)`),
      `missing semantic state token ${token}`,
    );
  }
  for (const token of ["button", "control", "card", "panel"]) {
    assert.match(globalsSource, new RegExp(`--radius-${token}:`), `missing semantic radius token ${token}`);
  }
  for (const token of ["raised", "floating", "overlay"]) {
    assert.match(globalsSource, new RegExp(`--shadow-${token}:`), `missing semantic elevation token ${token}`);
  }
  assert.match(buttonSource, /rounded-button/);
  assert.match(cardSource, /rounded-card/);
  assert.match(cardSource, /shadow-raised/);
});

test("all action buttons use one global pill-shaped radius without changing form controls", () => {
  const globalsSource = readSource("./src/app/globals.css");
  const designSystemSource = readSource("../DESIGN_SYSTEM.md");

  assert.match(globalsSource, /--radius-button:\s*9999px;/);
  assert.match(globalsSource, /--radius-control:\s*0\.5rem;/);
  assert.match(
    globalsSource,
    /button:not\(\[data-button-shape="container"\]\):not\(\[role="tab"\]\)[\s\S]{0,280}border-radius:\s*var\(--radius-button\)\s*!important;/,
  );
  assert.match(globalsSource, /input\[type="submit"\]/);
  assert.match(globalsSource, /input\[type="button"\]/);
  assert.match(globalsSource, /input\[type="reset"\]/);
  assert.match(buttonSource, /rounded-button/);
  assert.doesNotMatch(buttonSource, /rounded-control/);
  assert.match(
    pipelineViewSource,
    /data-button-shape="container"[\s\S]{0,220}border-b-2/,
    "pipeline tabs must keep a straight selection indicator",
  );

  for (const source of [
    jobDetailSource,
    aiSearchBoxSource,
    explorerViewSource,
    cvIngestSource,
    generatePdfButtonSource,
  ]) {
    assert.doesNotMatch(source, /inline-flex[^"]*rounded-(?:md|lg)[^"]*(?:bg-brand|border-outline-border)/);
  }

  assert.match(configFormSource, /data-button-shape="container"/);
  assert.match(designSystemSource, /所有文本按钮、图标按钮和按钮式链接统一使用胶囊形/);
  assert.match(designSystemSource, /披露行或整行可点击容器不属于动作按钮/);
});

test("dashboard metrics use vivid dedicated semantic tokens", () => {
  const globalsSource = readSource("./src/app/globals.css");
  const designTokenSource = readSource("../DESIGN.md");
  const designSystemSource = readSource("../DESIGN_SYSTEM.md");
  const lightThemeSource = globalsSource.match(/:root \{([\s\S]*?)\n\}/)?.[1] ?? "";
  const darkThemeSource = globalsSource.match(/\.dark \{([\s\S]*?)\n\}/)?.[1] ?? "";
  const metricColors = {
    brand: "#b48300",
    warning: "#ea580c",
    info: "#2563eb",
    success: "#059669",
    danger: "#e11d48",
    purple: "#4d44d6",
  };
  const lightMetricMinimumSaturation = {
    brand: 0.75,
    warning: 0.75,
    info: 0.75,
    success: 0.75,
    danger: 0.75,
    purple: 0.6,
  };
  const darkMetricColors = {
    brand: "#facc15",
    warning: "#fb923c",
    info: "#60a5fa",
    success: "#10b981",
    danger: "#fb7185",
    purple: "#a5b4fc",
  };

  const rgb = (hex) => [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const luminance = (hex) =>
    rgb(hex)
      .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const contrast = (foreground, background) => {
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);
    return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
      / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
  };
  const saturation = (hex) => {
    const channels = rgb(hex);
    const maximum = Math.max(...channels);
    const minimum = Math.min(...channels);
    const lightness = (maximum + minimum) / 2;
    if (maximum === minimum) return 0;
    return (maximum - minimum) / (1 - Math.abs(2 * lightness - 1));
  };

  for (const [tone, color] of Object.entries(metricColors)) {
    assert.match(
      globalsSource,
      new RegExp(`--color-metric-${tone}: var\\(--metric-${tone}\\);`),
      `missing runtime metric token ${tone}`,
    );
    assert.ok(
      lightThemeSource.includes(`--metric-${tone}: ${color};`),
      `missing light metric value ${tone}`,
    );
    assert.match(designTokenSource, new RegExp(`\\n  metric-${tone}: "${color.toUpperCase()}"`));
    assert.ok(
      saturation(color) >= lightMetricMinimumSaturation[tone],
      `${tone} metric color must stay vivid`,
    );
    assert.ok(contrast(color, "#ffffff") >= 3, `${tone} metric color must pass large-text contrast`);
    if (tone !== "purple") {
      assert.match(todayDashboardSource, new RegExp(`${tone}: \\{ card: "[^"]+", value: "text-metric-${tone}" \\}`));
    }
  }

  for (const [tone, color] of Object.entries(darkMetricColors)) {
    assert.ok(
      darkThemeSource.includes(`--metric-${tone}: ${color};`),
      `missing dark metric value ${tone}`,
    );
    assert.match(designTokenSource, new RegExp(`\\n  dark-metric-${tone}: "${color.toUpperCase()}"`));
    assert.ok(saturation(color) >= 0.7, `${tone} dark metric color must stay vivid`);
    assert.ok(contrast(color, "#161616") >= 3, `${tone} dark metric color must pass large-text contrast`);
  }

  assert.doesNotMatch(
    todayDashboardSource.match(/const STAT_TONE_CLASSES[\s\S]*?\n\};/)?.[0] ?? "",
    /value: "text-(?:brand|icon-)/,
  );
  assert.equal((todayDashboardSource.match(/text-metric-brand tabular-nums/g) ?? []).length, 2);
  assert.match(designSystemSource, /大号指标强调色/);
  assert.match(designSystemSource, /仅用于 24px 及以上的大号数字/);
});

test("multi-hue accent tokens preserve yellow as the brand and keep status aliases semantic", () => {
  const globalsSource = readSource("./src/app/globals.css");
  const designTokenSource = readSource("../DESIGN.md");
  const designSystemSource = readSource("../DESIGN_SYSTEM.md");
  const lightThemeSource = globalsSource.match(/:root \{([\s\S]*?)\n\}/)?.[1] ?? "";
  const accentColors = {
    yellow: "#facc15",
    orange: "#f59e0b",
    red: "#ef4444",
    green: "#22c55e",
    blue: "#3b82f6",
    purple: "#4d44d6",
  };

  assert.match(globalsSource, /--color-brand:\s*#facc15;/);
  assert.match(designTokenSource, /\n  primary: "#FACC15"/);

  for (const [hue, color] of Object.entries(accentColors)) {
    assert.match(
      globalsSource,
      new RegExp(`--color-accent-${hue}: var\\(--accent-${hue}\\);`),
      `missing Tailwind accent token ${hue}`,
    );
    assert.ok(
      lightThemeSource.includes(`--accent-${hue}: ${color};`),
      `missing accent hue ${hue}`,
    );
    assert.match(designTokenSource, new RegExp(`\\n  accent-${hue}: "${color.toUpperCase()}"`));
  }

  for (const [state, hue] of [
    ["success", "green"],
    ["warning", "orange"],
    ["danger", "red"],
    ["info", "blue"],
  ]) {
    assert.ok(
      lightThemeSource.includes(`--state-${state}-solid: var(--accent-${hue});`),
      `${state} solid must alias the ${hue} accent hue`,
    );
  }

  assert.match(workerCardSource, /good: \{ bar: "bg-success-solid\/75"/);
  assert.match(workerCardSource, /warn: \{ bar: "bg-warning-solid\/75"/);
  assert.match(workerCardSource, /bad: \{ bar: "bg-danger-solid\/75"/);
  assert.doesNotMatch(workerCardSource, /bg-accent-(?:green|orange|red)/);
  assert.match(designSystemSource, /紫色是可选强调色，不是品牌主色/);
  assert.match(designSystemShowcaseSource, /title: "多色相强调色"/);
  assert.match(
    designSystemShowcaseSource,
    /name\.startsWith\("accent-"\) \|\| name\.startsWith\("metric-"\)/,
  );
});

test("only whole-card interactions receive a card hover state", () => {
  assert.match(cardSource, /interactive\?: boolean/);
  assert.match(cardSource, /compact\?: boolean/);
  assert.match(cardSource, /interactive && "transition-colors duration-150 hover:bg-surface-hover"/);
  assert.match(cardSource, /compact \? "p-4" : "p-5"/);

  for (const source of [followUpCardSource, decisionCardSource, discoveryCardSource]) {
    assert.match(source, /import \{ Card \} from "@\/components\/ui\/card"/);
    assert.match(source, /<Card compact/);
    assert.doesNotMatch(source, /<Card[^>]*\binteractive\b/);
    assert.doesNotMatch(source, /rounded-xl border border-border bg-surface/);
  }

  assert.doesNotMatch(discoveryCardSource, /\bgroup-hover:/);
  assert.doesNotMatch(discoveryCardSource, /hover:-translate-y|hover:shadow/);
  assert.match(statCardSource, /<Link/);
  assert.doesNotMatch(statCardSource, /group-hover:from-brand/);
  assert.match(statCardSource, /hover:bg-surface-hover/);

  for (const source of [
    followUpCardSource,
    decisionCardSource,
    discoveryCardSource,
    aiSearchBoxSource,
    filterBuilderSource,
    statCardSource,
  ]) {
    assert.doesNotMatch(source, /hover:border-brand/);
  }
});

test("shared status UI consumes career-one semantic tokens instead of palette colors", () => {
  for (const source of [badgeSource, workerCardSource, workerPillsSource, decisionCardSource]) {
    assert.doesNotMatch(
      source,
      /(?:bg|text|border)-(?:emerald|amber|red|zinc|slate|gray)-/,
      "shared status UI must not use raw Tailwind palette colors",
    );
  }
  assert.match(badgeSource, /bg-success-surface text-success/);
  assert.match(badgeSource, /bg-warning-surface text-warning/);
  assert.match(badgeSource, /bg-danger-surface text-danger/);
});

test("buttons expose one shared three-level action hierarchy", () => {
  const globalsSource = readSource("./src/app/globals.css");
  const designSystemSource = readSource("../DESIGN_SYSTEM.md");
  const designTokenSource = readSource("../DESIGN.md");
  for (const token of ["action-secondary", "action-secondary-hover", "action-secondary-active", "action-secondary-foreground"]) {
    assert.match(globalsSource, new RegExp(`--color-${token}:\\s*var\\(--${token}\\)`), `missing runtime button token ${token}`);
    assert.match(designTokenSource, new RegExp(`\\n  ${token}:`), `missing machine-readable button token ${token}`);
  }
  for (const declaration of [
    "--outline-bg: rgb(17 24 39 / 0.025);",
    "--outline-bg-hover: rgb(17 24 39 / 0.05);",
    "--outline-border-hover: rgb(17 24 39 / 0.22);",
    "--outline-bg: rgb(255 255 255 / 0.05);",
    "--outline-bg-hover: rgb(255 255 255 / 0.1);",
    "--outline-border-hover: rgb(255 255 255 / 0.26);",
  ]) {
    assert.ok(globalsSource.includes(declaration), `missing restrained tertiary token ${declaration}`);
  }
  for (const declaration of [
    '  outline-bg: "rgb(17 24 39 / 0.025)"',
    '  outline-bg-hover: "rgb(17 24 39 / 0.05)"',
    '  outline-border-hover: "rgb(17 24 39 / 0.22)"',
    '  dark-outline-bg: "rgb(255 255 255 / 0.05)"',
    '  dark-outline-bg-hover: "rgb(255 255 255 / 0.1)"',
    '  dark-outline-border-hover: "rgb(255 255 255 / 0.26)"',
  ]) {
    assert.ok(designTokenSource.includes(declaration), `missing machine-readable tertiary token ${declaration}`);
  }
  assert.match(designSystemSource, /`primary`：第一优先级/);
  assert.match(designSystemSource, /`secondary`：第二优先级/);
  assert.match(designSystemSource, /`tertiary`：第三优先级/);

  assert.match(buttonSource, /primary:\s*"[^"]*\bbg-brand\b[^"]*"/);
  assert.match(buttonSource, /secondary:\s*"[^"]*\bbg-action-secondary\b[^"]*"/);
  assert.match(buttonSource, /secondary:\s*"[^"]*\bhover:bg-action-secondary-hover\b[^"]*"/);
  assert.match(buttonSource, /secondary:\s*"[^"]*\bactive:bg-action-secondary-active\b[^"]*"/);
  assert.doesNotMatch(buttonSource.match(/secondary:\s*"[^"]*"/)?.[0] ?? "", /\bborder\b/);
  assert.match(buttonSource, /tertiary:\s*"[^"]*\bborder-outline-border\b[^"]*"/);
  assert.match(buttonSource, /tertiary:\s*"[^"]*\bbg-surface\b[^"]*"/);
  assert.match(buttonSource, /tertiary:\s*"[^"]*\bhover:bg-outline-bg\b[^"]*"/);
  assert.match(buttonSource, /tertiary:\s*"[^"]*\bactive:bg-outline-bg-hover\b[^"]*"/);
  assert.match(buttonSource, /duration-150/);
  assert.match(buttonSource, /focus-visible:ring-offset-2/);
  assert.match(buttonSource, /focus-visible:ring-offset-background/);
  assert.doesNotMatch(buttonSource, /\n\s+outline:/);

  assert.match(followUpCardSource, /import \{ buttonVariants \} from "@\/components\/ui\/button"/);
  assert.match(followUpCardSource, /buttonVariants\(\{ variant: "secondary", size: "sm" \}\)/);
  assert.match(decisionCardSource, /import \{ Button, buttonVariants \} from "@\/components\/ui\/button"/);
  assert.match(decisionCardSource, /<Button\s+type="button"\s+variant="secondary"\s+size="sm"/);
  assert.match(decisionCardSource, /<Button\s+type="button"\s+variant="tertiary"\s+size="sm"/);
  assert.doesNotMatch(decisionCardSource, /variant="primary"/);
  assert.match(decisionCardSource, /buttonVariants\(\{ variant: "ghost", size: "icon" \}\)/);
  assert.doesNotMatch(decisionCardSource, /bg-brand-soft|hover:bg-brand\/15|className="inline-flex items-center/);
  assert.match(todayDashboardSource, /buttonVariants\(\{ variant: "primary" \}\)/);
  assert.match(todayDashboardSource, /buttonVariants\(\{ variant: "secondary" \}\)/);
  assert.doesNotMatch(explorerViewSource, /如需改变求职方向，也可以让你的 Agent 修改并更新这些条件/);
  assert.match(explorerViewSource, /<ScreenshotEvaluate \/>/);
  assert.doesNotMatch(explorerViewSource, /<QuickEvaluate/);
  assert.match(jobDetailSource, /<Button variant="tertiary"/);
  assert.match(designSystemShowcaseSource, /<Button variant="secondary">查看报告/);
  assert.match(designSystemShowcaseSource, /<Button variant="tertiary">稍后处理/);

  for (const source of [todayDashboardSource, followUpCardSource, jobDetailSource, designSystemShowcaseSource]) {
    assert.doesNotMatch(source, /variant(?::|=)\s*["{]outline/);
  }
});

test("Today first render receives all queue data from one server snapshot", () => {
  assert.match(homePageSource, /readFollowupSnapshot/);
  assert.match(homePageSource, /readFreshOffers/);
  assert.match(homePageSource, /await Promise\.all/);
  assert.match(todayDashboardSource, /initialFollowups:\s*FollowUp\[\]/);
  assert.match(todayDashboardSource, /initialFollowupCount:\s*number/);
  assert.match(todayDashboardSource, /initialFresh:\s*DiscoveredOffer\[\]/);
  assert.doesNotMatch(todayDashboardSource, /loopsReady/);
  assert.doesNotMatch(todayDashboardSource, /fetch\("\/api\/(?:followups|whats-new)/);
  assert.doesNotMatch(todayDashboardSource, /个岗位等待你决定/);
});

test("Today glass effect is present in server HTML from the first paint", () => {
  const globalsSource = readSource("./src/app/globals.css");

  assert.match(heroGlowSource, /hero-glow-ambient/);
  assert.match(heroGlowSource, /hero-glow-glass/);
  assert.doesNotMatch(heroGlowSource, /"use client"|next\/dynamic|requestIdleCallback|setTimeout|animate-fade-in-delayed/);
  assert.match(globalsSource, /\.hero-glow-ambient\s*\{[\s\S]*radial-gradient/);
  assert.match(globalsSource, /\.hero-glow-glass\s*\{[\s\S]*backdrop-filter:\s*blur/);
  assert.doesNotMatch(todayDashboardSource, /backdrop-blur-\[2px\]/);
});

test("dashboard puts analytics first and arranges compact charts in a responsive two-column grid", () => {
  const statsPosition = todayDashboardSource.indexOf("data-dashboard-stats");
  const heroPosition = todayDashboardSource.indexOf('<section className="dot-bg');

  assert.ok(statsPosition >= 0, "missing dashboard headline stats");
  assert.ok(heroPosition > statsPosition, "headline stats must render above the action hero");
  assert.match(
    todayDashboardSource,
    /<div data-dashboard-stats className="grid grid-cols-2 gap-3 md:grid-cols-4">/,
  );
  assert.match(
    todayDashboardSource,
    /<div data-dashboard-charts className="grid gap-4 lg:grid-cols-2">/,
  );
  assert.match(todayDashboardSource, /<AnalyticsSection title="求职漏斗阶段">/);
  assert.match(todayDashboardSource, /<AnalyticsSection title="评分分布">/);
  assert.match(todayDashboardSource, /<AnalyticsSection title="重点公司" id="companies">/);
  assert.match(todayDashboardSource, /<Card compact/);
  assert.match(todayDashboardSource, /const BAR_TONE_CLASSES/);
  assert.match(todayDashboardSource, /brand:\s*"bg-brand-200\/80"/);
  assert.match(todayDashboardSource, /info:\s*"bg-icon-info\/80"/);
  assert.match(todayDashboardSource, /success:\s*"bg-icon-success\/80"/);
  assert.match(todayDashboardSource, /warning:\s*"bg-icon-warning\/80"/);
  assert.match(todayDashboardSource, /danger:\s*"bg-icon-danger\/80"/);
  assert.match(todayDashboardSource, /\{ key: "OFFER", label: "已获 Offer", tone: "success" \}/);
  assert.match(todayDashboardSource, /\{ label: "4\.5 – 5\.0", tone: "success"/);
  assert.match(todayDashboardSource, /analytics\.topCompanies\.map[\s\S]*tone="brand"/);
  assert.match(todayDashboardSource, /<Stat value=\{analytics\.total\} label="已评估" tone="brand"/);
  assert.match(todayDashboardSource, /className="relative h-2 flex-1 overflow-hidden/);
  assert.doesNotMatch(todayDashboardSource, /from-foreground\/25|to-foreground\/10|tone="neutral"/);
});

test("user-facing pages share the pipeline and CV page width contract", () => {
  const globalsSource = readSource("./src/app/globals.css");
  assert.match(globalsSource, /--layout-page-max:\s*72rem/);
  assert.match(globalsSource, /\.page-shell\s*\{/);

  for (const sourcePath of PAGE_SHELL_SOURCES) {
    assert.match(readSource(sourcePath), /className="[^"]*\bpage-shell\b/, `${sourcePath} must use page-shell`);
  }
});
