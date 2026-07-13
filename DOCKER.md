# Running career-one in Docker

Use this when the host can't install Playwright/Chromium directly (e.g. Ubuntu
26.04, NixOS without the `playwright-driver` shell, locked-down corporate
laptops). The image is based on Microsoft's official Playwright image, which
ships Chromium preinstalled and works on any Linux kernel Docker supports.

No feature is dropped: PDF generation, scanner, liveness checker, dashboard
(Go), batch workers, update system — everything runs inside the container.
Your project directory is bind-mounted, so reports, CVs, profile, tracker, and
all generated artifacts live on the host as before.

## Prerequisites

- Docker Engine 24+ with the Compose plugin (`docker compose version`)
- ~2 GB free disk for the image

## First-time setup

```bash
# from project root
./career-one-docker up           # builds image (first run takes a few minutes) and starts container
./career-one-docker doctor       # confirms node + playwright + chromium + go are present
```

That's it. Container stays running in the background. Re-runs are instant.

## Daily use

The `./career-one-docker` wrapper forwards any command into the container.

| Task | Command |
|------|---------|
| Health check | `./career-one-docker doctor` |
| Verify pipeline | `./career-one-docker verify` |
| Generate PDF | `./career-one-docker pdf output/cv.html output/cv.pdf` |
| Scan portals | `./career-one-docker scan` |
| Check liveness | `./career-one-docker liveness <url>` |
| Merge tracker | `./career-one-docker merge` |
| Dedup tracker | `./career-one-docker dedup` |
| Normalize statuses | `./career-one-docker normalize` |
| Update check | `./career-one-docker update:check` |
| Apply update | `./career-one-docker update` |
| Rollback | `./career-one-docker rollback` |
| Interactive shell | `./career-one-docker shell` |
| Raw node script | `./career-one-docker node check-liveness.mjs <url>` |
| Build dashboard | `./career-one-docker bash -c 'cd dashboard && go build -buildvcs=false -o career-dashboard . && ./career-dashboard --path ..'` |

Unknown subcommands fall through to `docker compose exec` so anything works:

```bash
./career-one-docker npm test
./career-one-docker bash -c 'find reports -name "*.md" | wc -l'
```

## Lifecycle

```bash
./career-one-docker up        # start (idempotent)
./career-one-docker down      # stop and remove the container (volumes kept)
./career-one-docker rebuild   # full rebuild (use after Dockerfile or deps change)
./career-one-docker logs      # tail container logs
```

## How it works

- `Dockerfile` — installs Node, Playwright/Chromium (preinstalled in base image),
  Go (for the dashboard), LaTeX (for `generate-latex.mjs`), and project deps.
- `docker-compose.yml` — bind-mounts the project at `/app` so host edits appear
  inside the container immediately. `node_modules` lives in a named volume to
  avoid host/container ABI mismatches.
- `.dockerignore` — keeps generated and personal data out of the build context.

## API keys

Drop your keys in `.env` at the project root or export them in the shell that
runs `./career-one-docker`. The compose file forwards `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`,
and `OPENAI_API_KEY` into the container.

```bash
echo "GEMINI_API_KEY=..." >> .env
./career-one-docker gemini:eval
```

## Data persistence

Everything under the project root is on your host filesystem:

- `cv.md`, `config/profile.yml`, `modes/_profile.md`, `portals.yml`
- `data/applications.md`, `data/pipeline.md`, `data/scan-history.tsv`
- `reports/`, `output/`, `interview-prep/`, `jds/`

Nothing important is stored inside the container. `./career-one-docker down` is safe.

## Updating

Career-One updates work the same as native:

```bash
./career-one-docker update:check
./career-one-docker update
```

If `package.json` deps change, run `./career-one-docker rebuild` once to refresh the image
layer that holds `node_modules`.

## Troubleshooting

**`docker: not found`** — install Docker Engine + Compose plugin first.

**Playwright still complains** — you're running the host's Node, not the
container's. Always go through `./career-one-docker`.

**Permission errors on generated files** — the container runs as root by
default. If host files end up root-owned, either:
- run `sudo chown -R "$USER" .` once, or
- add `user: "${UID}:${GID}"` to `docker-compose.yml` (export `UID`/`GID`
  in your shell first).

**Slow first build** — base image is ~1.5 GB. Subsequent builds reuse layers
and finish in seconds.
