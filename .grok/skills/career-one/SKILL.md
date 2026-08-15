---
name: career-one
description: 择程AI（career-one）是面向中国大陆用户的本地优先 AI 求职工作台。用于首次建立或完善 cv.md、评估中文或英文岗位、分析 BOSS直聘等招聘截图与链接、生成可视化报告和定制简历、准备面试、跟进投递并管理求职进度。用户提到择程AI、career-one、求职、简历、岗位评估、JD、招聘截图、BOSS直聘、猎聘、拉勾、面试或投递管理时使用。
metadata:
  argument-hint: "[scan|pdf|latex|email|offer-prep|titles|tracker] [岗位链接、JD 或任务说明]"
---

# 择程AI（career-one）

择程AI由用户自己的 Agent 驱动。Skill 提供流程和规则，个人数据、简历、报告与求职进度只写入当前用户的本地工作区。

## 工作区定位与安装

运行要求：Node.js 20.9+（推荐使用 Node.js 22 LTS 或更新的 LTS 版本）、git 和本地文件读写能力；初始化依赖安装需要 npm，PDF 生成功能需要 Playwright Chromium。

1. 当前目录同时存在 `AGENTS.md` 和 `doctor.mjs` 时，将其视为择程AI工作区，直接执行后续流程。
2. 当前目录不是择程AI工作区时，不得把简历或配置写入 Skill 安装目录。先解析本 Skill 根目录，再运行：

```bash
node <skill-root>/scripts/career-one.mjs init ./career-one
```

3. 初始化只复制系统规则、脚本和模板，不创建 `cv.md`、`config/profile.yml`、`modes/_profile.md` 或 `portals.yml`。进入新工作区后，由用户自己的 Agent 完成中文 onboarding。
4. Codex Plugin 和 WorkBuddy 技能包使用同一个 `SKILL.md`、便携 CLI 和本地运行时，不得维护平台专属业务逻辑。

稳定命令入口：

| 命令 | 用途 |
|---|---|
| `node <skill-root>/scripts/career-one.mjs init [目录]` | 初始化本地工作区并安装基础依赖 |
| `node <skill-root>/scripts/career-one.mjs locate` | 定位当前工作区 |
| `node <skill-root>/scripts/career-one.mjs doctor` | 检查 onboarding 和依赖状态 |
| `node <skill-root>/scripts/career-one.mjs verify` | 验证本地求职数据完整性 |
| `node <skill-root>/scripts/career-one.mjs tracker` | 查询求职进度 |
| `node <skill-root>/scripts/career-one.mjs run [子命令]` | 记录 Agent/Web 共享任务、结果与待确认修改 |
| `node <skill-root>/scripts/career-one.mjs web [--page /页面]` | 启动或复用 Web 工作台，并打开任务上下文页面 |

岗位评估、简历定制和面试准备仍由 Agent 按下方模式执行；便携 CLI 不自行调用模型。

## Agent 原生任务与 Web 工作台协作

Agent 是完整入口，Web 工作台是可选的可视化伴侣。无论 Web 是否启动，任务都必须可以完成；Web 下次打开后会从 `data/agent-runs.json` 读取同一份进度、结果、产物和待确认修改。

Web 工作台不得直接启动 Agent CLI。用户在 Web 中发起生成简历、修改材料或其他需要推理的任务时，Web 只把短任务写入 `data/agent-inbox.md` 和共享任务注册表，并向用户提供一条可复制的自然语言指令；用户自己的 Codex、WorkBuddy 或其他 Agent 负责理解、决策、生成和修改，Web 负责查看、确认、管理与回放。

执行会生成报告、PDF、面试材料或用户文件修改的工作流时：

1. 开始前创建任务，保存返回的 `id`：
   `node <skill-root>/scripts/career-one.mjs run start --intent <意图> --title <中文标题> --source agent [--input <简短输入>] [--page </页面>]`
2. 长任务在关键阶段记录简短中文进度：
   `node <skill-root>/scripts/career-one.mjs run progress <id> --label <当前阶段>`
