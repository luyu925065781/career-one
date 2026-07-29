import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { KNOWN } from "./src/lib/clis.ts";
import { isEvaluationIntent, reportSectionPreview } from "./src/lib/format.ts";

function readSource(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const jobsPageSource = readSource("./src/app/jobs/page.tsx");
const jobDetailSource = readSource("./src/app/jobs/[id]/page.tsx");
const jobStoreSource = readSource("./src/components/jobs/job-store.tsx");
const agentRunsApiSource = readSource("./src/app/api/agent-runs/route.ts");
const agentRunsContractSource = readSource("../agent-runs.mjs");
const workerCardSource = readSource("./src/components/jobs/worker-card.tsx");
const workerPillsSource = readSource("./src/components/jobs/worker-pills.tsx");
const diagnosisViewSource = readSource("./src/components/cn-diagnose/cn-diagnose-view.tsx");
const pipelineViewSource = readSource("./src/components/pipeline-view.tsx");
const explorerViewSource = readSource("./src/components/explore/explorer-view.tsx");
const cvEditorSource = readSource("./src/components/cv-editor.tsx");
const interviewPageSource = readSource("./src/app/interview/page.tsx");
const portalsPageSource = readSource("./src/app/portals/page.tsx");
const primaryNavSource = readSource("./src/lib/nav-items.ts");
const releaseSource = readSource("./src/lib/release.ts");
const reportViewSource = readSource("./src/components/report-view.tsx");
const todayDashboardSource = readSource("./src/components/home/today-dashboard.tsx");
const followUpCardSource = readSource("./src/components/home/follow-up-card.tsx");
const decisionCardSource = readSource("./src/components/home/decision-card.tsx");
const discoveryCardSource = readSource("./src/components/explore/discovery-card.tsx");
const aiSearchBoxSource = readSource("./src/components/explore/ai-search-box.tsx");
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

test("Agent task history renders title before status metadata and keeps report access", () => {
  const titlePosition = workerPillsSource.indexOf("data-task-title");
  const metaPosition = workerPillsSource.indexOf("data-task-meta");

  assert.ok(titlePosition >= 0, "missing task title row");
  assert.ok(metaPosition > titlePosition, "task status and time must render below the title");
  assert.match(workerPillsSource, /打开报告/);
  assert.match(workerPillsSource, /findReportHref/);
});

test("evaluation artifacts use the canonical 岗位评估报告 label", () => {
  assert.match(workerPillsSource, /function artifactDisplayLabel/);
  assert.match(workerPillsSource, /return "岗位评估报告"/);
  assert.equal(
    (workerPillsSource.match(/\{artifactDisplayLabel\(artifact\)\}/g) ?? []).length,
    2,
    "linked and unlinked artifacts must use the same canonical label",
  );
});

test("Agent task history keeps task cards while report history uses dedicated report cards", () => {
  assert.match(workerPillsSource, /import \{ Card \} from "@\/components\/ui\/card"/);
  assert.match(workerPillsSource, /<Card[\s\S]*data-agent-task-card/);
  assert.match(jobsPageSource, /<ul className="mt-6 space-y-4"/);
  assert.match(jobsPageSource, /<AgentTaskListCard\s+job=\{job\}/);
  assert.match(diagnosisViewSource, /<EvaluationReportCard\s+report=\{report\}/);
  assert.doesNotMatch(diagnosisViewSource, /AgentTaskListCard/);
  assert.doesNotMatch(jobsPageSource, /data-agent-task-card/);
  assert.doesNotMatch(jobsPageSource, /divide-y divide-border/);
});

test("evaluation report history only contains successful artifact-backed reports and links the whole card", () => {
  assert.match(workerPillsSource, /export function findReportArtifact/);
  assert.match(workerPillsSource, /if \(job\.status !== "done"\) return null/);
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
    /evaluationJobs\s*\.map\(evaluationReportFromJob\)\s*\.filter\(isEvaluationReportRecord\)/,
  );
  assert.match(diagnosisViewSource, /data-evaluation-report-card/);
  assert.match(diagnosisViewSource, /href=\{report\.href\}/);
  assert.match(diagnosisViewSource, /aria-label=\{`打开评估报告：\$\{report\.title\}`\}/);
});

