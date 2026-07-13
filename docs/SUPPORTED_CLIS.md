# 支持的 Agent 与 CLI

择程AI不绑定单一模型或 Agent。项目和 Skill 的技术标识为 `career-one`：共享规则位于 `AGENTS.md`，主 Skill 位于 `.agents/skills/career-one/SKILL.md`，各工具入口只负责适配加载方式。

| Agent / CLI | 入口 | 调用方式 |
| --- | --- | --- |
| Claude Code | `CLAUDE.md` + `.claude/skills/career-one/` | `claude`，然后使用 `/career-one` 或中文自然语言 |
| Codex | `CODEX.md` + `.agents/skills/career-one/` | `codex`；只读用 `codex exec`，写入任务增加 `--sandbox workspace-write` |
| WorkBuddy / CodeBuddy Code | WorkBuddy 技能包或 `.agents/skills/career-one/` | 上传 `dist/marketplaces/workbuddy/career-one-workbuddy.zip`；本机可通过 `codebuddy -p` 无头调用 |
| TRAE | `.agents/skills/career-one/` 或 `.trae/skills/career-one/` | 设置页选择 TRAE；本机通过 `trae-cli run "中文任务"` 调用 |
| OpenCode | `OPENCODE.md` + `.opencode/skills/career-one/` | `opencode`，然后使用 `/career-one` |
| Antigravity CLI | `AGENTS.md` + `.antigravitycli/skills/career-one/` | `agy`，然后使用 `/career-one` |
| Grok Build CLI | `AGENTS.md` + `.grok/skills/career-one/` | `grok`，然后使用 `/career-one` |
| Qwen | `AGENTS.md` + `.qwen/skills/career-one/` | `qwen` 或 `qwen -p "中文任务"` |
| Kimi | `.kimi/skills/career-one/` | `kimi` 后使用中文自然语言 |
| GitHub Copilot CLI | `AGENTS.md` | `copilot -p "中文任务"` |
| Gemini | `GEMINI.md` | 使用 Gemini CLI 或中文自然语言调用 |

WorkBuddy 桌面端目前没有公开的独立 `workbuddy` 无头命令。择程AI设置页使用同一腾讯产品体系的 CodeBuddy Code CLI（`codebuddy -p`）作为可执行适配层；WorkBuddy 桌面端仍可直接打开本项目并使用其中的 Skill。

## 构建 Codex 与 WorkBuddy 安装包

```bash
npm run build:distributions
npm run test:distributions
```

Codex Plugin 输出到 `dist/marketplaces/codex/career-one/`。WorkBuddy 上传包输出到 `dist/marketplaces/workbuddy/career-one-workbuddy.zip`。两者都从 `.agents/skills/career-one/` 构建，不维护平台专属求职规则。