3. 需要用户补充事实时，先把任务暂停为“等待用户回复”，并记录一个具体问题；用户回答后再用同一个 ID 恢复进度：
   `node <skill-root>/scripts/career-one.mjs run wait <id> --question <需要用户回答的问题> --label <等待阶段>`
4. 成功后记录摘要、分数、正式产物和 Web 页面：
   `node <skill-root>/scripts/career-one.mjs run complete <id> --summary <摘要> [--score <0-5>] [--artifact 'reports/文件.md|岗位诊断报告|/pipeline/编号'] [--page </页面>]`
5. 失败或被阻塞时记录真实原因：
   `node <skill-root>/scripts/career-one.mjs run fail <id> --error <原因>`

如果用户消息中带有“已有待办任务 ID”，不要再次运行 `run start` 创建重复任务。先运行 `run progress <id> --label "Agent 已接手任务"` 把 queued 或 waiting_input 任务更新为运行中；需要用户回答时必须在结束当前对话回合前运行 `run wait`，不能让 Web 继续显示“思考中”；完成或失败时继续使用同一个 ID。任务完成后运行 `node agent-inbox.mjs resolve --task <id> --result <结果摘要>`，让 Web 与 Agent 待办同步结单。

不得把完整 JD、简历正文或秘密写入任务摘要；任务记录只保存短输入、进度和正式产物的相对路径。

修改 `cv.md`、画像、求职规则或单个面试故事时，不直接覆盖目标文件。先把完整候选内容写入临时草稿，再创建提案：

`node <skill-root>/scripts/career-one.mjs run propose <id> --target <用户层文件> --draft <临时草稿> --summary <修改摘要>`

创建后停止落盘并请用户确认。用户明确同意后才运行 `run approve <proposal-id>`；拒绝时运行 `run reject <proposal-id>`。确认脚本会校验文件版本，目标文件在提案后发生变化时必须重新生成提案，不得覆盖较新的用户修改。

### 单个面试故事优化

用户要求“优化”某个面试故事时，默认目标是交付一份达到“已完善”标准的候选稿，而不是生成更多待完善项：

1. 只处理用户指定的故事编号，其他故事必须逐字保留。
2. 先充分利用允许来源中已经确认的事实，完成清晰、具体且可追溯的 STAR+Reflection。可以排序、归纳和结构化已有事实，但不得增加新的经历、指标或个人贡献；Reflection 可以总结现有事实呈现出的工程方法，不得伪造用户未表达过的主观感受。
3. 不主动扩展非必要的“待确认”问题。只有缺少关键事实会导致完善标准无法满足时，才先用最少的问题向用户追问；在用户回答前不要把问题清单包装成“优化完成”的提案。
4. 当故事各部分均有事实支撑且没有必要待确认项时，候选稿状态写为“已完善”。该状态只会随提案在用户确认后落盘，因此不与“用户最终确认”冲突。
5. 只有用户明确选择跳过关键问题，或允许来源确实不足以支持完整故事时，才提交状态为“待完善”的候选稿，并说明仍缺少什么。故事状态不影响用户继续发现岗位。

最终回复始终先给结果，再列出：修改或生成了什么、相对文件路径、是否有待确认提案、建议的下一步，以及可在 Web 工作台打开的页面。不得为了显示进度而要求用户启动 Web。

每个 Agent 任务都必须向用户展示可点击的本地入口；不要只报文件路径：

- 工作台总入口：`[打开工作台](http://localhost:3301/jobs)`
- 当前任务：`[查看当前任务](http://localhost:3301/jobs/<任务ID>)`
- 岗位诊断完成后：`[查看诊断报告](http://localhost:3301/pipeline/{报告编号})`
- 简历创建、优化或待确认修改：`[打开简历页面](http://localhost:3301/cv)`
- 单个面试故事修改：`[打开面试故事库](http://localhost:3301/interview)`
- 求职画像或规则修改：`[打开求职画像](http://localhost:3301/profile)`
- 岗位渠道设置：`[打开岗位来源](http://localhost:3301/portals)`

