#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const json = (rel) => JSON.parse(read(rel));

const rootPackage = json("package.json");
assert.equal(rootPackage.name, "career-one", "根 package 名必须是 career-one");
assert.equal(rootPackage.version, "1.0.0", "独立项目必须从 1.0.0 建立版本基线");
assert.equal(rootPackage.author.name, "NumberX", "根 package 必须声明当前维护者");
assert.equal(rootPackage.contributors, undefined, "上游作者信息只保留在 LICENSE，不写入 package contributors");
assert.equal(
  rootPackage.repository.url,
  "https://github.com/luyu925065781/career-one",
  "根 package 必须指向择程AI自己的 GitHub 仓库",
);
assert.equal(rootPackage.dependencies["js-yaml"], "^5.2.1", "根运行时必须使用当前 js-yaml 主版本");

const webPackage = json("web/package.json");
assert.equal(webPackage.name, "@career-one/web", "Web package 名必须使用 career-one");
assert.equal(webPackage.dependencies["js-yaml"], "^5.2.1", "Web 与根运行时必须使用同一 js-yaml 主版本");

const yamlConsumers = [
  "tracker-utils.mjs",
  "scan.mjs",
  "scan-ats-full.mjs",
  "tracker.mjs",
  "followup-cadence.mjs",
  "plugins.mjs",
  "doctor.mjs",
  "browser-extract.mjs",
  "openrouter-runner.mjs",
  "stats.mjs",
  "salary-gap.mjs",
  "verify-portals.mjs",
  "plugins/notion/_notion.mjs",
  "validate-portals.mjs",
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
for (const file of fs.readdirSync(root, { recursive: true })) {
  const rel = String(file).replaceAll("\\", "/");
  if (
    path.basename(rel) === "LICENSE" ||
    rel.startsWith(".git/") ||
    rel.startsWith("node_modules/") ||
    rel.startsWith("web/node_modules/") ||
    rel.startsWith("dist/") ||
    rel.startsWith(".next/") ||
    rel.startsWith("web/.next/")
  ) continue;
  const absolute = path.join(root, rel);
  let stat;
  try { stat = fs.lstatSync(absolute); } catch { continue; }
  if (!stat.isFile() && !stat.isSymbolicLink()) continue;
  let content;
  try { content = fs.readFileSync(absolute, "utf8"); } catch { continue; }
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
assert.match(canonicalSkill, /可选的面试开场话术/, "岗位评估 Skill 必须统一使用面试开场话术");
assert.doesNotMatch(canonicalSkill, /BOSS直聘开场话术/, "岗位评估 Skill 不得继续使用平台限定的旧标题");
assert.match(canonicalSkill, /career-one\.mjs web/, "Skill 必须提供打开 Web 工作台的稳定命令");
assert.match(canonicalSkill, /http:\/\/localhost:3000\/jobs/, "Skill 必须向用户展示工作台入口");
assert.match(canonicalSkill, /\/jobs\/<任务ID>/, "Skill 必须向用户展示当前任务入口");
assert.match(canonicalSkill, /\/pipeline\/\{报告编号\}/, "岗位诊断完成后必须展示诊断报告深链");
assert.match(canonicalSkill, /http:\/\/localhost:3000\/cv/, "简历任务完成后必须展示简历页面深链");
assert.match(read("modes/zh/oferta.md"), /^## 面试开场话术$/m, "中文岗位评估模板必须固定面试开场话术标题");

const portableCli = read(".agents/skills/career-one/scripts/career-one.mjs");
assert.match(portableCli, /web:\s*\{\s*script:\s*"start-web\.mjs"/, "便携 CLI 必须提供 web 命令");
assert.match(portableCli, /alwaysDefaults:\s*true/, "便携 CLI 的 web 命令必须默认打开浏览器");

const webStarter = read("start-web.mjs");
assert.match(webStarter, /--open/, "Web 启动器必须支持显式打开浏览器");
assert.match(webStarter, /--page/, "Web 启动器必须支持打开任务上下文页面");
assert.doesNotMatch(webStarter, /process\.kill|SIGKILL|releasePort/, "Web 启动器不得杀死占用端口的其他进程");

const jobDetailPage = read("web/src/app/jobs/[id]/page.tsx");
assert.match(jobDetailPage, /job\.page/, "任务详情页必须显示任务上下文入口");
assert.match(jobDetailPage, /查看诊断报告/, "岗位诊断任务必须显示查看诊断报告入口");
assert.match(jobDetailPage, /打开简历页面/, "简历任务必须显示打开简历页面入口");

const updaterSource = read("update-system.mjs");
for (const requiredPath of ["start-web.mjs", "web/src/", "web/package.json", "web/package-lock.json"]) {
  assert.match(updaterSource, new RegExp(`['\"]${requiredPath.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}['\"]`), `更新器必须覆盖 ${requiredPath}`);
}
assert.match(read("DATA_CONTRACT.md"), /web\/src\//, "数据契约必须把 Web 源码声明为系统层");

const diagnosisView = read("web/src/components/cn-diagnose/cn-diagnose-view.tsx");
const diagnosisReport = read("web/src/lib/cn-diagnose.ts");
for (const source of [diagnosisView, diagnosisReport]) {
  assert.match(source, /面试开场话术/, "岗位诊断 Web 与 HTML 报告必须统一使用面试开场话术");
  assert.doesNotMatch(source, /BOSS 首轮沟通话术|BOSS 打招呼话术/, "岗位诊断不得继续显示 BOSS 专属旧标题");
}

const webLayout = read("web/src/app/layout.tsx");
assert.match(webLayout, /title: "择程AI｜AI求职工作台"/, "Web 标题必须展示择程AI品牌");

const globalStyles = read("web/src/app/globals.css");
assert.match(globalStyles, /--gradient-primary:\s*linear-gradient\(135deg, #facc15 0%, #fde047 100%\)/, "Web 主色必须使用已实现规范页面中的浅黄色渐变");
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
  "web/src/components/explore/ai-hunt-trace.tsx",
  "web/src/components/explore/ai-search-box.tsx",
  "web/src/components/explore/ai-hunt-view.tsx",
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
assert.match(designSystem, /gray-900.*#111827/, "项目设计系统必须定义主文字色");
assert.match(designSystem, /输入框、搜索框、文本域和下拉框聚焦时禁止阴影、光晕和发光轮廓/, "设计系统必须禁止表单焦点光晕");
assert.match(designSystem, /icon-brand/, "设计系统必须定义图标语义 Token");
assert.match(designSystem, /空心按钮使用半透明中性色背景/, "设计系统必须定义半透明黑白空心按钮");

const machineReadableDesign = read("DESIGN.md");
assert.match(machineReadableDesign, /^---\n/m, "DESIGN.md 必须保留机器可读的 YAML frontmatter");
for (const tokenGroup of ["colors:", "typography:", "spacing:", "rounded:", "components:"]) {
  assert.match(machineReadableDesign, new RegExp(`^${tokenGroup}`, "m"), `DESIGN.md 必须定义 ${tokenGroup} Token`);
}
assert.match(machineReadableDesign, /SF Pro/, "公司级英文规范必须采用 SF Pro 风格");
assert.match(machineReadableDesign, /思源黑体/, "公司级中文规范必须采用思源黑体");
assert.match(machineReadableDesign, /具体产品.*系统自带字体/, "公司规范必须明确具体产品使用系统自带字体");
assert.doesNotMatch(machineReadableDesign, /Instrument Serif/, "公司级字体规范不得继续使用 Instrument Serif");

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
assert.match(buttonSource, /outline:\s*"[^"]*border-outline-border[^"]*bg-outline-bg[^"]*text-outline-text[^"]*hover:border-outline-border-hover[^"]*hover:bg-outline-bg-hover/, "通用空心按钮必须使用中性半透明 Token");
assert.doesNotMatch(buttonSource, /outline:\s*"[^"]*hover:(?:border|bg|text)-brand/, "通用空心按钮 hover 不得使用品牌色");
assert.match(read("AGENTS.md"), /DESIGN_SYSTEM\.md/, "AGENTS 必须声明前端设计 source of truth");
assert.match(read("CLAUDE.md"), /DESIGN_SYSTEM\.md/, "CLAUDE 必须声明前端设计 source of truth");

const webIcon = read("web/src/app/icon.svg");
assert.match(webIcon, /<linearGradient[^>]*id="brand-gradient"/, "择程AI图标必须使用品牌渐变");
assert.match(webIcon, /fill="url\(#brand-gradient\)"/, "择程AI图标背景必须引用品牌渐变");

const portalsView = read("web/src/components/portals-view.tsx");
assert.match(
  portalsView,
  /absolute left-0\.5 top-0\.5 size-5/,
  "岗位来源开关圆点必须有明确的水平锚点，避免开启状态移出轨道",
);

const navItems = read("web/src/lib/nav-items.ts");
assert.doesNotMatch(navItems, /href:\s*"\/cn-diagnose"[^\n]*chip:\s*"中国"/, "中国大陆是默认市场，岗位诊断导航不应重复显示中国标签");

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

for (const configConsumer of [
  "web/src/components/assistant-console.tsx",
  "web/src/components/cn-diagnose/cn-diagnose-view.tsx",
  "web/src/components/onboarding-banner.tsx",
  "web/src/components/usage-meter.tsx",
]) {
  const source = read(configConsumer);
  assert.match(source, /addEventListener\(CONFIG_CHANGED_EVENT,/, `${configConsumer} 必须响应同页面 Agent 配置变更`);
  assert.match(source, /removeEventListener\(CONFIG_CHANGED_EVENT,/, `${configConsumer} 卸载时必须清理 Agent 配置监听`);
}

const diagnoseView = read("web/src/components/cn-diagnose/cn-diagnose-view.tsx");
assert.match(diagnoseView, />岗位诊断</, "岗位诊断页面必须使用简洁标题");
assert.doesNotMatch(diagnoseView, /China Job Diagnosis|中国岗位诊断工作流|中国大陆版岗位诊断/, "岗位诊断页面不应重复强调默认市场");
assert.doesNotMatch(diagnoseView, /BOSS \/ 招聘页 URL|zhipin\.com|const \[url, setUrl\]/, "岗位诊断不得提供不可靠的 BOSS URL 抓取入口");
assert.match(diagnoseView, /const \[jdText, setJdText\] = useState\(""\)/, "JD 输入必须默认为空，不得混入演示岗位");
assert.match(diagnoseView, /type InputMode = "jd" \| "screenshots"/, "JD 和岗位截图必须建模为并行输入模式");
assert.match(diagnoseView, /const MAX_SCREENSHOTS = 3/, "岗位截图上传上限必须为 3 张");
assert.match(diagnoseView, /useState<InputMode>\("screenshots"\)/, "岗位诊断必须默认显示岗位截图 Tab");
const inputTablistStart = diagnoseView.indexOf('<div role="tablist"');
const inputTablistEnd = diagnoseView.indexOf('</div>', inputTablistStart);
const inputTablist = inputTablistStart >= 0 && inputTablistEnd > inputTablistStart
  ? diagnoseView.slice(inputTablistStart, inputTablistEnd)
  : "";
assert.match(inputTablist, /岗位描述 JD/, "JD Tab 必须位于岗位输入 tablist 中");
assert.match(inputTablist, /岗位截图/, "岗位截图 Tab 必须位于岗位输入 tablist 中");
assert.equal((inputTablist.match(/role="tab"/g) || []).length, 2, "岗位输入 tablist 必须包含两个可访问 Tab");
assert.match(diagnoseView, /role="tab"[\s\S]{0,500}aria-selected=/, "岗位输入 Tab 必须暴露可访问的选中状态");
assert.match(diagnoseView, /type="file"[\s\S]{0,220}multiple/, "岗位截图必须允许一次选择多张图片");
assert.match(diagnoseView, /useState<ScreenshotInput\[]>\(\[\]\)/, "前端必须以数组保存最多 3 张岗位截图");
assert.match(diagnoseView, /window\.addEventListener\("paste", handlePaste\)/, "截图 Tab 必须监听系统粘贴事件");
assert.match(diagnoseView, /window\.removeEventListener\("paste", handlePaste\)/, "截图 Tab 卸载时必须清理粘贴事件监听");
assert.match(diagnoseView, /event\.clipboardData\?\.items/, "截图粘贴必须从 ClipboardEvent 的 DataTransferItemList 安全读取文件");
assert.match(diagnoseView, /item\.kind === "file" && item\.type\.startsWith\("image\/"\)/, "截图粘贴只能接收剪贴板图片");
assert.match(diagnoseView, /⌘V \/ Ctrl\+V/, "截图上传区必须提示可使用快捷键粘贴");
assert.match(diagnoseView, /<Button[\s\S]{0,240}AI 岗位诊断[\s\S]{0,60}<\/Button>/, "岗位诊断必须只保留统一的 AI 入口");
assert.doesNotMatch(diagnoseView, /规则诊断|Codex 深度|type Engine|run\("quick"\)|run\("codex"\)/, "页面不得继续暴露两个同级诊断引擎");
assert.doesNotMatch(diagnoseView, /variant="secondary"[\s\S]{0,240}AI 岗位诊断/, "AI 岗位诊断必须使用默认主色按钮");
assert.doesNotMatch(diagnoseView, /engine\s*:/, "前端请求不得继续发送已废弃的诊断引擎参数");
assert.match(diagnoseView, /localStorage\.getItem\("career-one:config"\)/, "岗位诊断必须读取设置页当前选择的 Agent CLI");
assert.match(diagnoseView, /body:\s*JSON\.stringify\(\{[\s\S]{0,180}cliId/, "岗位诊断请求必须携带设置中的 cliId");
assert.doesNotMatch(diagnoseView, /由本机 Codex|仅支持 Codex|Codex CLI/, "通用 AI 岗位诊断不得在界面写死 Codex");
assert.match(diagnoseView, /disabled=\{!canRun \|\| loading\}/, "提供岗位输入后诊断按钮必须可点击，Agent 配置问题应在点击后明确提示");
assert.doesNotMatch(diagnoseView, /disabled=\{[^}]*!cliId/, "未保存 Agent 时不得直接把诊断按钮置灰而隐藏原因");
assert.match(diagnoseView, /const DIAGNOSIS_STAGES/, "岗位诊断必须定义稳定的阶段列表");
assert.match(diagnoseView, /function DiagnosisProgressPanel/, "岗位诊断运行时必须展示专用进度面板");
assert.match(diagnoseView, /role="status"/, "岗位诊断进度必须通过可访问状态区域播报");
assert.match(diagnoseView, /taskId=/, "岗位诊断页面必须通过任务 ID 查询服务端进度");
assert.match(diagnoseView, /method:\s*"DELETE"/, "岗位诊断必须通过显式停止接口终止 Agent 任务");
assert.doesNotMatch(diagnoseView, /runControllerRef|reader\.read\(\)|new TextDecoder\(\)/, "页面生命周期不得继续持有或取消 Agent 进程");
assert.match(diagnoseView, />停止诊断</, "岗位诊断运行时必须提供明确的停止操作");
assert.match(diagnoseView, /loading \? \([\s\S]{0,180}<DiagnosisProgressPanel/, "诊断运行时结果区必须切换到阶段进度面板");
assert.match(diagnoseView, /function DiagnosisHistory/, "岗位诊断页面必须展示持久化历史记录");
assert.match(diagnoseView, />诊断记录</, "岗位诊断历史区必须使用清晰的中文标题");
assert.match(diagnoseView, /离开此页面不会停止诊断/, "运行中必须明确告知用户任务不依赖当前页面");

const diagnoseReport = read("web/src/lib/cn-diagnose.ts");
assert.doesNotMatch(diagnoseReport, /China Mainland Job Diagnosis|China tracker/, "岗位诊断报告不应重复强调默认市场");
assert.doesNotMatch(diagnoseReport, /url\?: string|input\.url|zhipin\.com/, "岗位诊断报告不得因 BOSS URL 增加评分或置信度");
assert.doesNotMatch(
  diagnoseReport,
  /(?:我是|本人有)\d{1,2}年[^"'`\n]{0,80}(?:背景|经验)|你的优势[^"'`\n]{0,40}(?:全栈|交付)|把 \d{1,2} 年经验[^"'`\n]{0,40}(?:表达|转译)|独立[^"'`\n]{0,12}(?:上线|发布)[^"'`\n]{0,24}(?:网站|APP|小程序)/,
  "系统层不得硬编码任何候选人的履历、工具栈或能力结论",
);
assert.doesNotMatch(diagnoseReport, /diagnoseChinaJob|scoreFrom|NEGATIVE_KEYWORDS|candidateContext|QUICK SCORE/, "报告模块不得继续包含规则评分引擎");
assert.match(diagnoseReport, /AI 匹配评分/, "可视化报告必须明确展示 AI 匹配评分");

const diagnoseApi = read("web/src/app/api/cn-diagnose/route.ts");
assert.doesNotMatch(diagnoseApi, /fetchUrlText|body\.url|liveSearch/, "岗位诊断接口不得在后台抓取招聘页 URL");
assert.match(diagnoseApi, /inputMode\?: "jd" \| "screenshots"/, "诊断接口必须显式接收当前输入 Tab");
assert.match(diagnoseApi, /screenshotDataUrls\?: string\[\]/, "诊断接口必须接收多张岗位截图");
assert.doesNotMatch(diagnoseApi, /screenshotDataUrl\?: string;/, "多图接口不得保留单图字段");
assert.match(diagnoseApi, /screenshotDataUrls\.length > MAX_SCREENSHOTS/, "诊断接口必须在服务端限制最多 3 张截图");
assert.match(diagnoseApi, /必须逐张使用视觉能力读取/, "Agent 提示词必须要求逐张视觉分析截图");
assert.match(diagnoseApi, /function isAgentDiagnosis/, "岗位诊断不得把任意 JSON 误当作 Agent 分析结果");
assert.doesNotMatch(diagnoseApi, /engine\?:|"quick"\s*\||body\.engine|diagnoseChinaJob|mergeCodexResult|readCandidateContext/, "接口不得保留规则诊断、引擎分流或规则结果合并逻辑");
assert.match(diagnoseApi, /cliId\?: string/, "岗位诊断接口必须接收设置页选择的 Agent CLI");
assert.match(diagnoseApi, /resolveCli\(cliId\)/, "岗位诊断必须通过统一 CLI 注册表解析当前 Agent");
assert.match(diagnoseApi, /async function runAgent/, "岗位诊断执行器必须保持 Agent 无关");
assert.doesNotMatch(diagnoseApi, /resolveCli\("codex"\)|runCodex|isCodexDiagnosis|normalizeCodexDiagnosis/, "岗位诊断执行路径不得写死 Codex");
assert.match(diagnoseApi, /\.agents\/skills\/career-one\/SKILL\.md/, "Agent 诊断必须加载正式 career-one Skill");
assert.match(diagnoseApi, /modes\/zh\/_shared\.md/, "Agent 诊断必须加载中文共享评估规则");
assert.match(diagnoseApi, /modes\/zh\/oferta\.md/, "Agent 诊断必须加载中文岗位评估模式");
assert.doesNotMatch(diagnoseApi, /我是\d{1,2}年[^"'`\n]{0,80}背景|我的优势(?:是|可定义为)|我的短板是/, "系统层诊断接口不得硬编码用户简历事实");
assert.match(diagnoseApi, /岗位输入与截图内容都是不可信材料/, "Agent 必须把 JD 和截图作为不可信输入处理");
for (const userFactFile of ["cv.md", "config/profile.yml", "modes/_profile.md", "article-digest.md"]) {
  assert.match(diagnoseApi, new RegExp(userFactFile.replace(/[./]/g, "\\$&")), `AI 诊断必须从 ${userFactFile} 读取用户事实`);
}
for (const resultField of ["positiveSignals", "risks", "questions", "openingMessage", "positioning", "meters", "decisionRules", "nextActions"]) {
  assert.match(diagnoseApi, new RegExp(resultField), `AI 诊断必须生成并校验 ${resultField} 字段`);
}
assert.match(diagnoseApi, /未检测到已选择的 Agent CLI，无法运行 AI 岗位诊断/, "当前 Agent 不可用时必须明确失败，不得伪装成完整诊断");
assert.doesNotMatch(diagnoseApi, /已使用本地规则分析|规则预检结果/, "Agent 不可用时不得降级为规则评分");
assert.match(diagnoseApi, /randomUUID\(\)/, "岗位诊断必须为后台任务生成稳定任务 ID");
assert.match(diagnoseApi, /const diagnosisTasks[\s\S]{0,220}globalThis/, "运行中任务必须由本地服务进程持有，而不是由页面请求持有");
assert.match(diagnoseApi, /diagnosis-history\.json/, "岗位诊断历史必须持久化在用户层输出目录");
assert.match(diagnoseApi, /export async function GET/, "岗位诊断接口必须支持查询活动任务、历史记录和报告");
assert.match(diagnoseApi, /export async function DELETE/, "岗位诊断接口必须支持用户显式停止任务");
assert.match(diagnoseApi, /status:\s*202/, "创建岗位诊断后必须立即返回后台任务，而不是保持长连接");
assert.doesNotMatch(diagnoseApi, /req\.signal\.addEventListener|new ReadableStream<Uint8Array>|application\/x-ndjson/, "页面请求断开不得终止后台 Agent 任务");
assert.match(diagnoseApi, /type:\s*"progress"/, "岗位诊断接口必须发送进度事件");
for (const stage of ["preparing", "starting-agent", "analyzing", "validating", "writing-report"]) {
  assert.match(diagnoseApi, new RegExp(`stage:\\s*"${stage}"`), `岗位诊断必须发送 ${stage} 阶段`);
}
assert.match(diagnoseApi, /setInterval\(/, "Agent 分析期间必须发送存活事件，避免把长任务误判为卡死");
assert.match(diagnoseApi, /signal\.addEventListener\("abort"/, "岗位诊断接口必须响应浏览器取消信号");
assert.match(diagnoseApi, /child\.kill\("SIGTERM"\)/, "取消或超时时必须终止本地 Agent CLI");

const careerOneLib = read("web/src/lib/career-one.ts");
assert.doesNotMatch(careerOneLib, /ReportLocale|reports["'],\s*locale/, "每份报告必须是独立记录，不能把中文报告建模为同编号的语言变体");

const pipelineDetail = read("web/src/app/pipeline/[id]/page.tsx");
assert.doesNotMatch(pipelineDetail, /searchParams|zh-CN|lang=/, "求职详情不得提供同一记录的语言切换");

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
assert.doesNotMatch(reportView, /报告语言|>中文<|>原文</, "中文和英文报告是两条记录，不得渲染语言 Tab");
assert.match(reportView, /机器摘要/, "求职详情必须本地化机器摘要标题");
assert.match(reportView, /verdict\|结论\|最终建议/, "求职详情只能按明确标题识别结论章节");
assert.doesNotMatch(reportView, /find\(\(s\) => s\.letter === "F"\)/, "F 章节可能是面试计划，不能固定当作结论");

const scoreMethodology = read("web/src/components/score-methodology.tsx");
assert.doesNotMatch(scoreMethodology, /career-one\.org\/methodology/, "评分说明不得链接到失效的外部方法页");
assert.doesNotMatch(scoreMethodology, /查看上游完整方法说明/, "评分说明不得继续显示误导性的上游链接");

const explorerView = read("web/src/components/explore/explorer-view.tsx");
assert.match(explorerView, /function DiscoverBar[\s\S]{0,800}bg-brand[^"]*hover:bg-brand-200/, "发现岗位主按钮 hover 必须复用加深的品牌色");
assert.doesNotMatch(explorerView, /function DiscoverBar[\s\S]{0,800}hover:brightness-110/, "发现岗位主按钮 hover 不得通过提高亮度变浅");
assert.match(explorerView, /function SaveSettingsBar[\s\S]{0,1800}action:\s*"save-rules"/, "保存设置按钮必须调用 portals.yml 规则保存接口");
assert.match(explorerView, /"保存设置"/, "初始筛选页主按钮必须显示保存设置");
assert.match(explorerView, /如需改变求职方向，可以让你的Agent修改，自动更新信息/, "保存设置旁必须说明如何更新求职方向");
assert.match(explorerView, /算法已根据你的简历智能生成岗位标签，以提高搜索效率。您可以复制标签，去招聘平台搜索。/, "算法扫描说明必须解释标签来源和复制用途");
assert.doesNotMatch(explorerView, /由于权限限制，本算法无法扫描国内的绝大多数岗位/, "简化后的算法扫描说明不得重复强调权限限制");
assert.match(explorerView, /<p className="mt-3 w-full text-\[15px\]/, "发现岗位说明文字必须占满父级内容宽度");
assert.doesNotMatch(explorerView, /<p className="mt-3 max-w-2xl text-\[15px\]/, "发现岗位说明文字不得被局部最大宽度提前换行");

const filterBuilder = read("web/src/components/explore/filter-builder.tsx");
assert.match(filterBuilder, /useState\(true\)/, "地区与扫描范围必须默认展开");
assert.match(filterBuilder, /aria-label={`复制全部\$\{label\}`}/, "岗位关键词复制按钮必须复用同一交互组件");
assert.match(filterBuilder, /label="目标岗位"/, "目标岗位必须保留复制按钮");
assert.match(filterBuilder, /label="排除岗位"/, "排除岗位必须提供复制按钮");
for (const [name, host] of [
  ["BOSS直聘", "www.zhipin.com"],
  ["猎聘", "www.liepin.com"],
  ["脉脉", "maimai.cn"],
  ["智联招聘", "www.zhaopin.com"],
]) {
  assert.match(filterBuilder, new RegExp(`name: "${name}"[\\s\\S]{0,120}https://${host.replaceAll(".", "\\.")}`), `搜索渠道必须提供${name}官网入口`);
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

const chineseReportPath = "reports/002-wispr-flow-ex-founder-zh-2026-07-10.md";
assert.ok(fs.existsSync(path.join(root, chineseReportPath)), "中文版报告必须拥有独立编号和根目录报告文件");
const chineseReport = read(chineseReportPath);
assert.match(chineseReport, /^# 评估报告:/m, "中文版报告必须使用中文标题");
assert.match(chineseReport, /^\*\*Language:\*\* zh-CN$/m, "中文版报告必须声明独立记录的语言");
assert.match(chineseReport, /^## F\) 面试备考计划/m, "中文版报告必须包含中文面试备考内容");
const tracker = read("data/applications.md");
assert.match(tracker, /\| 1 \|[^\n]*\[001\]\(\.\.\/reports\/001-/, "英文报告必须保留独立的 #1 记录");
assert.match(tracker, /\| 2 \|[^\n]*\[002\]\(\.\.\/reports\/002-/, "中文报告必须拥有独立的 #2 记录");
assert.match(read("merge-tracker.mjs"), /extractReportLanguage/, "合并器不得把不同语言的同岗位报告折叠为一条记录");

const portalsPage = read("web/src/app/portals/page.tsx");
assert.match(portalsPage, />岗位来源</, "招聘来源页面必须使用不误导的‘岗位来源’名称");
assert.match(
  portalsPage,
  /管理招聘平台、目标公司和搜索规则。所有设置保存在本机，并由择程AI的扫描与 Agent 工作流共同使用。/,
  "岗位来源页面必须准确说明本地设置及扫描与 Agent 的共用关系",
);

for (const headerFile of [
  "web/src/components/explore/explorer-view.tsx",
  "web/src/app/portals/page.tsx",
  "web/src/app/apply/page.tsx",
  "web/src/components/cn-diagnose/cn-diagnose-view.tsx",
  "web/src/components/pipeline-view.tsx",
  "web/src/app/interview/page.tsx",
  "web/src/app/analytics/page.tsx",
  "web/src/components/cv-editor.tsx",
  "web/src/components/config-form.tsx",
  "web/src/app/jobs/page.tsx",
  "web/src/components/home/today-dashboard.tsx",
  "web/src/components/home/first-run-home.tsx",
]) {
  const source = read(headerFile);
  const heading = source.indexOf("<h1");
  assert.ok(heading >= 0, `${headerFile} 必须包含页面主标题`);
  const paragraph = source.indexOf("<p className=", heading);
  assert.ok(paragraph >= 0, `${headerFile} 的页面主标题后必须包含说明文案`);
  const paragraphTag = source.slice(paragraph, source.indexOf(">", paragraph) + 1);
  assert.match(paragraphTag, /\bw-full\b/, `${headerFile} 的标题说明必须占满父级容器`);
  assert.doesNotMatch(paragraphTag, /\bmax-w-/, `${headerFile} 的标题说明不得设置局部最大宽度`);
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

const portalsConfig = read("portals.yml");
assert.match(portalsConfig, /^recruitment_platforms:/m, "中国大陆招聘平台必须写入用户层 portals.yml");
assert.match(portalsConfig, /name:\s*BOSS直聘/, "默认招聘平台必须包含 BOSS直聘");
assert.match(portalsConfig, /name:\s*智谱AI/, "目标公司默认推荐必须包含中国 AI 公司");

assert.ok(
  fs.existsSync(path.join(root, ".agents/skills/career-one/SKILL.md")),
  "必须保留唯一的 career-one Skill",
);

const profileExample = read("config/profile.example.yml");
assert.match(profileExample, /primary:\s*zh-CN/, "默认语言必须是 zh-CN");
assert.match(profileExample, /modes_dir:\s*modes\/zh/, "默认模式目录必须是 modes/zh");

const scaffolder = json("scaffolder/package.json");
assert.equal(scaffolder.name, "career-one", "npm 安装器必须占用 career-one 发布命名空间");
assert.equal(scaffolder.version, "1.0.0", "npm 安装器必须与项目版本一致");
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
assert.match(updater, /raw\.githubusercontent\.com\/luyu925065781\/career-one\/main\/VERSION/, "更新检查必须读取择程AI版本文件");

const scaffolderCli = read("scaffolder/bin/cli.mjs");
assert.match(scaffolderCli, /github\.com\/luyu925065781\/career-one\.git/, "安装器必须克隆择程AI仓库");
assert.match(readme, /npx career-one init/, "中文 README 必须展示新的 npm 安装命令");

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
