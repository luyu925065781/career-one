# career-one 安装器

[**择程AI（career-one）**](https://github.com/luyu925065781/career-one) 的一键安装器。择程AI是面向中国大陆用户的本地优先 AI 求职工作台。

```bash
npx career-one@next
```

该命令会建立一个可直接使用的工作区：

1. 将 `@next` 解析为最新 beta GitHub Release，并检出对应不可变标签。
2. 按锁文件安装根目录与 Web 依赖。

然后在该目录中打开你使用的 AI 编码工具。**首次启动时，Agent 会通过对话引导你设置简历、个人画像和目标岗位。** 无需手动编辑配置。career-one 不绑定模型，支持 Claude Code、Gemini、Codex、Qwen、OpenCode、GitHub Copilot CLI、Antigravity CLI 和 Grok Build CLI。

安装器不会在 Release 解析失败时退回可变分支。正式版发布后使用 `npx career-one@latest`；旧的 `init` 子命令仍保持兼容。

## 用法

```bash
npx career-one@next [folder]        # 默认目录：./career-one
npx career-one@next my-career       # 自定义目录
npx career-one@next init [folder]   # 兼容旧语法
npx career-one@latest [folder]      # 正式版通道
```

如需手动安装，仍可使用 `git clone`；具体步骤见[设置指南](https://github.com/luyu925065781/career-one/blob/main/docs/SETUP.md)。

## 环境要求

- Node.js 20.9+（推荐 Node.js 22 LTS 或更新的 LTS 版本）
- git

## 许可证

MIT © [NumberX](https://luyu925065781.io)
