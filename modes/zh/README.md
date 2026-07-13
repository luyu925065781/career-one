# career-one — 中国大陆默认模式 (`modes/zh/`)

此目录是 career-one 的默认模式层，面向中国大陆用户。系统默认使用中文沟通、中文报告和中国大陆招聘语境；英文模式继续保留作兼容与参考，不会自动删除。

## 默认行为

- `config/profile.yml` 未显式指定其他语言时，默认读取 `modes/zh/`。
- 中文 JD、英文 JD、中国大陆外企岗位都默认输出中文分析。
- 只有用户明确要求英文输出或指定其他语言目录时，才切换到对应模式。
- 所有个人事实仍只允许来自 `cv.md`、`config/profile.yml`、`modes/_profile.md` 等用户层文件。

重点支持 BOSS直聘、猎聘、拉勾、脉脉、公司官网、公众号和创始人社媒等渠道，并分析五险一金、个税、年终奖、期权/RSU、试用期、竞业限制、社招/校招、加班制度、税前税后和落户政策。

## 模式加载顺序

1. 读取 `cv.md`、`config/profile.yml`、`modes/_profile.md` 等用户层事实来源。
2. 读取 `modes/zh/_shared.md` 作为中国大陆共享规则。
3. 如果 `modes/zh/` 有对应模式，优先使用中文文件。
4. 如果暂时没有中文文件，读取英文模式中的操作步骤，但必须按中文规则解释并输出中文结果。

当前已完整中文化：

| 文件名 | 基础模板 | 用途 |
|---|---|---|
| `_shared.md` | `modes/_shared.md` | 共享上下文、画像检测、全局规则及中国大陆市场特性 |
| `oferta.md` | `modes/oferta.md` | 完整的职位评估（Block A-F + G 真实性评估） |
| `apply.md` | `modes/apply.md` | 网页表单填写实时助手 |
| `pipeline.md` | `modes/pipeline.md` | URL 收件箱 / 收集职位的第二大脑 |

其他模式将逐步消化为中文版本。过渡期间保留英文操作内核，用户可见内容必须使用中文。

## 常用词汇表

为保持语气的一致性，在修改或扩展模式时请遵循以下词汇对照：

| 英文 | 中文 (本仓库规范) | 说明 |
|---|---|---|
| Job posting | 职位描述 / 岗位需求 | 通常简称 JD |
| Application | 投递 / 申请 | |
| Cover letter | 自荐信 / 求职信 | |
| Resume / CV | 简历 | |
| Salary / Compensation | 薪资 / 薪酬包 / 总包 | 总包通常包含基本薪资、奖金和期权等 |
| Interview | 面试 | |
| Hiring manager | 业务负责人 / Hiring Manager | |
| Recruiter | HR / 招聘人员 | |
| AI | AI / 人工智能 | |
| Requirements | 岗位要求 / 任职资格 | |
| Notice period | 离职通知期 / 离职周期 | 通常为 1 个月 |
| Probation | 试用期 | |
| Non-compete | 竞业限制 / 竞业协议 | |
| Social insurance | 五险一金 | 社保及住房公积金 |
| Year-end bonus | 年终奖 | |
| Stock options / RSU | 股票期权 / 限制性股票 | 简称期权/RSU |
| Hukou / Talent policy | 落户指标 / 人才政策 | |
