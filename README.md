# 择程AI

<p align="center">
  <strong>面向中国大陆用户的本地优先 AI 求职工作台</strong><br>
  让用户自己的 Agent 在本地完成简历建档、岗位判断、定制简历、面试准备与求职进度管理。
</p>

<p align="center">
  <a href="https://developers.openai.com/codex"><img src="https://img.shields.io/badge/Codex_first-OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" alt="Codex first"></a>
</p>

<p align="center">
  <sub>同样支持任何符合 agent-skill 标准的 CLI</sub><br>
  <img src="https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white" alt="Claude Code">
  <img src="https://img.shields.io/badge/OpenCode-111827?style=flat&logo=terminal&logoColor=white" alt="OpenCode">
  <img src="https://img.shields.io/badge/Gemini_CLI-4285F4?style=flat&logo=google&logoColor=white" alt="Gemini CLI">
  <img src="https://img.shields.io/badge/Codex-412991?style=flat&logo=openai&logoColor=white" alt="Codex">
  <img src="https://img.shields.io/badge/Qwen-615CED?style=flat" alt="Qwen">
  <img src="https://img.shields.io/badge/GitHub_Copilot-000?style=flat&logo=githubcopilot&logoColor=white" alt="GitHub Copilot">
  <br>
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white" alt="Go">
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white" alt="Playwright">
  <img src="https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white" alt="Bubble Tea">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT">
</p>

## 这是什么

择程AI是面向中国大陆用户的本地优先 AI 求职工作台。它把用户已经在使用的 Agent 变成求职助手，不要求把简历上传到项目方服务器，也不绑定某一家模型。项目、Skill 和命令的技术标识为 `career-one`。你可以：

- **评估职位**，使用结构化的 A-F 评分系统（10 个加权维度）
- **生成定制 PDF**，针对每份职位描述输出 ATS 优化简历
- **整理岗位搜索标签**，复制到 BOSS直聘、猎聘、脉脉等招聘平台搜索
- **批量处理**，通过子代理并行评估 10 份以上职位
- **集中管理一切**，用单一事实来源配合完整性检查

> **重要：这不是海投工具。** 择程AI是一个过滤器，帮你从大量职位里找出真正值得投入时间的少数机会。系统默认不建议申请评分低于 4.0/5 的职位。任何投递和外发内容都必须由用户最终确认。

择程AI由用户自己的 Codex、Claude Code、OpenCode、TRAE 或其他 Agent 驱动。首次使用时，Agent 会通过中文对话创建或完善 `cv.md`；后续根据岗位链接、JD 或截图评估匹配度、生成可视化报告，并按岗位定制简历。

> **提醒：最开始几次评估不会特别准。** 系统还不了解你。请给它更多上下文，比如你的简历、职业故事、成果证明、个人偏好、擅长的事、想避开的事。你喂给它的信息越多，它就越准确。把它当成在培养一个新招聘顾问：第一周它需要先了解你，之后就会变得非常有价值。

## 功能特性

| 功能 | 说明 |
|------|------|
| **自动管道** | 粘贴一个 URL，即可获得完整评估 + PDF + 追踪记录 |
| **6 个评估模块** | 职位总结、简历匹配、职级策略、薪酬调研、个性化建议、面试准备（STAR+R）—— 外加一个用于核查职位真实性的 Block G 模块，可标记诈骗职位和幽灵职位 |
| **面试故事库** | 跨多次评估积累 STAR+Reflection 故事，沉淀出 5-10 个可回答任意行为面试题的主线故事 |
| **谈薪脚本** | 薪资谈判框架、地域折扣反驳话术、竞品 offer 杠杆策略 |
| **ATS PDF 生成** | 注入关键词的简历，采用 Space Grotesk + DM Sans 设计 |
| **岗位搜索辅助** | 根据本地个人画像生成目标岗位和排除岗位标签，可一键复制到国内招聘平台；仅把无需登录即可访问的公开招聘页面作为补充来源 |
| **批量处理** | 使用 `codex exec --sandbox workspace-write`、`claude -p` 或其他无头工作进程并行评估 |
| **终端仪表盘** | 在终端界面中浏览、筛选和排序你的求职管道 |
| **人类在环** | AI 负责评估和建议，你负责决定和行动。系统绝不会自动提交申请，最终决定始终在你手上 |
| **管道完整性** | 自动合并、去重、状态标准化和健康检查 |

## 快速开始

