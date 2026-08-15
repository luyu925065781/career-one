import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { resolveCli } from "@/lib/clis";
import { careerOneRoot, careerOneSystemRoot, readMemory, rootScript } from "@/lib/career-one";
import { acquireTrackerWrite, releaseTrackerWrite } from "@/lib/core/run-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800; // a real oferta evaluation is heavy and multi-step

// The web ORCHESTRATES the real career-one engine — it does NOT reimplement it.
// kind "evaluate" runs the REAL Chinese modes and persists the canonical
// artifacts (A–F report + tracker row) via the SAME scripts the CLI uses
// (reserve-report-num.mjs → reports/ → batch/tracker-additions/ → merge-tracker.mjs),
// so a web evaluation is byte-identical to a CLI one (single source of truth, no
// drift). kind "research" stays read-only. Streams progress as NDJSON events.
function buildPrompt(
  kind: string,
  input: string,
  memory: string,
  today: string,
): string {
  const mem = memory.trim() ? `\n\nDurable notes about the user (from their profile):\n${memory.trim()}\n` : "";
  if (kind === "research") {
    return `你正在用户自己的电脑上调研其作品或项目，以提炼与求职相关的真实优势。使用 WebFetch 读取 URL，或读取用户明确引用的本地文件。用简体中文说明：它是什么、价值在哪里、能支持哪些岗位或简历表达。保持具体、诚实，不得虚构。${mem}

End with EXACTLY one final line: VERDICT: {0-5 signal strength}/5 — {why it helps their search, ≤12 words}

Target: ${input}`;
  }
  if (kind === "fix-portal") {
    return `A company's job-portal ATS slug is BROKEN — career-one can no longer scan it, so it silently disappears from every future scan. Repair it (headless, on the user's machine):
1. Run \`node career-one.mjs verify-portals --add "${input}"\` — it probes Greenhouse/Ashby/Lever for the company's correct ATS slug and prints the suggested ats + slug.
2. Open portals.yml, find the "${input}" entry under tracked_companies, and update its careers_url (and any api/slug field) to the suggested WORKING ATS URL. Change ONLY this one company; preserve all other YAML structure, comments and formatting exactly.
3. Re-run \`node career-one.mjs verify-portals\` and confirm "${input}" now shows ✅ live (not ❌).
If NO slug variant resolves, say so clearly and leave portals.yml unchanged. Never touch any other company.

End with EXACTLY one final line: VERDICT: {5 if now live, else 1}/5 — {what you changed, ≤12 words}`;
  }
  // evaluate (default) — run the REAL oferta mode + persist canonically
  return `你正在用户自己的电脑上运行 career-one 正式岗位评估。今天是 ${today}。必须使用真实模式和评分规则，不得自创评分。

1. 读取 modes/zh/_shared.md 和 modes/zh/oferta.md，并严格遵循其中 A-F、岗位真实性 G 和 Machine Summary 规则。读取 cv.md、article-digest.md、config/profile.yml 和 modes/_profile.md，只依据该用户的真实事实判断匹配度。使用 WebFetch 读取岗位，并在报告头标记 \`Verification: unconfirmed (batch mode)\`。所有分析与报告正文使用简体中文。

2. Persist the result CANONICALLY so the web and the CLI share ONE source of truth:
   a. Reserve a report number: run \`node career-one.mjs reserve-report-num\` — its stdout is a 3-digit number (e.g. 035).
   b. Write the full report to reports/{num}-{company-slug}-${today}.md  (company-slug = company lowercased, non-alphanumerics → hyphens).
   c. Append ONE row of 9 TAB-separated columns to batch/tracker-additions/{num}-{company-slug}.tsv, in THIS exact order (real \\t tabs, status BEFORE score):
      {num}\t${today}\t{Company}\t{Role}\t{CanonicalStatus e.g. Evaluated}\t{score}/5\t❌\t[{num}](reports/{num}-{company-slug}-${today}.md)\t{one-line note}
   d. Merge into the tracker: run \`node career-one.mjs merge\` (it dedupes by company+role+report-num, validates the status, and writes data/applications.md — NEVER edit applications.md by hand).

3. NEVER submit an application, fill no forms, contact no one. This is evaluation + persistence ONLY.${mem}

After everything above is written and merged, output EXACTLY one final line, nothing after it:
VERDICT: {score}/5 — {reason in 12 words or fewer}

Posting URL: ${input}`;
}

