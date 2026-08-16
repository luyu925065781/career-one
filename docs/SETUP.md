# Setup Guide

## Prerequisites

- An AI coding CLI — [Claude Code](https://claude.ai/code), Gemini CLI, Codex, Qwen Code, OpenCode, GitHub Copilot CLI, Antigravity CLI, or Grok Build CLI (see [Supported CLIs](SUPPORTED_CLIS.md))
- [Node.js](https://nodejs.org) 20.9+ and `git` (`npx` ships with Node — the installer refuses to run without them); Node.js 22 LTS or a newer LTS release is recommended
- (Optional) Go 1.21+ (for the dashboard TUI)

## Quick Start

### Public beta — `v1.1.0-beta.3`

The fastest public-beta install is:

```bash
npx career-one@next
cd career-one
codex   # or claude / gemini / qwen / opencode / agy / grok
```

The installer resolves the `next` npm tag to the newest beta GitHub Release, checks out that immutable tag, and installs the root and Web dependencies from their lockfiles. It fails closed rather than silently falling back to a mutable branch. After the stable release, use `npx career-one@latest`.

For a downloadable Agent package, open the `v1.1.0-beta.3` GitHub Prerelease, download `SHA256SUMS.txt`, and choose the matching asset:

- Codex: `career-one-codex.zip`
- WorkBuddy: `career-one-workbuddy.zip`

For any supported Agent CLI, clone the same immutable tag:

```bash
git clone --branch v1.1.0-beta.3 --depth 1 https://github.com/luyu925065781/career-one.git
cd career-one
npm ci --ignore-scripts
(cd web && npm ci)
codex   # or claude / gemini / qwen / opencode / agy / grok
```

Verify downloaded Release assets from the directory containing the ZIP files and `SHA256SUMS.txt`:

```bash
shasum -a 256 -c SHA256SUMS.txt
```

On Linux, use `sha256sum -c SHA256SUMS.txt`. Release tags and checksums are the authoritative fallback when npm is unavailable.

**On first launch, career-one walks you through setup by chatting** — it asks for your CV, your details (name, target roles, salary), and sets up the job scanner with pre-configured companies. Nothing to edit by hand: just answer its questions. Then paste a job offer URL or description and it evaluates it, writes a report, generates a tailored PDF, and tracks it.

If you are using Codex, start the interactive session with `codex`. Slash commands are not guaranteed in Codex, so use the same mode names in a prompt if `/career-one` is unavailable:

```text
Evaluate this JD with career-one auto-pipeline: https://company.com/jobs/123
Run the career-one scan mode.
Run the career-one pipeline mode.
Run the career-one pdf mode.
Run the career-one email mode for the latest evaluated role. Draft only; never sends, submits, or clicks.
Run the career-one tracker mode.
```

For one-shot workers or batch tasks in Codex, use `codex exec`. See [docs/CODEX.md](CODEX.md) for the full guide.

```bash
codex exec "Evaluate this JD with career-one auto-pipeline: https://company.com/jobs/123"
codex exec "Run career-one scan mode in this repo."
codex exec "Run career-one pipeline mode for data/pipeline.md."
codex exec "Run career-one pdf mode for the latest evaluated role."
codex exec "Run career-one email mode for the latest evaluated role. Draft only; do not send, submit, or click anything."
codex exec "Run career-one tracker mode and summarize the current statuses."
```

### Advanced — follow another branch

<details>
<summary>Prefer to clone the repo yourself?</summary>

```bash
git clone --branch develop https://github.com/luyu925065781/career-one.git
cd career-one
npm ci --ignore-scripts
(cd web && npm ci)
```

Then open your AI CLI in the folder — the same first-run onboarding applies. Use this path if you want to track a specific branch, contribute, or audit the code before installing dependencies.

</details>

### PDF rendering (one-time)

PDFs are rendered with a headless Chromium. Install it once per machine:

```bash
npx playwright install chromium
```

## Available Commands

| Action | How |
|--------|-----|
| Evaluate an offer | Paste a URL or JD text |
| Search for offers | `/career-one scan` or ask the agent to run `scan` |
| Process pending URLs | `/career-one pipeline` or ask the agent to run `pipeline` |
| Generate a PDF | `/career-one pdf` or ask the agent to run `pdf` |
| Draft application email | `/career-one email` or ask the agent to run `email`; draft-only, never sends, submits, or clicks |
| Batch evaluate | `/career-one batch` or use `codex exec "Run career-one batch mode ..."` |
| Check tracker status | `/career-one tracker` or ask the agent to run `tracker` |
| Fill application form | `/career-one apply` or ask the agent to run `apply` |

## Verify Setup

```bash
node career-one.mjs sync-check      # Check configuration
node career-one.mjs verify     # Check pipeline integrity
```

## Build Dashboard (Optional)

```bash
npm run serve:dashboard     # Opens TUI pipeline viewer
npm run build:dashboard     # Optional: build the standalone binary
```