### 邀请内测版 `v1.1.0-beta.1`

内测用户从 GitHub Prerelease 获取固定版本。内测期间不要使用 `npx career-one init`；当前 npm installer 尚未重新发布，也不会自动选择 prerelease。

在 `v1.1.0-beta.1` Release 页面下载 `SHA256SUMS.txt`，并按使用环境选择：

- Codex：`career-one-codex.zip`
- WorkBuddy：`career-one-workbuddy.zip`

使用通用 Agent CLI 的测试用户可以检出同一个不可变 tag：

```bash
git clone --branch v1.1.0-beta.1 --depth 1 https://github.com/luyu925065781/career-one.git
cd career-one
npm ci --ignore-scripts
(cd web && npm ci)
codex    # 或 claude / opencode / gemini / qwen
```

在下载附件的目录校验完整性：

```bash
shasum -a 256 -c SHA256SUMS.txt
```

Linux 用户可将 `shasum -a 256` 替换为 `sha256sum`。PDF 生成功能需要另行安装 Chromium：

```bash
npx playwright install chromium
```

**首次启动择程AI时，用户自己的 Agent 会通过中文对话完成设置，包括 `cv.md`、个人画像和目标岗位。所有文件保存在当前电脑中。**

稳定版 npm 一键安装器恢复发布后，README 会重新启用对应命令；在此之前，以 Release tag、附件和 `SHA256SUMS.txt` 为准。

> **这个系统本来就是设计给 Codex 或你选择的 AI 编码 CLI 直接定制的。** modes、职业原型、评分权重、谈判脚本，直接告诉 Codex 要改什么就行。它读取的正是自己会使用的那些文件，所以知道该改哪里。

完整配置指南见 [docs/SETUP.md](docs/SETUP.md)。维护正式版、内测版和开发版时，请遵循 [docs/RELEASES.md](docs/RELEASES.md)。

## Codex 集成

<!-- Codex 兼容性：不保证提供斜杠命令；请使用自然语言提示或 codex exec。 -->

择程AI支持 Codex 作为默认使用路径。Codex 会读取仓库根目录的 `AGENTS.md`，并加载 `.agents/skills/career-one/SKILL.md`。

完整说明见 [Codex 使用指南](docs/CODEX.md)。

### Codex Plugin 与 WorkBuddy Skill

项目使用同一个开放 Skill 内核生成两个优先分发包：

```bash
npm run build:distributions
```

- Codex Plugin：`dist/marketplaces/codex/career-one/`
- WorkBuddy 上传包：`dist/marketplaces/workbuddy/career-one-workbuddy.zip`

安装包只包含系统规则、脚本和模板。首次运行时在用户选择的目录创建本地工作区，再由 Agent 对话生成 `cv.md`、画像和岗位配置；这些个人数据不会进入 Skill 或 Plugin 包。

### Agent 原生入口 + Web 工作台

择程AI以 Agent 原生入口为主：评估、扫描、简历维护和面试准备都可以直接在 Codex 等 Agent 中完成，不依赖浏览器。Web 工作台是同一份本地数据的可视化伴侣，用来查看任务进度、打开报告，以及确认 Agent 提出的文件修改。

```bash
npm run dev:web
```

macOS 用户也可以直接双击项目根目录的 `启动择程AI.command`。它会自动进入当前项目目录，启动或复用 `3301` 端口的工作台，并打开“Agent 任务”页面。

也可以直接对 Agent 说“打开择程AI工作台”，或使用便携入口启动并打开任务中心：

```bash
node .agents/skills/career-one/scripts/career-one.mjs web
node .agents/skills/career-one/scripts/career-one.mjs web --page /jobs/<任务ID>
```

打开 Web 后进入“Agent 任务”即可看到 Agent 与 Web 发起的统一任务记录。Agent 会在任务开始时立即给出当前任务链接；岗位诊断完成后给出 `/pipeline/{报告编号}`，简历任务给出 `/cv`，面试故事任务给出 `/interview`。Agent 对 `cv.md`、个人配置、面试故事等用户文件的修改会先生成提案；只有用户在任务详情中确认后才会写入文件。如果 Web 没有启动，Agent 仍可独立完成任务，并在对话中给出结果和待确认事项。

### 交互式 Codex

```bash
cd career-one
codex
```

Codex 不一定暴露 `/career-one` 斜杠命令；如果不可用，直接用中文自然语言说明任务：

