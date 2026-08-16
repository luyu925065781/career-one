# Scripts Reference

Public commands use the stable root entry `career-one.mjs` or `npm run <name>`. Implementations are grouped under `scripts/<domain>/`; callers should not depend on those internal paths.

## Quick Reference

| Command | Script | Purpose |
|---------|--------|---------|
| `npm run doctor` | `doctor.mjs` | Validate setup prerequisites |
| `npm run verify` | `scripts/system/verify-pipeline.mjs` | Check pipeline data integrity |
| `npm run normalize` | `scripts/tracker/normalize-statuses.mjs` | Fix non-canonical statuses |
| `npm run dedup` | `scripts/tracker/dedup-tracker.mjs` | Remove duplicate tracker entries |
| `npm run merge` | `scripts/tracker/merge-tracker.mjs` | Merge batch TSVs into applications.md |
| `npm run pdf` | `scripts/generate/generate-pdf.mjs` | Convert HTML to ATS-optimized PDF |
| `node career-one.mjs build-cv-latex` | `scripts/generate/build-cv-latex.mjs` | Build .tex from structured JSON payload |
| `npm run sync-check` | `scripts/system/cv-sync-check.mjs` | Validate CV/profile consistency |
| `npm run patterns` | `scripts/analysis/analyze-patterns.mjs` | Analyze tracker outcomes and report patterns |
| `npm run add` | `scripts/application/add-entry.mjs` | Dedup + insert a `/career-one add` entry into cv.md / article-digest.md |
| `npm run update:check` | `update-system.mjs check` | Check for upstream updates |
| `npm run update` | `update-system.mjs apply` | Apply upstream update |
| `npm run rollback` | `update-system.mjs rollback` | Rollback last update |
| `npm run liveness` | `scripts/liveness/check-liveness.mjs` | Test if job URLs are still active |
| `npm run extract` | `scripts/liveness/browser-extract.mjs` | Headless read-only page extractor (opt-in `scan.extractor: cli`) — compact JSON for scan/JD |
| `npm run scan` | `scripts/scan/scan.mjs` | Zero-token portal scanner |
| `npm run scan:full` | `scripts/scan/scan-ats-full.mjs` | Reverse ATS discovery scanner |
| `npm run validate:portals` | `scripts/system/validate-portals.mjs` | Validate portals.yml shape before scanning |
| `npm run tracker` | `scripts/tracker/tracker.mjs` | SQLite derived index over applications.md — sync/query/history/export |
| `npm run find` | `scripts/tracker/find.mjs` | Resolve a report#/tracker#/company query to its full pipeline identity |
| `npm run invite-match` | `scripts/tracker/invite-match.mjs` | Fuzzy-match a pasted interview-invite email against `data/applications.md` |
| `node career-one.mjs agent-inbox` | `scripts/agent/agent-inbox.mjs` | Queue and resolve durable Agent requests |
| `node career-one.mjs run` | `scripts/agent/agent-runs.mjs` | Share task status and artifacts between Agent and Web |

---

## doctor

Validates that all prerequisites are in place: Node.js >= 20.9, dependencies installed, Playwright chromium, required files (`cv.md`, `config/profile.yml`, `portals.yml`), fonts directory, and auto-creates `data/`, `output/`, `reports/` if missing.

```bash
npm run doctor
```

**Exit codes:** `0` all checks passed, `1` one or more checks failed (fix messages printed).

---

## verify

