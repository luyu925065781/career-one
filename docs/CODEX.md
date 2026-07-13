# 择程AI Codex 使用指南

择程AI通过开放 Skill 和 `AGENTS.md` 支持 Codex。项目、Skill 和命令的技术标识为 `career-one`，默认使用简体中文与中国大陆招聘语境，所有简历和求职数据保存在当前工作区。

## Codex 如何加载择程AI

- `AGENTS.md` 是项目共享规则源。
- 根目录 `CODEX.md` 是导入 `AGENTS.md` 的轻量入口。
- `.agents/skills/career-one/SKILL.md` 是主 Skill。

## 交互式 Codex

在项目根目录启动：

```bash
cd career-one
codex
```

Codex 不一定显示 `/career-one` 斜杠命令。不可用时直接用中文自然语言调用：

```text
使用择程AI评估这个岗位：https://company.com/jobs/123
扫描新岗位并用中文总结匹配结果。
处理 data/pipeline.md 中待评估的岗位。
为最近评估的岗位生成定制简历。
为最近评估的岗位起草求职邮件，只生成草稿，不发送。
查看并总结当前求职进度。
```

## 一次性任务

只读任务使用 `codex exec`：

```bash
codex exec "使用择程AI扫描新岗位并用中文总结。"
codex exec "查看并总结当前求职进度。"
```

需要写入报告、投递记录或 PDF 时，显式授予工作区写权限：

```bash
codex exec --sandbox workspace-write --search "使用择程AI评估这个岗位：https://company.com/jobs/123"
codex exec --sandbox workspace-write --search "处理 data/pipeline.md 中待评估的岗位。"
codex exec --sandbox workspace-write "为最近评估的岗位生成定制简历。"
codex exec "为最近评估的岗位起草求职邮件，只生成草稿，不发送。"
```

需要读取在线岗位或调研公司时使用 `--search`；纯本地任务不需要。

## 注意事项

- 如果 Codex 显示斜杠命令，使用 `/career-one`。
- 未显示斜杠命令时，使用自然语言或 `codex exec` 即可。
- `scan`、`pipeline` 和 `apply` 等浏览器流程仍依赖当前 Agent 可用的浏览器工具。
- Skill 不会替用户提交申请、发送消息或点击最终确认按钮。
