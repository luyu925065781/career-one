# Mode: agent-inbox — Queue requests for the next session

A durable bridge between *looking at* the pipeline and *acting on* it. career-one
runs from an AI session, but there's no place to drop a request when you're not
in one. The agent inbox is that place: an append-only checklist
(`data/agent-inbox.md`) that any tool — this CLI, a dashboard button, a cron job,
or you by hand — can append to, and that the agent drains at the start of a
session.

Local-first, human-in-the-loop, zero dependencies: **nothing here auto-submits.**
Queued items are *intents* for the agent to action and the user to review.

## Queue a request

```bash
node career-one.mjs agent-inbox add "evaluate https://acme.com/jobs/42"
node career-one.mjs agent-inbox add "draft a follow-up for application #7"
node career-one.mjs agent-inbox add "run a scan and triage anything new"
```

## Inspect / resolve

```bash
node career-one.mjs agent-inbox list            # pending items
node career-one.mjs agent-inbox list --all      # include resolved items
node career-one.mjs agent-inbox resolve 1 --result "scored 4.3 — report 012"
node career-one.mjs agent-inbox resolve --task run-pdf-012 --result "PDF generated"
```

`data/agent-inbox.md` is user-layer (gitignored). Items look like:

```markdown
- [ ] 2026-06-21 09:30 — evaluate https://acme.com/jobs/42
- [ ] 2026-06-21 09:35 — [task:run-pdf-012] generate tailored CV PDF for report #012
- [x] 2026-06-20 18:05 — run a scan → result: 3 new, 1 worth evaluating
```

## Agent protocol (when the user invokes this mode, or at session start)

1. Read `data/agent-inbox.md`. If it doesn't exist or has no unchecked items,
   say so and stop.
2. Run each **unchecked** item top-to-bottom by routing it to the right mode
   (a URL → `auto-pipeline`; "follow-up" → `followup`; "scan" → `scan`; etc.).
3. If an item contains `[task:<id>]`, it already has a shared Web/Agent run.
   Resume that exact ID with `agent-runs.mjs progress`; do not create a second
   run. Complete or fail the same ID so Web can show the live state and result.
4. After each, mark it `[x]` and append `→ result: <one line>` — either by hand,
   with `node career-one.mjs agent-inbox resolve <n> --result "..."`, or for a shared run
   with `node career-one.mjs agent-inbox resolve --task <id> --result "..."`.
5. Items that need **live user input** (a mock interview, a pasted transcript, a
   decision, anything that would submit an application) → do **not** run them;
   ask the user to start them instead. The inbox never bypasses human review.

This mode pairs naturally with a dashboard: a "queue this" button writes to the
same file and shared run registry. Web is responsible for viewing, confirming,
managing, and replaying the work; the user's Agent is responsible for
understanding, deciding, generating, and modifying.
