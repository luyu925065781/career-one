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
| **批量处理** | 使用 `codex exec --sandbox workspace-write`、`claude -p` 或其他 headless worker 并行评估 |
| **Dashboard TUI** | 在终端 UI 中浏览、筛选和排序你的求职管道 |
| **人类在环** | AI 负责评估和建议，你负责决定和行动。系统绝不会自动提交申请，最终决定始终在你手上 |
| **管道完整性** | 自动合并、去重、状态标准化和健康检查 |

## 快速开始

**最快的方式 —— 一条命令：**

```bash
npx career-one init
```

> 💡 `npx` 随 [Node.js](https://nodejs.org) 一起提供 —— 它只运行一次安装程序，
> 不会全局安装任何东西。还没有 Node？请先安装它。
> （已经在用 Claude Code / Gemini / Codex CLI？那你已经有它了。）

择程AI安装器默认创建 `./career-one` 并安装依赖。然后：

```bash
cd career-one
codex    # 或 claude / opencode / gemini / qwen —— 在这里打开你的 AI CLI
```

**首次启动择程AI时，用户自己的 Agent 会通过中文对话完成设置，包括 `cv.md`、个人画像和目标岗位。所有文件保存在当前电脑中。**

<details>
<summary><b>更喜欢手动设置？（git clone）</b></summary>

```bash
git clone https://github.com/luyu925065781/career-one.git
cd career-one && npm install
npx playwright install chromium   # 仅生成 PDF 时需要
codex    # 打开你的 AI CLI —— 它会在首次启动时引导你完成设置
```

</details>

> **这个系统本来就是设计给 Codex 或你选择的 AI 编码 CLI 直接定制的。** modes、职业原型、评分权重、谈判脚本，直接告诉 Codex 要改什么就行。它读取的正是自己会使用的那些文件，所以知道该改哪里。

完整配置指南见 [docs/SETUP.md](docs/SETUP.md)。

## Codex 集成

<!-- Codex compatibility: slash commands are not guaranteed; use plain language prompts or codex exec. -->

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

### 一次性 Codex worker

只读任务可以直接用 `codex exec`；会写入报告、tracker 或 PDF 的任务需要显式打开 workspace 写权限：

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

## Dashboard TUI

内置终端仪表盘可以让你更直观地浏览整个求职管道：

```bash
npm run serve:dashboard   # launch the TUI
npm run build:dashboard   # optional: build the standalone binary
```

功能包括：6 个筛选标签、4 种排序模式、分组/平铺视图、懒加载预览、行内状态修改。

## 项目结构

```
career-one/
├── CLAUDE.md                    # 代理说明
├── cv.md                        # 你的简历（需要自行创建）
├── article-digest.md            # 你的成果证明（可选）
├── config/
│   └── profile.example.yml      # 个人档案模板
├── modes/                       # 14 个技能模式
│   ├── _shared.md               # 共享上下文（在这里自定义）
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
│   ├── batch-prompt.md          # 自包含 worker 提示词
│   └── batch-runner.sh          # 编排脚本
├── dashboard/                   # Go TUI 管道查看器
├── data/                        # 你的追踪数据（已 gitignore）
├── reports/                     # 评估报告（已 gitignore）
├── output/                      # 生成的 PDF（已 gitignore）
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

## Star 历史

<a href="https://www.star-history.com/?repos=luyu925065781%2Fcareer-one&type=timeline&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=luyu925065781/career-one&type=timeline&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=luyu925065781/career-one&type=timeline&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=luyu925065781/career-one&type=timeline&legend=top-left" />
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

## 许可证与商标

代码以 [MIT](LICENSE) 许可证授权。各源码包、安装器和 Agent 分发包均必须携带完整许可证文本。
