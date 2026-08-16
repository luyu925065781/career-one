# 择程AI

让你的 Agent 成为个人 AI 求职顾问，完成简历建档、求职画像、故事库、岗位评估、定制简历、面试准备与求职进度管理。

择程AI支持你正在使用的 Codex、Claude Code、OpenCode、TRAE、WorkBuddy 等 Agent：智能优化你提供的初始简历，生成求职画像和面试故事库，并完成岗位评估、简历定制、面试准备与投递管理。项目、Skill 与命令的技术标识为 `career-one`。

个人简历、画像、报告和投递记录保存在当前电脑；项目不托管用户数据，也不提供统一模型 API。择程AI用于筛选真正匹配的机会，不做自动海投，任何提交或外发都由用户最终确认。

## 核心功能

| 功能 | 你可以得到什么 |
| --- | --- |
| **求职画像** | 通过中文对话建立目标岗位、职级、地点偏好、薪资预期和求职红线，并据此生成适合国内招聘平台的搜索词，辅助发现与筛选匹配岗位 |
| **岗位诊断** | 输入岗位JD 或截图，获得匹配评分、能力差距、职级与薪酬判断，以及独立的职位真实性评估 |
| **智能定制简历与 PDF** | 根据不同岗位的 JD 与要求，基于已确认的个人事实智能重组内容、强化匹配表达，生成一岗一版的 ATS 友好简历与 PDF |
| **面试故事库** | 从已确认的真实经历中持续沉淀、去重并完善 STAR+Reflection 故事，为不同岗位匹配可复用的核心案例 |
| **面试与沟通准备** | 基于岗位诊断和面试故事库，生成面试计划、练习题、复盘、招聘沟通和谈薪草稿 |
| **投递进度管理** | 统一记录岗位、状态、跟进、回复、Offer 和历史数据，支持去重与完整性检查 |
| **Agent + Web 工作台** | 既可直接在 Agent 中完成任务，也可在可选 Web 界面查看任务、报告、简历、画像和进度 |

## 快速开始

运行需要 Git 和 Node.js 20.9+，推荐使用 Node.js 22 LTS 或更新的 LTS 版本。当前公开测试版最快的安装方式是：

```bash
npx career-one@next
cd career-one
codex    # 或 claude / opencode / gemini / qwen / agy / grok
```

安装器会检出经过验证的不可变 GitHub Release，并按锁文件安装根目录与 Web 依赖。正式版发布后可把 `@next` 改为 `@latest`。

<details>
<summary>希望先审计源码或手动安装？</summary>

```bash
git clone https://github.com/luyu925065781/career-one.git
cd career-one
npm ci --ignore-scripts
(cd web && npm ci)
```

</details>

首次运行时，Agent 会用中文引导你导入简历、完善求职画像并设置目标岗位，无需手工编辑配置文件。

需要生成 PDF 时安装 Chromium：

```bash
npx playwright install chromium
```

### 可选 Web 工作台

```bash
npm run dev:web
```

macOS 也可双击根目录的 `启动择程AI.command`。Web 工作台默认运行在 `http://localhost:3301`；不启动 Web 也不影响 Agent 工作流。

## 用法

择程AI提供一个统一入口，支持以下常用模式：

```text
/career-one                → 显示所有可用命令
/career-one {粘贴职位描述}  → 完整自动管道（评估 + PDF + 追踪）
/career-one scan           → 扫描配置的公开招聘渠道
/career-one pdf            → 生成 ATS 优化简历
/career-one batch          → 批量评估多个岗位
/career-one tracker        → 查看求职进度
/career-one apply          → 用 Agent 协助填写申请表
/career-one pipeline       → 处理待评估 URL
/career-one contacto       → 生成招聘沟通话术
/career-one deep           → 深度公司研究
/career-one training       → 评估课程或证书
/career-one project        → 评估作品集项目
```

也可以直接粘贴岗位 URL、职位描述或招聘截图，择程AI会自动识别并运行对应流程。不可用时直接使用中文自然语言：

```text
使用择程AI评估这个岗位：https://company.com/jobs/123
根据这张招聘截图生成岗位诊断报告。
为最近评估的岗位生成定制简历。
为下周的面试制定准备计划。
查看并总结当前求职进度。
```