test("current job evaluation reuses the full Agent task detail without a redundant task button", () => {
  assert.match(workerPillsSource, /export function AgentTaskDetailPanel/);
  assert.match(workerPillsSource, /data-agent-task-detail/);
  assert.match(workerPillsSource, /由 Agent 原生入口发起/);
  assert.match(workerPillsSource, /job\.steps\.map/);
  assert.match(workerPillsSource, />生成结果</);
  assert.match(jobDetailSource, /<AgentTaskDetailPanel\s+job=\{job\}\s+titleLevel="h1"/);
  assert.match(
    diagnosisViewSource,
    /<AgentTaskDetailPanel\s+job=\{job\}\s+artifactPlacement="summary"/,
  );
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
  assert.match(diagnosisViewSource, />当前岗位评估</);
  assert.match(diagnosisViewSource, />\s*历史评估报告\s*</);
  assert.doesNotMatch(diagnosisViewSource, /最近一次岗位评估|单独打开任务|role="progressbar"|evaluationProgress/);
});

test("Agent task detail removes a duplicate page shortcut when the artifact already links there", () => {
  assert.match(
    workerPillsSource,
    /const hasMatchingPageArtifact = job\.artifacts\?\.some\(\(artifact\) => artifact\.page === job\.page\) \?\? false/,
  );
  assert.match(workerPillsSource, /\{job\.page && !hasMatchingPageArtifact && \(/);
  assert.match(workerPillsSource, /artifact\.page \? \([\s\S]*href=\{artifact\.page\}/);
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
  assert.match(jobDetailSource, /如果原 Agent 仍在执行/);
  assert.match(jobDetailSource, /不会创建新任务/);
  assert.match(
    jobDetailSource,
    /<\/AgentTaskDetailPanel>\s*\{canContinue && \(\s*<AgentTaskContinuation/,
    "the task status must be shown before the continuation action",
  );
  assert.doesNotMatch(jobDetailSource, /queueAgentTask|action:\s*"queue"/);
});

test("evaluation reports exclude resume generation while Agent history keeps every task", () => {
  assert.equal(isEvaluationIntent("evaluate"), true);
  assert.equal(isEvaluationIntent("evaluate-job"), true);
  assert.equal(isEvaluationIntent("pdf"), false);
  assert.equal(isEvaluationIntent(undefined), false);
  assert.match(diagnosisViewSource, /return isEvaluationIntent\(job\.kind\)/);
  assert.match(diagnosisViewSource, /jobs\s*\.filter\(isEvaluationJob\)/);
  assert.doesNotMatch(diagnosisViewSource, /function isEvaluationJob[\s\S]{0,220}job\.title/);
  assert.match(jobsPageSource, /\{jobs\.map\(\(job\) =>/);
});

test("Agent task page header follows the pipeline page layout", () => {
  const sharedHeaderClass = /<div className="flex items-end justify-between gap-4">/;
  assert.match(pipelineViewSource, sharedHeaderClass);
  assert.match(jobsPageSource, sharedHeaderClass);
  assert.match(jobsPageSource, /<div className="page-shell py-8">/);

  const headerPosition = jobsPageSource.indexOf('<div className="flex items-end justify-between gap-4">');
  const taskListPosition = jobsPageSource.indexOf("{jobs.length === 0 ?");
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

test("primary navigation exposes job discovery and evaluation entry points", () => {
  const navItemsSource = readSource("./src/lib/nav-items.ts");

  assert.match(
    navItemsSource,
    /\{ href: "\/explore", label: "发现岗位", icon: Compass, feature: "discoverJobs" \}/,
  );
  assert.match(
    navItemsSource,
    /\{ href: "\/cn-diagnose", label: "岗位评估", icon: ScanSearch, feature: "jobDiagnosis" \}/,
  );
});

test("job sources moves from primary navigation into the discovery page", () => {
  const primaryItemsBlock = primaryNavSource.match(
    /export const PRIMARY_NAV_ITEMS = \{([\s\S]*?)\} satisfies Record<string, NavItem>;/,
  )?.[1] ?? "";
  const discoveryHeadingBlock = explorerViewSource.match(
    /<div className="flex min-w-0 flex-wrap items-center gap-2\.5">([\s\S]*?)<\/div>/,
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
  assert.match(explorerViewSource, /const JobSourcesItem = CONTEXTUAL_NAV_ITEMS\.jobSources;/);
  assert.match(explorerViewSource, /isFeatureEnabled\(JobSourcesItem\.feature\)/);
  assert.match(explorerViewSource, /href=\{JobSourcesItem\.href\}/);
  assert.match(explorerViewSource, /\{JobSourcesItem\.label\}/);
  assert.match(discoveryHeadingBlock, /<h1[^>]*>发现岗位<\/h1>/);
  assert.match(discoveryHeadingBlock, /isFeatureEnabled\(JobSourcesItem\.feature\)[\s\S]*href=\{JobSourcesItem\.href\}/);
  assert.match(
    explorerViewSource,
    /buttonVariants\(\{ variant: "tertiary", size: "sm" \}\)/,
  );
});

test("primary destination headings reuse the exact sidebar icon mapping", () => {
  assert.match(primaryNavSource, /export const PRIMARY_NAV_ITEMS = \{/);

  for (const [key, icon] of [
    ["home", "LayoutDashboard"],
    ["discoverJobs", "Compass"],
    ["jobDiagnosis", "ScanSearch"],
    ["pipeline", "ListChecks"],
    ["interviewStories", "BookOpenCheck"],
    ["cv", "FileText"],
  ]) {
    assert.match(
      primaryNavSource,
      new RegExp(`${key}: \\{ href: "[^"]+", label: "[^"]+", icon: ${icon}, feature: "${key}" \\}`),
      `missing primary navigation icon mapping for ${key}`,
    );
  }

  for (const [source, key] of [
    [todayDashboardSource, "home"],
    [explorerViewSource, "discoverJobs"],
    [diagnosisViewSource, "jobDiagnosis"],
    [pipelineViewSource, "pipeline"],
    [interviewPageSource, "interviewStories"],
    [cvEditorSource, "cv"],
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
  assert.match(
    designSystemSource,
    /从主导航下沉到业务页的入口必须复用 `CONTEXTUAL_NAV_ITEMS`/,
  );
});

test("page title icons are vertically centered with their heading text", () => {
  for (const source of [
    explorerViewSource,
    diagnosisViewSource,
    pipelineViewSource,
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

test("sidebar Agent task tray shows the latest ten tasks across statuses and owns its scrolling", () => {
  const desktopShellSource = readSource("./src/components/app-shell.tsx");
  const mobileNavSource = readSource("./src/components/mobile-nav.tsx");

  assert.match(workerPillsSource, /const recentJobs = jobs\.slice\(0, 10\)/);
  assert.match(workerPillsSource, /const running = jobs\.filter\(\(job\) => job\.status === "running"\)\.length/);
  assert.match(workerPillsSource, /const waiting = jobs\.filter\(\(job\) => job\.status === "waiting"\)\.length/);
  assert.match(workerPillsSource, /recentJobs\.map\(\(j\) =>/);
  assert.doesNotMatch(workerPillsSource, /const activeJobs =/);
  assert.match(workerPillsSource, /data-agent-task-tray[\s\S]{0,180}min-h-0[\s\S]{0,120}flex-1/);
  assert.match(workerPillsSource, /<ul className="[^"]*min-h-0[^"]*overflow-y-auto[^"]*pb-3[^"]*"/);
  assert.match(desktopShellSource, /<aside className="[^"]*overflow-hidden[^"]*"/);
  assert.doesNotMatch(desktopShellSource, /<aside className="[^"]*overflow-y-auto[^"]*"/);
  assert.match(mobileNavSource, /\.co-mdrawer\{[^}]*overflow:hidden/);
  assert.match(jobsPageSource, /\{jobs\.map\(\(job\) =>/);
});

test("Today hero routes discovery to job sources and uses a concise progress label", () => {
  assert.match(todayDashboardSource, /<Link href="\/portals"[^>]*>\s*发现新岗位/);
  assert.match(todayDashboardSource, /<Link href="\/pipeline"[^>]*>\s*求职进度\s*<\/Link>/);
  assert.doesNotMatch(todayDashboardSource, />\s*打开求职进度\s*</);
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
  for (const token of ["control", "card", "panel"]) {
    assert.match(globalsSource, new RegExp(`--radius-${token}:`), `missing semantic radius token ${token}`);
  }
  for (const token of ["raised", "floating", "overlay"]) {
    assert.match(globalsSource, new RegExp(`--shadow-${token}:`), `missing semantic elevation token ${token}`);
  }
  assert.match(buttonSource, /rounded-control/);
  assert.match(cardSource, /rounded-card/);
  assert.match(cardSource, /shadow-raised/);
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
