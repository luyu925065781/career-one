# Data Contract

This document defines which files belong to the **system** (auto-updatable) and which belong to the **user** (never touched by updates).

## User Layer (NEVER auto-updated)

These files contain your personal data, customizations, and work product. Updates will NEVER modify them.

| File | Purpose |
|------|---------|
| `cv.md` | Your CV in markdown |
| `config/profile.yml` | Your identity, targets, comp range, and reusable job-search intent |
| `modes/_profile.md` | Your archetypes, narrative, negotiation scripts |
| `modes/_custom.md` | Your house rules, custom workflows & output preferences (procedural — survives updates) |
| `voice-dna.md` | Your writing voice guardrail — banned words, anti-AI-slop rules, tone (optional) |
| `article-digest.md` | Your proof points from portfolio |
| `interview-prep/story-bank.md` | Your accumulated STAR+R stories |
| `interview-prep/{company}-{role}.md` | Company-specific interview prep reports (written by `/career-one interview-prep`) |
| `interview-prep/sessions/*.md` | Interview sessions — real transcripts + mock sessions (sensitive: real names/companies; gitignored). Drives `patterns` Step 1b targeting signal and `interview-redflag` analysis. |
| `portals.yml` | Optional advanced job sources: platforms, company career pages, ATS providers, and source-specific rules |
| `config/plugins.yml` | Your plugin activation toggles (opt-in; seeded from `config/plugins.example.yml`) |
| `plugins.local/` | Your own / private plugins (never auto-updated) |
| `plugins.lock` | Integrity pins + recorded consent for your enabled plugins (generated; never auto-updated) |
| `data/applications.md` | Your application tracker (source of truth) |
| `data/applications.db` | Derived query index over `applications.md` (SQLite, rebuilt by `node career-one.mjs tracker sync` — safe to delete) |
| `data/pipeline.md` | Your URL inbox |
| `data/scan-history.tsv` | Your scan history |
| `data/scan-runs.tsv` | Your per-run scan counters (appended by `scan.mjs`, read by `stats.mjs`) |
| `data/follow-ups.md` | Your follow-up history |
| `data/agent-runs.json` | Local Agent/Web task history, progress, artifacts, and approval references |
| `data/task-attachments/*` | Local screenshots attached to Agent tasks; retained for report traceability until the user removes them |
| `data/offers/*` | Your received offers/contracts, promise notes, prep reports, and reply drafts (PII — gitignored, written by the `offer-prep` mode) |
| `data/salary-observations.tsv` | Your append-only compensation observation log: `{tracker#}\t{date}\t{desired\|advertised\|actual}\t{amount}\t{currency}\t{source}\t{note}`. Written by interactive modes when a figure is stated/confirmed; never edited in place. Advertised figures come from reports' `advertised_comp` instead — reports are themselves observation sources. Read by `salary-gap.mjs` |
| `writing-samples/*` | Your personal writing samples for style calibration |
| `reports/*` | Your evaluation reports |
| `output/*` | Your generated PDFs and local pending-change proposal drafts |
| `jds/*` | Your saved job descriptions |

The visible setup journey is `cv.md` → `config/profile.yml` / `modes/_profile.md` → `interview-prep/story-bank.md`, followed by direct job evaluation. The story bank is guided but does not block evaluation of a JD the user already supplied. `portals.yml` is optional and must not be treated as an onboarding prerequisite.

## System Layer (safe to auto-update)

These files contain system logic, scripts, templates, and instructions that improve with each release.

