# 择程AI Claude Code 入口

@AGENTS.md

以 `AGENTS.md` 为唯一项目规则来源，前端遵循 `system/docs/DESIGN_SYSTEM.md`，并使用 `.agents/skills/career-one/SKILL.md` 执行求职工作流。

每次会话先运行 `node doctor.mjs --json`，并以返回的 `missing`、`warnings` 和 `autoCopied` 判断初始化状态。用户自定义规则写入 `modes/_custom.md`；缺失时从 `modes/_custom.template.md` 初始化，不在本文件重复维护模式清单。
