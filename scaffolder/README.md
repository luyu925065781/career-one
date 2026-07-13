# career-one

One-command installer for [**择程AI（career-one）**](https://github.com/luyu925065781/career-one), a local-first AI job-search workspace for China mainland users.

```bash
npx career-one init
```

This sets up a ready-to-use workspace:

1. Clones career-one at the latest stable release
2. Installs dependencies

Then open your AI coding tool in the folder. **On first launch the agent walks you through setup — your CV, profile and target roles — just by chatting.** Nothing to configure by hand. career-one is AI-agnostic — Claude Code, Gemini, Codex, Qwen, OpenCode, GitHub Copilot CLI, Antigravity CLI, and Grok Build CLI all work.

The installer bootstraps CLI skill entrypoints after clone, so new CLIs (e.g. Grok) work even when `npx` pulled an older release tag.

## Usage

```bash
npx career-one init [folder]   # default folder: ./career-one
```

Prefer the manual route? `git clone` still works exactly as before — see the [setup guide](https://github.com/luyu925065781/career-one/blob/main/docs/SETUP.md).

## Requirements

- Node.js 18+
- git

## License

MIT © [NumberX](https://luyu925065781.io)