任务仍在执行时立即给出“查看当前任务”链接，用户可在 Web 中实时查看进度。任务完成后，再给最具体的结果页链接。工作台尚未运行时，先运行 `node <skill-root>/scripts/career-one.mjs web --page <任务页面>`；正在运行时该命令会安全复用现有服务，不关闭端口上的其他进程。除非用户明确要求，不要在每个后台步骤重复弹出浏览器。

### Codex 调用

- 交互模式：在工作区根目录运行 `codex`，直接用中文 prompt 描述任务；Codex 不保证支持斜杠命令。
- 无头只读任务：运行 `codex exec "使用择程AI查看求职进度"`。
- 需要写入报告或简历时：运行 `codex exec --sandbox workspace-write "使用择程AI评估这个岗位：<URL>"`。
- `/career-one` 是跨 Agent 的发现入口；在 Codex 中不可用时，使用等价的中文自然语言 prompt。

## 不可突破的边界

1. 默认使用简体中文沟通和输出，中国大陆招聘市场是默认语境。
2. 只从 `cv.md`、`article-digest.md`、`config/profile.yml`、`modes/_profile.md`、`writing-samples/` 和 `interview-prep/` 读取可用于外发材料的用户事实。
3. 不读取父目录、兄弟项目、其他 Agent 会话或全局记忆来补充用户经历。
4. 不虚构经历、指标、技能、教育背景、项目归属或作者身份。关键词可以重组，事实不能制造。
5. 不自动提交申请、发送消息或点击最终确认按钮。所有外发内容必须由用户审阅。
6. Skill 自身不调用外部模型 API，不上传简历或报告；推理由用户当前选择的 Agent 完成。
7. “择程AI”是面向用户的中文品牌；`career-one` 是项目、Skill 和命令的唯一技术标识。

## 首次使用

先在工作区运行：

```bash
node doctor.mjs --json
```

如果缺少 `cv.md`、`config/profile.yml`、`modes/_profile.md` 或 `portals.yml`，先完成中文 onboarding，再执行岗位评估。

### 创建 `cv.md`

如果缺少 `cv.md`，向用户提供三种方式：

1. 上传或粘贴现有简历，由 Agent 转成结构化 Markdown。
2. 提供个人主页或公开职业资料，由 Agent提取后让用户核对。
3. 通过逐步访谈收集经历、项目、教育、技能和可验证成果。

生成前先展示事实摘要；不确定的信息标记为“待确认”，不得自行补全。`cv.md` 至少包含个人摘要、工作经历、项目经历、教育经历和技能。创建后请用户核对时间线、公司名称、岗位名称、数字指标和语法。

### 创建个人配置

从 `config/profile.example.yml` 复制结构，并在一次回复中列出完整确认清单：

- 姓名、联系方式、所在城市与时区
- 目标岗位与职级、地点偏好、工作方式与迁居意愿
- 目标薪资范围与最低接受值
- 优势、代表成果、动力来源、红线与理想工作方式
- 最有说服力的成果与公开作品

先读取允许的用户层事实文件，已有且明确的内容直接预填；所有仍需确认的项目必须在同一条消息中一次性列出，不得拆成多轮逐项追问。用户未回答的项目标为“待确认”，不要因此继续追问或阻塞完整候选稿与待确认提案。

个人画像只写入 `config/profile.yml` 或 `modes/_profile.md`。

## 中文模式加载

执行任何求职任务时按顺序读取：

1. 用户层事实文件。
2. `modes/zh/_shared.md`。
3. `modes/zh/` 中存在的对应模式。
4. 如果中文模式暂缺，再读取 `modes/` 中的英文操作内核，但所有解释、报告和用户可见文本仍使用中文，并遵守中国大陆规则。

优先映射：