Codex 不保证显示斜杠命令；交互使用时直接输入上述中文自然语言，一次性任务可运行 `codex exec "查看并总结当前求职进度。"`。完整说明见 [Codex 使用指南](docs/CODEX.md)。

## 项目结构

仓库根目录只保留 README、项目规则和少量稳定入口，具体实现按职责归类：

| 路径 | 内容 |
| --- | --- |
| `career-one.mjs` | 统一命令入口；常用命令例如 `node career-one.mjs scan`、`node career-one.mjs tracker` |
| `scripts/` | 按 `agent`、`analysis`、`application`、`generate`、`liveness`、`plugins`、`scan`、`system`、`tracker` 分类的运行脚本 |
| `tests/` | 与功能域对应的自动化测试 |
| `modes/` | Agent 工作流、评分规则和多语言模式 |
| `web/` | 可选的本地 Web 工作台 |
| `docs/`、`.github/` | 产品文档、设计规范、数据契约、法律条款与社区治理文件 |
| `templates/`、`providers/`、`plugins/` | 模板、公开岗位来源和可选集成 |
| `data/`、`reports/`、`output/` | 用户本地求职数据、评估报告和生成结果；默认不会进入 Git |

内部脚本路径可能随架构调整；用户和集成应优先调用 `career-one.mjs` 或 `npm run` 中的稳定命令。

## 岗位发现边界

国内多数招聘平台需要登录并有严格的访问控制，择程AI不承诺通过算法覆盖这些平台的全部岗位，也不会绕过平台权限或反爬机制。当前岗位发现能力以搜索辅助为主：

- 根据 `cv.md` 和本地个人配置生成目标岗位与排除岗位标签。
- 将标签复制到 BOSS直聘、猎聘、脉脉、智联招聘和前程无忧等平台，由用户主动搜索。
- 对无需登录即可访问的目标公司招聘官网和公开页面进行补充检查。
- 用户主动提供岗位链接、JD 或截图后，再由 Agent 完成评估和跟进。

## 使用边界

- 用户可见材料只使用本地已确认的简历、画像、作品和面试故事，不虚构经历、指标或项目归属。
- 岗位发现不会绕过招聘平台登录、权限或反爬机制；国内平台以用户主动搜索和提供岗位为主。
- Agent 可以评估、起草和协助填写，但不会替用户点击最终提交、发送或申请按钮。
- 评估结果仅供求职决策参考；提交材料前请核对事实和表述。完整说明见 [隐私政策](docs/PRIVACY.md)、[使用条款](docs/TERMS.md)与[免责声明](docs/LEGAL_DISCLAIMER.md)。

## 免责声明

**择程AI是一个本地开源工具，不是托管简历和求职数据的服务。** 使用本软件即表示你确认：

1. **数据由你掌控。** 你的简历、联系方式和个人数据都保留在你的设备上，并直接发送给你选择的 AI 提供商（Anthropic、OpenAI 等）。我们不会收集、存储或访问你的任何数据。
2. **AI 由你掌控。** 默认提示词会明确要求 AI 不要自动提交申请，但 AI 模型的行为可能不可预测。如果你修改提示词或使用不同模型，风险由你自行承担。**提交前务必核查 AI 生成内容的准确性。**
3. **你需要遵守第三方服务条款。** 你必须按照所使用招聘平台（Greenhouse、Lever、Workday、LinkedIn 等）的服务条款来使用本工具。不要用它向雇主发送垃圾申请，也不要对 ATS 系统造成过载。
4. **不提供任何保证。** 评估结果只是建议，不是真相。AI 模型可能会幻觉出并不存在的技能或经历。作者不对任何求职结果、申请被拒、账号受限或其他后果承担责任。

完整内容见 [隐私政策](docs/PRIVACY.md)、[使用条款](docs/TERMS.md)与[免责声明](docs/LEGAL_DISCLAIMER.md)。本软件依据 [MIT License](LICENSE) 以“按现状”方式提供，不附带任何形式的担保。

## 许可证

代码以 [MIT License](LICENSE) 授权；分发、修改或再发布时请保留完整许可证与版权声明。
