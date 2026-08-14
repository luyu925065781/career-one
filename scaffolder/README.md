# career-one 安装器

[**择程AI（career-one）**](https://github.com/luyu925065781/career-one) 的一键安装器。择程AI是面向中国大陆用户的本地优先 AI 求职工作台。

```bash
npx career-one init
```

该命令会建立一个可直接使用的工作区：

1. 检出 career-one 的最新稳定版本。
2. 安装依赖。

然后在该目录中打开你使用的 AI 编码工具。**首次启动时，Agent 会通过对话引导你设置简历、个人画像和目标岗位。** 无需手动编辑配置。career-one 不绑定模型，支持 Claude Code、Gemini、Codex、Qwen、OpenCode、GitHub Copilot CLI、Antigravity CLI 和 Grok Build CLI。

检出代码后，安装器会初始化 CLI Skill 入口，因此即使 `npx` 拉取的是较旧发布标签，新加入的 CLI（例如 Grok）也能正常使用。

## 用法

```bash
npx career-one init [folder]   # 默认目录：./career-one
```

如需手动安装，仍可使用 `git clone`；具体步骤见[设置指南](https://github.com/luyu925065781/career-one/blob/main/docs/SETUP.md)。

## 环境要求

- Node.js 20.9+（推荐 Node.js 22 LTS 或更新的 LTS 版本）
- git

## 许可证

MIT © [NumberX](https://luyu925065781.io)