| 用户意图 | 模式 |
|---|---|
| 粘贴 JD、链接或招聘截图 | 自动流水线；读取 `modes/zh/_shared.md` + `modes/zh/oferta.md` + `modes/auto-pipeline.md` |
| 只评估岗位 | `modes/zh/oferta.md` |
| 处理待评估链接 | `modes/zh/pipeline.md` |
| 填写申请表 | `modes/zh/apply.md` |
| 搜索岗位 | `modes/scan.md`，输出中文 |
| 生成定制简历或 PDF | `modes/pdf.md`，输出中文 |
| 查看求职进度 | `modes/tracker.md`，输出中文 |
| 准备面试 | `modes/interview-prep.md` 或 `modes/interview/*`，输出中文 |
| 跟进投递 | `modes/followup.md`，输出中文 |
| 分析 Offer | `modes/offer-prep.md`，输出中文且不替代法律意见 |
| 生成 LaTeX 简历 | `modes/latex.md`，输出中文并先校验事实来源 |
| 起草申请邮件 | `modes/email.md`，只生成草稿，不发送 |
| 扩展相邻岗位名称 | `modes/titles.md`，先展示配置差异并由用户确认 |

常用独立模式：

- `/career-one latex`：生成或校验 LaTeX 简历。
- `/career-one email`：起草申请邮件，不执行发送。
- `/career-one offer-prep`：阅读 Offer 或合同并生成待核实问题。
- `/career-one titles`：根据简历和个人画像扩展相邻岗位名称。

这些模式均由当前 Agent 直接读取对应的 `modes/*.md` 执行，不委派给隐藏的远程服务。

## 岗位输入处理

- URL：优先使用用户 Agent 自带的浏览器能力读取真实页面；无法访问时请用户粘贴 JD。
- 截图：使用用户 Agent 的视觉能力提取职位、公司、薪资、地点、职责和要求；识别不清的内容标记为待确认。
- 文本：保留原始 JD 作为证据，不把推断写成岗位事实。
- BOSS直聘等动态页面：区分招聘者话术、职位正文和平台 UI，避免把页面噪声当成岗位要求。

## 输出要求

岗位评估至少包含：

- 岗位与公司摘要
- 综合评分与评分依据；数值分只使用 5 个评分因子：简历匹配、职业方向、职级与职责、薪酬、组织与文化
- G「职位真实性评估」独立评级，不参与 1-5 分计算；最终建议同时结合综合匹配分与真实性评级，真实性评级不改写数值分，但可以把“投递”调整为“先核实”“谨慎推进”或“放弃”
- 与 `cv.md` 的匹配证据；“匹配雷达”和“正向信号”属于 B「简历匹配分析」，顺序为“匹配雷达”→“正向信号”→“能力与缺口补强”
- 关键优势、能力缺口与信息缺口
- 薪资、试用期、五险一金、年终奖、期权、竞业和工作强度风险
- “剩余风险”紧跟在 G「职位真实性评估」下方
- 投递、先沟通、观察或放弃的明确建议
- 可选的打招呼话术；报告标题统一写为“打招呼话术”，不添加招聘平台名称
- “向招聘方追问”放在“打招呼话术”下方，随后依次为“你在这个岗位里的最佳表达”和“沟通后分流规则”
- A-G 是内部稳定模块 ID，用于报告 Markdown 结构、解析器和历史报告兼容；它们不参与 1-5 分计算，也不得因页面顺序变化而重新编号
- 用户界面按实际呈现顺序使用连续数字：1 岗位预览 → 2 简历匹配分析 → 3 级别判断与求职策略 → 4 薪酬竞争力与市场需求 → 5 职位真实性评估 → 6 打招呼话术 → 7 向招聘方追问 → 8 你在这个岗位里的最佳表达 → 9 沟通后分流规则 → 10 针对性定制方案 → 11 面试备考计划

完成岗位评估后必须同步 `interview-prep/story-bank.md`：不存在则创建；按真实经历与核心结果去重；同一岗位的中英文报告不得生成重复故事；所有事实必须能追溯到允许的用户层文件，信息不足时标记为“待完善”。

结论必须能追溯到 JD 或用户事实。评分低于 4.0/5 时默认不建议投递，除非用户给出明确的覆盖理由。

## 调用方式

支持自然语言调用：

```text
使用择程AI评估这个岗位：<URL 或 JD>
根据这张 BOSS直聘截图生成岗位诊断报告
帮我建立 cv.md
查看我的求职进度
为这个岗位准备面试
```

主命令为 `/career-one`，也可以直接使用中文自然语言调用。