Health check for pipeline data integrity. Validates `data/applications.md` against nine rules: canonical statuses (per `templates/states.yml`), no duplicate company+role pairs, all report links point to existing files, scores match `X.XX/5` / `N/A` / `DUP`, rows have proper pipe-delimited format, no pending TSVs in `batch/tracker-additions/`, no markdown bold in scores, no two `reports/*.md` files covering the same company+role, and no orphan reports without a tracker row (#1425). The report checks are warning-level: duplicate reports can be legitimate (re-evaluation after a JD change), so they never fail the run.

```bash
npm run verify
```

**Exit codes:** `0` pipeline clean (zero errors), `1` errors found. Warnings (e.g. possible duplicates) do not cause a non-zero exit.

---

## normalize

Maps non-canonical statuses to their canonical equivalents and strips markdown bold and dates from the status column. Aliases like `Enviada` become `Aplicado`, `CERRADA` becomes `Descartado`, etc. DUPLICADO info is moved to the notes column.

```bash
npm run normalize             # apply changes
npm run normalize -- --dry-run  # preview without writing
```

Creates a `.bak` backup of `applications.md` before writing.

**Exit codes:** `0` always (changes or no changes).

---

## dedup

Removes duplicate entries from `applications.md` by grouping on normalized company name + fuzzy role match. Keeps the entry with the highest score. If a removed entry had a more advanced pipeline status, that status is promoted to the keeper.

```bash
npm run dedup             # apply changes
npm run dedup -- --dry-run  # preview without writing
```

Creates a `.bak` backup before writing.

**Exit codes:** `0` always.

---

## merge

Merges batch tracker additions (`batch/tracker-additions/*.tsv`) into `applications.md`. Handles 9-column TSV, 8-column TSV, and pipe-delimited markdown formats. Detects duplicates by report number, entry number, and company+role fuzzy match. Higher-scored re-evaluations update existing entries in place.

```bash
npm run merge                 # apply merge
npm run merge -- --dry-run    # preview without writing
npm run merge -- --verify     # merge then run verify-pipeline
```

Processed TSVs are moved to `batch/tracker-additions/merged/`.

**Exit codes:** `0` success, `1` verification errors (with `--verify`).

---

## validate:portals

Validates `portals.yml` before running the scanner. The validator is offline: it reads YAML, loads local provider IDs from `providers/*.mjs`, and checks common configuration mistakes without fetching any job boards.

It reports errors for invalid YAML shape, unknown explicit providers, malformed URLs, empty filter keywords, and invalid local parser blocks. Duplicate enabled company names are warnings because they may be intentional during migrations, but they are worth reviewing.

```bash
npm run validate:portals
npm run validate:portals -- --file templates/portals.example.yml
node career-one.mjs validate-portals --self-test
```

**Exit codes:** `0` no errors (warnings allowed), `1` one or more errors found.

---

## pdf

Renders an HTML file to a print-quality, ATS-parseable PDF via headless Chromium. Resolves font paths from `fonts/`, normalizes Unicode for ATS compatibility (em-dashes, smart quotes, zero-width characters), and reports page count and file size.

```bash
npm run pdf -- input.html output.pdf
npm run pdf -- input.html output.pdf --format=letter   # US letter
npm run pdf -- input.html output.pdf --format=a4        # A4 (default)
```

**Exit codes:** `0` PDF generated, `1` missing arguments or generation failure.

---

## Agent inbox and shared runs

Web does not launch an Agent CLI for reasoning or PDF generation. It queues a
short request in `data/agent-inbox.md` and creates the same task in
`data/agent-runs.json`; the user's Codex, WorkBuddy, or other Agent resumes that
task ID. Web then reads the shared registry to display queued, running,
completed, failed, approval, and artifact states.

```bash
node career-one.mjs agent-inbox list
node career-one.mjs run progress <task-id> --label "Agent 已接手任务"
node career-one.mjs run complete <task-id> --summary "已生成定制简历" \
  --artifact "output/example.pdf|定制简历|application/pdf"
node career-one.mjs agent-inbox resolve --task <task-id> --result "已生成定制简历"
```

Items with `[task:<id>]` must resume the existing shared task instead of
creating a duplicate. Agent owns understanding, decisions, generation, and
modification; Web owns viewing, confirmation, management, and replay.

---

## build:latex

Builds a `.tex` file from a structured JSON payload, handling template merge and LaTeX escaping automatically. The JSON is produced by the agent during evaluation — this script replaces the manual LaTeX generation step in `modes/latex.md`.

```bash
node career-one.mjs build-cv-latex input.json output.tex
node career-one.mjs build-cv-latex --test
```

**Exit codes:** `0` file generated, `1` missing inputs, invalid JSON, unresolved placeholders, or template not found.

---

## sync-check

Validates that the career-one setup is internally consistent: `cv.md` exists and is not too short, `config/profile.yml` exists with required fields, no hardcoded metrics in `modes/_shared.md` or `batch/batch-prompt.md`, and `article-digest.md` freshness (warns if older than 30 days).

```bash
npm run sync-check
```

**Exit codes:** `0` no errors (warnings allowed), `1` errors found.

---

## patterns

Analyzes application outcomes, scores, archetypes, blockers, remote policy, and company size from `data/applications.md` and linked reports. New reports should include `## Machine Summary` YAML; `analyze-patterns.mjs` uses it first and falls back to legacy markdown parsing for older reports.

```bash
npm run patterns
npm run patterns -- --summary
npm run patterns -- --min-threshold 3
node career-one.mjs patterns --self-test
```

**Exit codes:** `0` analysis succeeded, `1` insufficient data or parser self-test failure.

---

## salary-gap

Folds compensation observations into per-application desired/advertised/actual values and gap aggregates. Sources: `reports/*.md` Machine Summary `advertised_comp` (advertised, source `jd` — historical reports backfill automatically), `data/salary-observations.tsv` (desired/actual, append-only), and `config/profile.yml` `compensation.target_range` (desired default). Fold precedence: highest trust tier wins, then latest date (`actual`: contract > offer-letter > recruiter-verbal > user). Aggregates group by (company, role) and per currency — no FX conversion. Unparseable amounts, orphaned tracker numbers, sample sizes, and staleness are always reported.

```bash
node career-one.mjs salary-gap             # JSON
node career-one.mjs salary-gap --summary   # table + data-quality section
node career-one.mjs salary-gap --self-test
```

Observation line format (TSV, one per line, `#`-prefixed lines are comments):

```text
{tracker#}\t{YYYY-MM-DD}\t{desired|advertised|actual}\t{amount}\t{currency}\t{source}\t{note}
```

Amounts: number + optional k/K suffix, ranges allowed ("80-90k"), annual gross unless noted. Sources: jd | profile | user | recruiter-verbal | offer-letter | contract.

**Exit codes:** `0` always (missing sources produce an explanatory empty result), `1` self-test failure.

---

## update:check

Checks whether a newer version of career-one is available upstream. Outputs JSON to stdout:

```bash
npm run update:check
```

Possible JSON responses:

| `status` | Meaning |
|----------|---------|
| `up-to-date` | Local version matches remote |
| `update-available` | Newer version exists (includes `local`, `remote`, `changelog`) |
| `dismissed` | User dismissed the update prompt |
| `offline` | Could not reach GitHub |

**Exit codes:** `0` always.

---

## update

Applies the upstream update. Creates a timestamped backup branch (`backup-pre-update-<version>-<YYYYMMDDTHHMMSSZ>`), fetches from the canonical repo, checks out only system-layer files, runs `npm install`, and commits. The timestamp is derived from UTC ISO time with separators and milliseconds removed (for example, `backup-pre-update-1.8.1-20260608T071302Z`). User-layer files (`cv.md`, `config/profile.yml`, `data/`, etc.) are never touched.

```bash
npm run update
```

**Exit codes:** `0` success, `1` lock conflict or safety violation.

---

## rollback

Restores system-layer files from the most recent backup branch created during an update. Rollback prefers the newest timestamped branch matching `backup-pre-update-<version>-<YYYYMMDDTHHMMSSZ>` and still accepts legacy `backup-pre-update-<version>` branches for older installs.

```bash
npm run rollback
```

**Exit codes:** `0` success, `1` no backup branch found or git error.

---

## liveness

Tests whether job posting URLs are still live using headless Chromium. Detects expired patterns (e.g. "job no longer available"), HTTP 404/410, ATS redirect patterns, and apply-button presence. Supports multi-language expired patterns (English, German, French).

```bash
npm run liveness -- https://example.com/job/123
npm run liveness -- https://a.com/job/1 https://b.com/job/2
npm run liveness -- --file urls.txt
```

Each URL gets a verdict: `active`, `expired`, or `uncertain` with a reason.

**Exit codes:** `0` all URLs active, `1` any expired or uncertain.

---

## scan

Zero-token portal scanner. Runs configured local parsers for SSR/static career pages and hits ATS APIs (Greenhouse, Ashby, Lever) directly — no LLM tokens consumed. Reads `portals.yml` for target companies, outputs matching listings to stdout, and optionally appends to `data/pipeline.md`.

`scan_history.recheck_after_days` in `portals.yml` lets old `added` URLs become eligible for recheck after the configured number of days. If absent, scan-history dedup keeps the historical behavior and dedups forever. Permanent invalid statuses such as blocked host and malformed URL remain permanent.

For custom SSR pages, configure a tracked company with `scan_method: local_parser` and a `parser` block. The parser can be written in JavaScript, Python, or any language available as a local executable. Company-specific parsers usually already know their source URL and only need to print JSON jobs to stdout:

```yaml
parser:
  command: node
  script: scripts/parsers/example-company-jobs.js
  format: jobs-json-v1
```

Use `args` only for reusable parsers that intentionally accept runtime parameters such as `{careers_url}` or `{company}`.

If a parser writes full extraction artifacts for debugging or audit, store them under `data/parser-output/{company}/`. `scan.mjs` reads stdout and does not require those JSON files after parsing. Keep generated JSON artifacts out of git; `.gitkeep` placeholders are the only exception for preserving directory structure.

```bash
npm run scan
```

**Exit codes:** `0` scan completed, `1` configuration error or no portals.yml found.

---

## scan:full

Reverse ATS discovery scanner. Where `scan.mjs` scans the companies you track in `portals.yml`, this inverts the direction: it walks public directories of companies per ATS (Greenhouse, Lever, Ashby, Workday) and surfaces fresh postings matching your `portals.yml` `title_filter` / `location_filter` — no manual company curation. Company directories come from the public [job-board-aggregator](https://github.com/Feashliaa/job-board-aggregator) dataset, cached in `data/cache/` for 24 hours.

Postings without a usable publish date are skipped — a reverse scan is only useful for fresh postings. New matches are appended to `data/pipeline.md` and `data/scan-history.tsv` in the same format as `scan.mjs`.

```bash
npm run scan:full                              # all ATS directories, last 3 days
node career-one.mjs scan-full --since 7               # postings from the last 7 days
node career-one.mjs scan-full --ats greenhouse,workday # subset of sources
node career-one.mjs scan-full --limit 200             # max companies per ATS
node career-one.mjs scan-full --dry-run               # preview without writing
node career-one.mjs scan-full --liveness              # Playwright-verify matches first
node career-one.mjs scan-full --md-out notes/scans    # also write a dated markdown digest
```

**Exit codes:** `0` scan completed, `1` configuration error (no portals.yml, unknown `--ats` source) or fatal scan error.

---

## tracker

SQLite **derived index** for the applications tracker (RFC #918, phase 1). `data/applications.md` stays the source of truth; `data/applications.db` is built from it by `sync` and is safe to delete at any time — it regenerates on the next sync. All writes keep going to the markdown exactly as today (`merge-tracker.mjs`, hand edits); the index is read-only infrastructure.

Why: at hundreds of rows a markdown table degrades structurally (encoding corruption, column drift, `|` inside cells shifting columns), and agents grepping it get model-dependent results. The index normalizes on sync, so a query returns the same rows for every model on every CLI — and corruption is detected at sync time instead of propagating silently.

Zero new dependencies — uses `node:sqlite`, built into Node ≥ 22.5.

```bash
node career-one.mjs tracker sync                     # (re)build applications.db from applications.md
node career-one.mjs tracker sync --check             # diagnose corruption only, no write (exit 1 if issues found)
node career-one.mjs tracker query --status Applied --since 2026-05-01
node career-one.mjs tracker query --company acme --json
node career-one.mjs tracker history --id 42          # status transitions observed across syncs (Applied → Interview → ...)
node career-one.mjs tracker export                   # inverse: index → canonical markdown table on stdout
node career-one.mjs tracker export --out repaired.md # write to a file (existing file backed up to .bak first)
```

`query` and `history` auto-resync when the markdown changed since the last sync, so the index can never serve stale reads.

`sync` detects and reports the corruption classes markdown accumulates — mojibake placeholder cells, scores stranded in the status column, non-canonical statuses (resolved via `templates/states.yml` aliases), missing/duplicate ids, stray pipes — and normalizes them **in the index only**; the markdown is never modified. Fix at the source with `normalize-statuses.mjs` / `dedup-tracker.mjs`, then re-sync. Status changes between syncs accumulate in a `status_events` table, which gives `analyze-patterns.mjs` a real funnel instead of only the current snapshot.

`export` is the inverse of `sync` (round-trip `md → db → md` is lossless for clean input — enforced by `test-all.mjs`). It writes to stdout by default and never touches `applications.md` unless you explicitly pass it as `--out`. Phase 2 of #918 (DB becomes source of truth, markdown becomes a rendered view) is a separate, explicit per-user opt-in — not part of this script yet.

**Exit codes:** `0` success, `1` validation error, missing prerequisites (Node < 22.5, no `applications.md` to index), or corruption found by `sync --check`.

---

## find

Resolves a report number, tracker number, or company/role fragment to its full pipeline identity: company, role, tracker#, report#, canonical status, PDF path (from `data/pdf-index.tsv`), and report path. "Apply to #13" is ambiguous — report numbers and tracker row numbers diverge — and answering it used to require opening three files; this does it in one read-only lookup.

Zero dependencies, strictly read-only. Numeric queries match **both** the tracker # column and the report number from the Report link (`012` and `12` are the same number), so collisions between the two numbering schemes surface as multiple rows instead of a silent wrong pick. Text queries match company/role by case-insensitive substring, with the shared fuzzy matcher (`role-matcher.mjs`) as fallback for multi-word phrases.

```bash
node career-one.mjs find 13                # report# OR tracker# 13 — shows both if they differ
node career-one.mjs find acme              # company fragment
node career-one.mjs find "data engineer"   # role phrase (fuzzy via role-matcher)
node career-one.mjs find acme --json       # machine-readable output
```

Multiple matches print as a table; zero matches print a clean message.

**Exit codes:** `0` at least one match, `1` no match, missing query, or no `applications.md`.

---

## stats.mjs

Aggregates lifetime pipeline stats into one JSON report. Stats include tracker, scanner, portals, follow-ups and runs. Reads from data/applications.md, data/scan-history.tsv, portals.yml, data/follow-ups.md and data/scan-runs.tsv. If a file doesn't exist yet, the section turns into null.

```bash
node career-one.mjs stats --summary             # returns human-readable table
node career-one.mjs stats                       # returns json
```
On a fresh clone, with no data yet, the JSON format is as follows:

```
{
  "metadata": {
    "generatedAt": "2026-07-07",
    "sources": {
      "tracker": false,
      "scanHistory": false,
      "followups": false,
      "portals": false,
      "scanRuns": false
    }
  },
  "tracker": null,
  "funnel": null,
  "scan": null,
  "portals": null,
  "followups": null,
  "runs": null
}
```

With --summary it returns:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pipeline Stats — 2026-07-07
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tracker:    — no data (data/applications.md missing)
Scanner:    — no data (data/scan-history.tsv missing)
Portals:    — no data (portals.yml missing)
Follow-ups: — no data (data/follow-ups.md missing)
Runs:       — no data (data/scan-runs.tsv missing; created by the next scan)
```

---

## data/scan-runs.tsv

`scan.mjs` appends one row to this file after each non-dry scan run, recording how many companies/boards it checked, how many postings it found vs. filtered out vs. flagged as duplicates vs. added, and how many errors occurred. `--dry-run` scans never write to this file. Stats appended include:

* `timestamp` — ISO timestamp of the scan
* `status` — always `completed` for now
* `companies` — number of companies scanned this run
* `boards` — number of job boards scanned this run
* `found` — total postings found
* `filtered_title` — filtered out by title mismatch
* `filtered_tier` — filtered out by tier
* `filtered_location` — filtered out by location
* `filtered_salary` — filtered out by salary
* `filtered_content` — filtered out by content
* `filtered_cooldown` — skipped because you recently applied to the same company + role and are still in the waiting period
* `dupes` — duplicate postings skipped
* `new_added` — new postings actually added to the pipeline
* `errors` — number of errors during the run

As the project is in continuous development, to parse for a stat we recommend doing it by column header instead of position.
