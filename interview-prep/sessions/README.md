# 面试记录

这里保存机器可读的面试记录，每轮面试对应一个 `.md` 文件。真实或模拟面试结束后，`interview/debrief` 和 `interview/practice` 模式会自动在此写入文件；后续分析模式会读取这些记录，具体用法由各消费方文档说明。

## 格式

使用 `**Interviewer:**` 和 `**Candidate:**` 作为发言人标签，使消费方无需重新推断说话者即可分别读取双方内容：

```markdown
---
company: Acme Corp
role: Instructional Designer
round: behavioral
date: 2026-06-01
interviewer_role: Senior HR Partner
source: debrief
---

## Q1
**Interviewer:** Tell me about a time you...
<!-- competency: stakeholder-management -->
**Candidate:** ...answer...
```

`round` 可取：`screen | hiring-manager | technical | system-design | behavioral | onsite | final`。
`source` 可取：`debrief | practice | mock | manual`。

## 能力标签（可选）

在 `**Candidate:**` 行的正上方添加 `<!-- competency: tag[, tag...] -->` 注释，可标记该回答对应的能力。标签使用小写 kebab-case，多个标签以逗号分隔。标签为可选项；缺失时，需要标签的消费方可以自行推断。

## 隐私说明（重要）

面试记录可能包含真实的面试官姓名和公司信息。该目录已被 Git 忽略，只有本 README 和 `.gitkeep` 会进入版本控制；实际面试内容不会被提交。