```text
使用择程AI评估这个岗位：https://company.com/jobs/123
使用择程AI扫描并总结新岗位。
处理 data/pipeline.md 中待评估的岗位。
为最近评估的岗位生成定制简历。
查看并总结当前求职进度。
```

### 一次性 Codex 工作进程

只读任务可以直接使用 `codex exec`；会写入报告、追踪记录或 PDF 的任务需要显式开放工作区写权限：

```bash
codex exec --sandbox workspace-write --search "使用择程AI评估这个岗位：https://company.com/jobs/123"
codex exec "使用择程AI扫描并总结新岗位。"
codex exec --sandbox workspace-write --search "处理 data/pipeline.md 中待评估的岗位。"
codex exec --sandbox workspace-write "为最近评估的岗位生成定制简历。"
codex exec "查看并总结当前求职进度。"
```

## Gemini CLI 集成

择程AI同样支持 [Gemini CLI](https://github.com/google-gemini/gemini-cli)、Claude Code、OpenCode 等 Agent，并共享相同的中文默认规则与模式内核。

### 选项 A —— 原生 Gemini CLI（推荐）

```bash
# 1. 安装 Gemini CLI（需要 Node.js 20+）
npm install -g @google/gemini-cli
# 或: npx @google/gemini-cli --version

# 2. 在 career-one 目录中运行
cd career-one
gemini

# 3. 使用统一的 /career-one 命令及其子命令：
/career-one "某公司的 AI 产品经理岗位..."
/career-one pipeline
/career-one scan
/career-one pdf
/career-one tracker
```

`GEMINI.md` 文件会自动作为上下文加载。所有子命令都通过统一的 `.agents/skills/career-one/SKILL.md` 定义进行路由。

### 选项 B —— 独立 API 脚本（无需安装 CLI）

```bash
# 1. 在 https://aistudio.google.com/apikey 获取免费 API 密钥
cp .env.example .env
# 编辑 .env → 设置 GEMINI_API_KEY=***

# 2. 安装依赖
npm install

# 3. 评估职位描述
node gemini-eval.mjs "我们在招聘资深 AI 工程师..."
node gemini-eval.mjs --file ./jds/my-job.txt
npm run gemini:eval -- "职位描述文本"
```

> **免费层：** 两种选项都无需付费。原生 CLI 使用 Google OAuth；API 脚本使用 `gemini-2.0-flash`（15 RPM，每天 1M token 免费）。


## 用法

择程AI提供一个统一入口，支持以下常用模式：

```
/career-one                → 显示所有可用命令
/career-one {粘贴职位描述}  → 完整自动管道（评估 + PDF + 追踪）
/career-one scan           → 扫描招聘渠道的新岗位
/career-one pdf            → 生成 ATS 优化简历
/career-one batch          → 批量评估多个岗位
/career-one tracker        → 查看求职进度
/career-one apply          → 用 Agent 协助填写申请表
/career-one pipeline       → 处理待评估 URL
/career-one contacto       → 生成招聘沟通话术
/career-one deep           → 深度公司研究
/career-one training       → 评估课程/证书
/career-one project        → 评估作品集项目
```

也可以直接粘贴岗位 URL、职位描述或招聘截图，择程AI会自动识别并运行对应流程。

## 工作原理

```
粘贴职位 URL 或职位描述
        │
        ▼
┌──────────────────┐
│  职业原型检测    │  分类：LLMOps / Agentic / PM / SA / FDE / Transformation
└────────┬─────────┘
         │
┌────────▼─────────┐
│  A-F 评估        │  匹配度、能力缺口、薪酬调研、STAR 故事
│  （读取 cv.md）  │
└────────┬─────────┘
         │
    ┌────┼────┐
    ▼    ▼    ▼
  报告  PDF  追踪
  .md  .pdf  .tsv
```

## 岗位发现边界

国内多数招聘平台需要登录并有严格的访问控制，择程AI不承诺通过算法覆盖这些平台的全部岗位，也不会绕过平台权限或反爬机制。当前岗位发现能力以搜索辅助为主：

- 根据 `cv.md` 和本地个人配置生成目标岗位与排除岗位标签。
- 将标签复制到 BOSS直聘、猎聘、脉脉、智联招聘和前程无忧等平台，由用户主动搜索。
- 对无需登录即可访问的目标公司招聘官网和公开页面进行补充检查。
- 用户主动提供岗位链接、JD 或截图后，再由 Agent 完成评估和跟进。

## 终端仪表盘

内置终端仪表盘可以让你更直观地浏览整个求职管道：

```bash
npm run serve:dashboard   # 启动终端界面
npm run build:dashboard   # 可选：构建独立可执行文件
```

功能包括：6 个筛选标签、4 种排序模式、分组/平铺视图、懒加载预览、行内状态修改。

## 项目结构

```
career-one/
├── AGENTS.md                    # Agent 项目规则
├── CLAUDE.md                    # Claude Code 入口说明
├── cv.md                        # 你的简历（需要自行创建）
├── article-digest.md            # 你的成果证明（可选）
├── config/
│   └── profile.example.yml      # 个人档案模板
├── modes/                       # 工作流模式
│   ├── _shared.md               # 系统共享上下文（不要写入个人事实）
│   ├── _profile.md              # 用户职业画像与自定义规则
│   ├── oferta.md                # 单个职位评估
│   ├── pdf.md                   # PDF 生成
│   ├── scan.md                  # 平台扫描器
│   ├── batch.md                 # 批量处理
│   └── ...
├── templates/
│   ├── cv-template.html         # ATS 优化简历模板
│   ├── portals.example.yml      # 扫描器配置模板
│   └── states.yml               # 规范状态列表
├── batch/
│   ├── batch-prompt.md          # 自包含工作进程提示词
│   └── batch-runner.sh          # 编排脚本
├── dashboard/                   # Go TUI 管道查看器
├── data/                        # 你的追踪数据（已被 Git 忽略）
├── reports/                     # 评估报告（已被 Git 忽略）
├── output/                      # 生成的 PDF（已被 Git 忽略）
├── fonts/                       # Space Grotesk + DM Sans
├── docs/                        # 配置、定制、架构说明
└── examples/                    # 示例简历、报告、成果证明
```

## 技术栈

![Codex](https://img.shields.io/badge/Codex-OpenAI-412991?style=flat&logo=openai&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Bubble Tea](https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white)

- **代理**：Codex 优先，配合共享技能、`AGENTS.md` 与 modes；Claude Code 等 CLI 可兼容使用
- **PDF**：Playwright/Puppeteer + HTML 模板
- **扫描器**：Playwright + Greenhouse API + WebSearch
- **Dashboard**：Go + Bubble Tea + Lipgloss（Catppuccin Mocha 主题）
- **数据**：Markdown 表格 + YAML 配置 + TSV 批处理文件

## Star 趋势

<a href="https://www.star-history.com/?repos=luyu925065781%2Fcareer-one&type=timeline&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=luyu925065781/career-one&type=timeline&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=luyu925065781/career-one&type=timeline&legend=top-left" />
   <img alt="GitHub Star 趋势图" src="https://api.star-history.com/chart?repos=luyu925065781/career-one&type=timeline&legend=top-left" />
 </picture>
</a>

## 免责声明

**择程AI是一个本地开源工具，不是托管简历和求职数据的服务。** 使用本软件即表示你确认：

1. **数据由你掌控。** 你的简历、联系方式和个人数据都保留在你的设备上，并直接发送给你选择的 AI 提供商（Anthropic、OpenAI 等）。我们不会收集、存储或访问你的任何数据。
2. **AI 由你掌控。** 默认提示词会明确要求 AI 不要自动提交申请，但 AI 模型的行为可能不可预测。如果你修改提示词或使用不同模型，风险由你自行承担。**提交前务必核查 AI 生成内容的准确性。**
3. **你需要遵守第三方服务条款。** 你必须按照所使用招聘平台（Greenhouse、Lever、Workday、LinkedIn 等）的服务条款来使用本工具。不要用它向雇主发送垃圾申请，也不要对 ATS 系统造成过载。
4. **不提供任何保证。** 评估结果只是建议，不是真相。AI 模型可能会幻觉出并不存在的技能或经历。作者不对任何求职结果、申请被拒、账号受限或其他后果承担责任。

完整内容见 [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md)。本软件依据 [MIT License](LICENSE) 以“按现状”方式提供，不附带任何形式的担保。

## 贡献者

<a href="https://github.com/luyu925065781/career-one/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=luyu925065781/career-one" />
</a>

通过择程AI改善了求职结果？欢迎在[择程AI Issues](https://github.com/luyu925065781/career-one/issues)反馈。

## 许可证

代码以 [MIT](LICENSE) 许可证授权。各源码包、安装器和 Agent 分发包均必须携带完整许可证文本。
