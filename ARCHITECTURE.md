# Architecture

A high-level map of how career-one is put together. For the precise system/user file boundary, see [DATA_CONTRACT.md](DATA_CONTRACT.md); for contribution mechanics, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Principles

Career-One is built on three commitments that every design decision serves:

- **Local-first.** Everything runs on your machine against your files. No account required, no server in the loop for the core tool.
- **AI-agnostic.** The logic lives in Markdown prompt files under `modes/`, executed by whatever AI coding CLI you use (Claude Code, Codex, OpenCode, Gemini, Qwen, Grok, Antigravity) or by standalone Node scripts. No single model is hardcoded.
- **Human-in-the-loop.** The tool prepares and evaluates; the human reviews and clicks. It never submits applications on your behalf.

## The two layers (the data contract)

The single most important architectural rule: **system files** and **user files** are strictly separated.

- **System layer** — the tool itself: `modes/`, `scripts/`, templates, the dashboard. These are versioned and updated by `update-system.mjs`. Listed in `SYSTEM_PATHS`.
- **User layer** — your data: `cv.md`, `config/profile.yml`, `modes/_profile.md`, `data/`, `reports/`, `jds/`, etc. The updater **never** touches these. Listed in `USER_PATHS`.

`DATA_CONTRACT.md` is the source of truth for this boundary, and `tests/system/updater-migration.test.mjs` enforces that no system path ever overlaps a user path.

## Files are canonical — databases are derived

Settled doctrine ([#918](https://github.com/luyu925065781/career-one/issues/918)): the human-readable, git-diffable files (`data/applications.md`, `reports/`, `data/pipeline.md`) are the **permanent source of truth**. SQLite exists only as a derived index (fast queries, reindex-on-delete) and will never become a primary store — not even opt-in. The reason is ecosystem-wide: the web UI, the Go dashboard, community plugins, and thousands of fork scripts all read the files; a second canonical store would force every reader to support two modes forever. Performance work is welcome **on the derived layer**; the files stay the brain.

## Stable root, grouped internals

The repository root is a public navigation surface, so it keeps only documentation, machine-discovery files, and five stable Node entrypoints: `career-one.mjs`, `doctor.mjs`, `start-web.mjs`, `test-all.mjs`, and `update-system.mjs`. Implementations live under `scripts/<domain>/`; tests live under `tests/<domain>/`.

`career-one.mjs` is the stable user and integration boundary (`node career-one.mjs scan`, `node career-one.mjs tracker`, and so on). Internal paths may evolve without forcing users to memorize them. `update-system.mjs` remains at the root as the cross-version bootstrap anchor and explicitly prunes tracked legacy root scripts after a successful layout migration.

## Component map

```
AI coding CLI  ─┐
(or scripts)    │  reads prompt files
                ▼
   modes/*.md  ──────────────►  the "brain": scoring, evaluation,
   (_shared.md = scoring core)   apply, scan, interview, etc. prompts
                │
   ┌────────────┼─────────────────────────────────────────────┐
   ▼            ▼                  ▼               ▼            ▼
 discover          evaluate          generate         track       update
 scripts/scan/     oferta.md         PDFs/CVs/        data/        update-
 providers/        (+evaluators)     cover letters    reports/     system.mjs
```

### Discovery — `scripts/scan/` + `providers/`
Finds jobs from **open, no-auth public sources**. The stable command is `node career-one.mjs scan`; its zero-token implementation calls public ATS APIs and RSS/JSON boards via per-board modules in `providers/`. Auth-gated/login-required sources are intentionally out of core. Results land in `data/pipeline.md`.

### Evaluation — `modes/oferta.md` + `modes/_shared.md`
The heart of the tool. `oferta.md` defines the A–G evaluation blocks; `_shared.md` defines the 1–5 scoring system, archetype detection, posting-legitimacy signals, and global rules. The AI reads these plus your `cv.md` and produces a structured report.

**Standalone evaluators** under `scripts/integrations/` let you run the same scoring without an interactive CLI, against cheaper/local models.

### Generation — PDFs, CVs, cover letters
Generation implementations live under `scripts/generate/`; ATS-safe templates live in `templates/` and `fonts/`. Use the stable `pdf`, `latex`, `build-cv-latex`, and `cover-letter` commands exposed by `career-one.mjs`.

### Tracking — `data/` + `reports/` + tracker scripts
Every evaluated offer is registered. `data/applications.md` is the canonical tracker table; `reports/{NNN}-{company}-{date}.md` holds full evaluations. Implementations under `scripts/tracker/` keep it consistent (atomic writes + a SQLite index), while `career-one.mjs` exposes stable tracker commands.

### Liveness — never evaluate a dead posting
Implementations under `scripts/liveness/` verify a posting is still open (zero-token) before it costs evaluation time.

### Self-update — `update-system.mjs`
Safely pulls new system files from upstream without touching user data. It backs up, fetches, re-execs the target updater (resolving its import closure so a new import can't break the upgrade), then checks out only `SYSTEM_PATHS`. `BOOTSTRAP_PATHS` covers very old installs.

### Multi-CLI entry files
Each CLI reads its own entry file, all of which point at the canonical `AGENTS.md`: `CLAUDE.md` (full), and thin `@AGENTS.md` redirect wrappers `OPENCODE.md`, `CODEX.md`, `GEMINI.md`, plus the `.agents/skills/` skill entrypoints. This is the [open agent skill standard](https://agentskills.io).

### Dashboard (optional)
A standalone Go TUI under `dashboard/` for browsing the pipeline. Isolated from the core — never required.

### Distribution — one Skill, thin platform packages

`.agents/skills/career-one/` is the single source of truth for Agent behavior. Its portable CLI initializes and locates local workspaces without calling a model. `distribution/build-packages.mjs` combines that Skill with an allowlisted runtime snapshot and emits:

- a Codex Plugin under `dist/marketplaces/codex/career-one/`;
- an uploadable WorkBuddy Skill package under `dist/marketplaces/workbuddy/`.

The builder filters every user-layer path defined in `distribution/runtime-paths.mjs`. Generated packages contain system rules, scripts, templates, and empty data directories only; they never contain a CV, profile, portals configuration, reports, or application history. Platform packages may add manifests and UI metadata, but they must not fork the Skill's business logic.

## Data flow (a typical run)

```
scan ──► data/pipeline.md ──► evaluate (oferta + cv) ──► reports/NNN-*.md
                                          │                      │
                                          └──► data/applications.md (tracker)
                                                         │
                                          apply (human reviews + clicks)
```

## Quality gates

- `test-all.mjs` — the full suite across scoring, scan, tracker, PDF, security, updater, and recursively discovered `tests/**/*.test.mjs` files.
- `tests/system/updater-migration.test.mjs` — enforces the system/user boundary and safe cross-version upgrades.
- CI: `test` + CodeQL are required; CodeRabbit reviews every PR; Renovate keeps deps current.

## Where to start reading

- The boundary → `DATA_CONTRACT.md`
- The scoring → `modes/_shared.md` + `modes/oferta.md`
- Adding a job source → an existing module in `providers/` (mirror it)
- The updater → `update-system.mjs`
