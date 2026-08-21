# Mode: titles — Adjacent Job-Title Suggestions

## Purpose

The scanner only surfaces what the profile's `target_roles.primary` matches —
and that list starts from the titles the user already knows to search for.
The same job ships under many names (Solutions Architect / Forward Deployed
Engineer / Customer Engineer), so the search is silently narrower than the CV
justifies. This mode reads the CV and proposes adjacent titles the user isn't
searching for yet — then, only after explicit confirmation, writes the accepted
keywords into `config/profile.yml` so the very next `scan` casts the wider net.

`patterns` Step 1b makes the same kind of retargeting recommendation
("consider adding archetype X and broadening `target_roles.primary`"), but only after ≥5 progressed applications and only
from interview-session signal. This mode is the day-zero, CV-driven complement.
It is also the inverse of `upskill`: upskill finds skills missing for current
targets; this finds new targets reachable from current skills.

## Inputs

- `cv.md` — the **only** source of evidence for suggestions (required)
- `config/profile.yml` — `target_roles.primary`, `archetypes`, and `job_search.excluded_titles`
- `modes/_profile.md` — target roles, framing, and any deal-breakers the user has recorded
- Optional: if `data/applications.md` has ≥5 entries progressed beyond
  `Evaluated`, note which suggestions the outcome data supports (e.g. an axis
  that is already converting) — cross-reference `patterns` rather than
  duplicating its analysis.

## The Three Axes

Classify every suggestion on exactly one axis, and say which:

- **Lateral** — same work, different label. The core recall win: the user
  already does this job; the market just posts it under a name they don't
  search for.
- **Stretch** — one level up or larger scope than the CV's strongest evidence.
  Plausible, but a hiring manager would probe the gap.
- **Pivot** — an adjacent function reachable from existing CV evidence
  (e.g. heavy client-facing delivery work → pre-sales engineering).

## Output Contract (per suggestion)

For each suggested title, show exactly:

- **Title** — the market title as actually posted, not an invented hybrid
- **Axis** — Lateral / Stretch / Pivot
- **CV evidence** — 1–2 lines from `cv.md` **quoted verbatim**. If you cannot
  quote it, do not suggest it.
- **Honest gap note** — what a hiring manager would question; "none" is allowed
  for Lateral suggestions but must be earned
- **Market-reality note** — how common the title is, where it tends to be
  posted, seniority skew, or noise level

Aim for 5–10 suggestions, Lateral first. Fewer good suggestions beat a padded
list — this system optimizes for quality, not quantity.

## Filters (apply BEFORE showing suggestions)

1. **Dedup against existing coverage.** Mirror the matcher semantics in
   `scan.mjs` (`buildTitleFilter` / `compileKeyword`): the scanner lowercases
   both sides and keeps a job when any positive keyword is a
   case-insensitive substring of the title (2–3 letter keywords match on word
   boundaries instead). So drop any candidate title that an existing positive
   keyword already substring-matches — it is already covered, and suggesting
   it adds zero new recall.
2. **Deal-breaker filter.** Never suggest titles that violate the
   deal-breakers recorded in `modes/_profile.md` (e.g. "no people management"
   rules out Engineering Manager; "no on-site" rules out field roles). Titles
   matching `job_search.excluded_titles` keywords are also off the table — the user
   already excluded them.
3. **Never invent experience.** Every suggestion must be traceable to quoted
   `cv.md` lines — the source-of-truth boundary applies to suggestions exactly
   as it does to CV content. Keywords get reformulated, never fabricated. If
   the evidence isn't in `cv.md`, ask the user; don't stretch a quote to fit.

## Confirm Gate — Writing Accepted Titles (HARD RULE)

When the user accepts one or more suggestions:

1. Derive **keywords, not raw titles**. The filter matches substrings, so the
   keyword should be the shortest phrase that still identifies the role family
   ("Forward Deployed" covers Forward Deployed Engineer/Architect/Lead).
2. Attach a **breadth warning** to any substring-dangerous keyword: because
   matching is substring-based, a short or generic keyword floods the scan.
   Propose "Solutions Architect", never bare "Architect" — bare "Architect"
   would also match Data Architect, Enterprise Architect, Security Architect.
   If the user insists on a broad keyword, warn once and comply.
3. Skip keywords that duplicate existing coverage (same dedup rule as above);
   preserve the casing style already used in the user's `config/profile.yml`.
4. Show the **exact YAML diff** against `config/profile.yml` `target_roles.primary`
   before touching anything.
5. **Never write to `config/profile.yml` without explicit user confirmation.**
   "Show me the diff" is not a yes. Silence is not a yes.
6. `config/profile.yml` (user layer) is **the only file this mode writes by
   default**. This mode proposes no negative keywords — precision guards for
   noisy keywords are deferred to #1353's seniority-tier helper.
7. **Separately-confirmed exception:** accepted titles can additionally become
   `fit: adjacent` archetypes in the same profile (an existing schema
   field — see `system/config/profile.example.yml`). Mention that this is possible,
   but do it **only if the user asks** — never write archetypes by default.
   When the user does ask, that write gets its **own YAML diff and its own
   separate confirmation**; never bundle a role-keyword change and an archetype
   change into one confirmation.

## After the Write

- Suggest `/career-one scan` — the wider filter only pays off on the next scan.
- Suggest `upskill` scoped to a Stretch title the user liked, to see the gap
  map between the CV and that next-level target.

## Error Handling

- `cv.md` missing → stop and point at onboarding (`node career-one.mjs doctor --json`).
  There is no evidence base to suggest from, and inventing one is forbidden.
- `config/profile.yml` or `modes/_profile.md` missing → **hard stop**: do not
  generate suggestions. Point at onboarding (`node career-one.mjs doctor --json`) and
  stop, then re-run this mode once both files exist.
  Deal-breakers live in `modes/_profile.md` — suggestions generated without
  them can propose exactly what the user excluded.
- `target_roles.primary` empty → ask the user to confirm at least one target role
  in the profile before broadening it. A missing `portals.yml` is irrelevant.
