# Changelog

## 1.1.0-beta.3

- 恢复 `npx career-one@next` 一命令安装，按 npm 通道选择并检出不可变 GitHub Release；解析失败时停止，不回退可变分支。
- Codex 插件安装后的工作区建立本地 Git 基线，使内置更新器可以继续检查、应用与回滚系统更新。
- 完善公开插件清单、starter prompts、隐私政策、使用条款和审核测试材料。
- 新增 npm OIDC Trusted Publishing 工作流；beta 发布到 `next`，正式版保留 `latest`。

## 1.0.0

- 建立择程AI独立项目历史与 `career-one` 技术命名空间。
- 默认服务中国大陆用户，并以简体中文执行本地优先求职工作流。
- 提供 Codex Plugin、WorkBuddy Skill 和本地 Web 工作台的统一内核。
- 暂不发布 npm 或应用市场安装包，待功能验收完成后再统一发布。