export async function POST(req: Request) {
  let body: { kind?: string; input?: string; cliId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "请求格式不正确" }), { status: 400 });
  }
  const { kind = "evaluate", input, cliId } = body;
  if (kind === "pdf") {
    return Response.json(
      { error: "定制简历必须由用户自己的 Agent 生成；Web 只负责创建待办和展示结果" },
      { status: 409 },
    );
  }
  if (!input || !cliId) {
    return new Response(JSON.stringify({ error: "缺少任务内容或 Agent CLI 配置" }), { status: 400 });
  }
  const resolved = resolveCli(cliId);
  if (!resolved) {
    return new Response(JSON.stringify({ error: `未找到 Agent CLI“${cliId}”，请先安装或在设置中选择其他 CLI` }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { spec, binPath } = resolved;

  // These run the REAL core (modes/scripts), not just data — fail clearly if the
  // root is incomplete instead of faking it.
  const required = kind === "evaluate"
    ? path.join(careerOneSystemRoot(), "modes", "oferta.md")
    : kind === "fix-portal"
      ? rootScript("verify-portals")
      : null;
  if (required && !fs.existsSync(required)) {
    return new Response(
      JSON.stringify({
        error: `当前工作区缺少完整的择程AI系统文件（${path.relative(careerOneSystemRoot(), required)}）。请将 CAREER_ONE_SYSTEM_ROOT 指向完整项目目录。`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // An A–F score is meaningless without a CV to score against — the CLI would
  // hallucinate a fit narrative and still emit a VERDICT. Require cv.md first.
  if (kind === "evaluate" && !fs.existsSync(path.join(careerOneRoot(), "cv.md"))) {
    return new Response(
      JSON.stringify({ error: "请先添加简历，再进行岗位评估。你可以在看板首页上传或粘贴简历内容。" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const prompt = buildPrompt(kind, input, readMemory(), today);

  const isClaude = cliId === "claude";
  const needsWorkspaceWrite = kind === "evaluate" || kind === "fix-portal";
  const needsLiveSearch = kind === "evaluate" || kind === "research";
  // Tool scope by kind (comma-separated lists; disallowedTools is the hard
  // guardrail). 'evaluate' runs the REAL mode + persists canonical artifacts →
  // it needs Write + Bash (reserve-report-num / merge-tracker / write the
  // report). 'research' stays read-only. Task (sub-agents) is always blocked
  // (runaway cost). NEVER auto-submits — that is a prompt-level guarantee.
  const tools =
    kind === "evaluate" || kind === "fix-portal"
      ? {
          allowed: "Read,WebFetch,WebSearch,Write,Edit,Bash,Glob,Grep",
          disallowed: "Task,NotebookEdit",
        }
      : { allowed: "Read,WebFetch,WebSearch,Glob,Grep", disallowed: "Bash,Write,Edit,NotebookEdit,Task" };
  const args = isClaude
    ? ["-p", prompt, "--output-format", "stream-json", "--verbose", "--include-partial-messages",
       "--permission-mode", "acceptEdits",
       "--allowedTools", tools.allowed,
       "--disallowedTools", tools.disallowed]
    : spec.args(prompt, { workspaceWrite: needsWorkspaceWrite, liveSearch: needsLiveSearch });

  // For write-needing kinds, snapshot reports/ so we can verify the worker
  // actually persisted instead of trusting a final message.
  const reportsDir = path.join(careerOneRoot(), "reports");
  const listReports = () => {
    try {
      return fs.readdirSync(reportsDir).filter((f) => f.endsWith(".md"));
    } catch {
      return [];
    }
  };
  const persists = kind === "evaluate";
  const reportsBefore = new Set(persists ? listReports() : []);
  // Tracker-mutating runs hold a write token so a row delete can't race their merge
  // (tracker.mjs delete doesn't yet share a lock with merge-tracker — see run-registry).
  const writeToken = kind === "evaluate" ? acquireTrackerWrite() : null;

  const child = spawn(binPath, args, { cwd: careerOneRoot(), env: process.env });
  const enc = new TextEncoder();

  // `closed` + kill timer in the OUTER scope so cancel() (client disconnect) can
  // flip `closed` before the child's late handlers run, and send() is try/catch'd —
  // otherwise a late enqueue onto a closed controller throws uncaught (see #1155).
  let closed = false;
  let killer: ReturnType<typeof setTimeout> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let buf = "";
      let emittedText = false; // any assistant text delta → the CLI actually ran
      let sawError = false;
      let lastTokens = 0; // per-run token cost when the selected CLI emits usage
      let lastCostUsd: number | null = null;
      const killMs = 285_000;
      killer = setTimeout(() => {
        try { child.kill("SIGTERM"); } catch { /* ignore */ }
      }, killMs);
      const send = (obj: unknown) => {
        if (closed) return;
        try { controller.enqueue(enc.encode(JSON.stringify(obj) + "\n")); } catch { closed = true; }
      };
      const close = () => {
        if (!closed) {
          closed = true;
          if (killer) clearTimeout(killer);
          if (writeToken !== null) releaseTrackerWrite(writeToken);
          try { controller.close(); } catch { /* */ }
        }
      };

      child.stdout.on("data", (d: Buffer) => {
        if (closed) return;
        if (!isClaude) {
          emittedText = true;
          send({ type: "text", text: d.toString() });
          return;
        }
        buf += d.toString();
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          try {
            const ev = JSON.parse(line);
            if (ev.type === "stream_event") {
              const e = ev.event;
              if (e?.type === "content_block_start" && e.content_block?.type === "tool_use") {
                send({ type: "tool", name: e.content_block.name });
              } else if (e?.type === "content_block_delta" && e.delta?.text) {
                emittedText = true;
                send({ type: "text", text: e.delta.text });
              }
            } else if (ev.type === "system" && ev.subtype === "init") {
              send({ type: "status", label: "Agent 已就绪" });
            } else if (ev.type === "result") {
              // Capture the per-run cost; the authoritative "done" is sent on close
              // (so the honesty gate decides done-vs-error first). Tokens include
              // input, output, and cache-creation usage reported by this run.
              const u = ev.usage || {};
              lastTokens = (u.input_tokens || 0) + (u.output_tokens || 0) + (u.cache_creation_input_tokens || 0);
              if (typeof ev.total_cost_usd === "number") lastCostUsd = ev.total_cost_usd;
            }
          } catch {
            /* partial line */
          }
        }
      });
      child.stderr.on("data", (d: Buffer) => {
        const s = d.toString();
        // Widened: auth/login/quota failures are the most common real error and
        // the old narrow regex missed them (silent false "success").
        if (/error|denied|fatal|not found|unauthorized|forbidden|auth|login|credential|api[ -]?key|quota|rate limit|not authenticated/i.test(s)) {
          sawError = true;
          send({ type: "error", msg: s.trim().slice(0, 200) });
        }
      });
      child.on("error", (e) => { send({ type: "error", msg: e.message }); close(); });
      child.on("close", (code) => {
        const newReports = persists ? listReports().filter((file) => !reportsBefore.has(file)).slice(0, 5) : [];
        const wroteReport = newReports.length > 0;
        const cleanExit = code === 0; // non-zero OR null (killed/signal) = NOT clean
        // Honesty gate (#9): a green "done" with a parsed score requires a CLEAN exit,
        // real output, AND (for evaluations) a report actually written. Anything else
        // is surfaced — an errored run must never be banked as a confident score.
        if (!emittedText && !sawError && !cleanExit) {
          send({ type: "error", msg: "Agent CLI 异常退出。请确认所选 CLI 已安装并完成登录，然后重试。" });
        } else if (!emittedText && !sawError) {
          send({ type: "error", msg: "Agent CLI 没有返回任何内容。请确认所选 CLI 已安装并完成登录，然后重试。" });
        } else if (persists && !wroteReport) {
          // The worker ran but never wrote the report/tracker row (e.g. a CLI
          // without file-write authorization) — surface it instead of a fake score.
          send({ type: "error", msg: "本次岗位评估未保存报告，因此没有加入求职进度。请确认所选 CLI 拥有当前工作区的写入权限，然后重试。" });
        } else if (!cleanExit || sawError) {
          // Produced output (maybe even a report) but did NOT finish cleanly — flag it
          // instead of recording a confident score off a half-finished run.
          send({ type: "error", msg: "本次任务在完成前发生错误，结果未被记录。请重试以确认结果。" });
        } else {
          const artifacts = newReports.map((file) => {
            const reportId = String(parseInt(file, 10));
            return {
              path: `reports/${file}`,
              label: "岗位评估报告",
              page: /^\d+$/.test(reportId) ? `/pipeline/${reportId}?view=report` : "/pipeline",
            };
          });
          send({ type: "done", tokens: lastTokens, costUsd: lastCostUsd, artifacts });
        }
        close();
      });
    },
    cancel() {
      closed = true;
      if (killer) clearTimeout(killer);
      if (writeToken !== null) releaseTrackerWrite(writeToken);
      try { child.kill("SIGTERM"); } catch { /* ignore */ }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
