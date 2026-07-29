# career-one web (alpha)

An **experimental, opt-in web UI** for career-one. It is a local-first *view* over
the exact same files the CLI reads and writes (`data/pipeline.md`,
`data/applications.md`, `reports/`, `config/`): no parallel engine, no separate
database, no server. If you never run it, nothing about your CLI workflow changes.

> **Status: alpha.** Expect rough edges. Feedback →
> [Discussion #1142](https://github.com/luyu925065781/career-one/discussions/1142) ·
> roadmap context → [Discussion #156](https://github.com/luyu925065781/career-one/discussions/156).

## Quick start

Requires Node 20+.

```bash
npm ci --prefix web
npm run dev:web
```

Open http://localhost:3301. The app reads the career-one checkout it lives in
(the parent directory) — your existing CV, pipeline and reports appear as-is.

## What works today

- **Pipeline** — your tracker as a sortable, filterable table; status changes
  write back through the core's own scripts.
- **Explore** — the free reverse-ATS scan with an honest partial-dataset
  indicator, plus AI-assisted discovery (bring your own CLI/keys).
- **Apply** — assisted form prefill with a hard rule inherited from the core:
  **it never submits for you** — you always press the button.
- **Today / Analytics / CV / Config** — action queue, funnel, CV editing with
  preview, settings.

## Safety

- **Local-first:** the local web app runs entirely on your machine — no cloud,
  no account needed. Your CV and data stay in your own files.
- **Never auto-submits:** the apply flow drafts and prefills; submitting is
  always a human action.
- **Additive:** the web is isolated from the core's packaging, CI and release
  automation. The CLI works exactly the same without it.

## Development

```bash
npm run dev:web                  # scripted dev server on port 3301
npm run typecheck --prefix web   # typecheck
npm run build --prefix web       # production build
```

Set `CAREER_ONE_ROOT=/path/to/checkout` in `web/.env.local` to point the app at
a different career-one directory (useful for testing against sample data).