| File | Purpose |
|------|---------|
| `modes/_shared.md` | Scoring system, global rules, tools |
| `modes/_custom.template.md` | Template seed for the user's `modes/_custom.md` |
| `modes/oferta.md` | Evaluation mode instructions |
| `modes/pdf.md` | PDF generation instructions |
| `modes/scan.md` | Portal scanner instructions |
| `modes/batch.md` | Batch processing instructions |
| `modes/apply.md` | Application assistant instructions |
| `modes/auto-pipeline.md` | Auto-pipeline instructions |
| `modes/contacto.md` | LinkedIn outreach instructions |
| `modes/email.md` | Formal application email draft instructions |
| `modes/deep.md` | Research prompt instructions |
| `modes/regional/*` | Regional market calibration modes |
| `modes/ofertas.md` | Comparison instructions |
| `modes/pipeline.md` | Pipeline processing instructions |
| `modes/project.md` | Project evaluation instructions |
| `modes/tracker.md` | Tracker instructions |
| `modes/training.md` | Training evaluation instructions |
| `modes/patterns.md` | Pattern analysis instructions |
| `modes/titles.md` | Adjacent job-title suggestion instructions |
| `modes/followup.md` | Follow-up cadence instructions |
| `modes/offer-prep.md` | Offer-stage contract reading companion instructions |
| `modes/interview/*` | Interview prep planning, practice, and debrief skills |
| `modes/de/*` | German language modes |
| `modes/fr/*` | French language modes |
| `modes/hi/*` | Hindi language modes |
| `modes/ja/*` | Japanese language modes |
| `modes/pl/*` | Polish language modes |
| `modes/pt/*` | Portuguese language modes |
| `modes/ru/*` | Russian language modes |
| `modes/heuristics/*` | Shared candidate-facing application heuristics |
| `CLAUDE.md` | Root Agent discovery instruction |
| `system/compat/agents/*` | Generated compatibility instructions for additional Agent CLIs |
| `AGENTS.md` | Canonical agent instructions (imported by CLI-specific wrappers) |
| `career-one.mjs`, `update-system.mjs` | Stable tracked root entrypoints |
| `system/compat/*` | Generated local compatibility entrypoints such as doctor, Web launcher and full test runner |
| `scripts/*` | Grouped implementation scripts for Agent tasks, analysis, applications, generation, liveness, plugins, scan, system and tracker operations |
| `plugins/` | Bundled plugins + the plugin engine (opt-in external integrations) |
| `scripts/plugins/plugins.mjs` | Plugin CLI implementation (public command: `node career-one.mjs plugins`) |
| `system/plugins-registry/` | Curated community plugins, one `<id>.json` per plugin (the trust root) |
| `scripts/plugins/plugin-install.mjs`, `scripts/plugins/plugin-audit.mjs`, `scripts/plugins/validate-plugin-registry.mjs` | Plugin install/audit/registry-validation utilities |
| `system/config/plugins.example.yml` | Plugin activation template (seed for `config/plugins.yml`) |
| `system/batch/batch-prompt.md` | Batch worker prompt |
| `system/batch/batch-runner.sh` | Batch orchestrator |
| `system/dashboard/*` | Go TUI dashboard |
| `system/compat/start-web.mjs` | Local Web workbench launcher and contextual page opener |
| `web/src/*`, `web/public/*`, `web/package*.json`, `web/*.mjs`, `web/tsconfig.json` | Web workbench source, assets, configuration, and dependency lockfile |
| `system/templates/*` | Base templates |
| `system/fonts/*` | Self-hosted fonts |
| `.agents/skills/*` | Canonical open Agent Skill definitions |
| `system/distribution/*` | Cross-platform package builder, runtime allowlist, and distribution tests |
| `system/packages/codex-plugin/*` | Codex plugin source manifest; generated packages live under ignored `dist/` |
| `.claude/skills/*`, `.opencode/skills/*`, `.qwen/skills/*`, `.antigravitycli/skills/*`, `.grok/skills/*` | Generated local Agent discovery copies; not tracked in source |
| `system/docs/*` | Documentation |
| `VERSION` | Current version number |
| `system/docs/DATA_CONTRACT.md` | This file |

## The Rule

**If a file is in the User Layer, no update process may read, modify, or delete it.**

**If a file is in the System Layer, it can be safely replaced with the latest version from the upstream repo.**
