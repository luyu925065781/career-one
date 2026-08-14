import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { resolveCli } from "@/lib/clis";
import { careerOneRoot, readMemory } from "@/lib/career-one";
import { getSession } from "@/lib/apply/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 320;

/**
 * Pull a JSON object out of an LLM's text answer, tolerating code fences,
 * trailing prose, and — crucially — TRUNCATION (the planner getting killed
 * mid-output on a big form). When the object is incomplete we salvage the
 * largest valid prefix so the fields that DID finish still come through.
 */
function extractJsonObject(text: string): { obj: Record<string, unknown> | null; truncated: boolean } {
  const s = text.replace(/```(?:json)?/gi, "");
  const start = s.indexOf("{");
  if (start === -1) return { obj: null, truncated: false };

  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end !== -1) {
    try {
      return { obj: JSON.parse(s.slice(start, end + 1)) as Record<string, unknown>, truncated: false };
    } catch {
      /* malformed even though balanced — fall through to salvage */
    }
  }

  // Truncated / unbalanced: walk back from successive commas, close the JSON,
  // and parse the largest prefix that is valid.
  const frag = s.slice(start);
  const open = (frag.match(/{/g) || []).length;
  const close = (frag.match(/}/g) || []).length;
  const pad = "}".repeat(Math.max(0, open - close));
  for (let tryEnd = frag.length; tryEnd > 1; ) {
    const cand = frag.slice(0, tryEnd).replace(/,\s*$/, "") + pad;
    try {
      return { obj: JSON.parse(cand) as Record<string, unknown>, truncated: true };
    } catch {
      const prevComma = frag.lastIndexOf(",", tryEnd - 1);
      if (prevComma <= start) break;
      tryEnd = prevComma;
    }
  }
  return { obj: null, truncated: true };
}

// AI pre-fill (STREAMING NDJSON). The user's BYO CLI (read-only PLANNER — no
// browser access) drafts an answer per field from cv.md / profile / the job's
// report. We stream a live diagnostic log of every step (spawn, heartbeats,
// exit code/signal, parse outcome) so a stuck/empty prefill is observable on the
// page AND written to <root>/.career-one-web/apply-prefill.log for debugging.
export async function POST(req: Request) {
  let body: { sessionId?: string; cliId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "请求格式不正确" }, { status: 400 });
  }
  const { sessionId, cliId } = body;
  const t0 = Date.now();
  const encoder = new TextEncoder();
  const logPath = path.join(careerOneRoot(), ".career-one-web", "apply-prefill.log");
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
  } catch {
    /* ignore */
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          /* client gone */
        }
      };
      const log = (m: string) => {
        const el = Date.now() - t0;
        emit({ t: "log", m, el });
        try {
          fs.appendFileSync(logPath, `${new Date(t0 + el).toISOString()} [+${(el / 1000).toFixed(1)}s] ${m}\n`);
        } catch {
          /* ignore */
        }
      };
      const fail = (m: string, raw?: string) => {
        log(`错误：${m}`);
        emit({ t: "error", m, raw });
        controller.close();
      };
      try {
        fs.appendFileSync(logPath, `\n===== prefill ${new Date(t0).toISOString()} session=${sessionId} cli=${cliId} =====\n`);
      } catch {
        /* ignore */
      }

      const s = sessionId ? getSession(sessionId) : undefined;
      if (!s) return fail("未找到申请会话，它可能已经过期");
      const resolved = cliId ? resolveCli(cliId) : null;
      if (!resolved) return fail(`未找到 Agent CLI“${cliId}”，请先安装或在设置中选择其他 CLI`);
      const { spec, binPath } = resolved;

      const fieldsList = s.fields
        .map((f) => `${f.id}\t${f.type}${f.required ? "*" : ""}\t${f.label}${f.options ? `\t[options: ${f.options.join(" | ")}]` : ""}`)
        .join("\n");
      const mem = readMemory().trim();
      const prompt = `You are pre-filling a job application for the user (company/role: ${s.title}). Read cv.md and config/profile.yml; if a matching report for this company exists in reports/, read it too. Ground EVERY answer in the REAL candidate — never invent facts.${mem ? `\n\nDurable notes about the user:\n${mem}` : ""}

FIELDS (id ⇥ type ⇥ label ⇥ options):
${fieldsList}

For each field give the best answer:
- identity/contact (name, email, phone, github, linkedin, location) → from profile/cv.
- free-text (Why us?, cover-letter, "most impactful thing you've built", etc.) → a concise, honest, concrete answer in the candidate's own voice (no buzzwords, active voice, real metrics only). Keep each under ~120 words.
- select/radio → choose the best-matching option using the EXACT option text from the list.
- NEVER fill legal / visa / work-authorization / salary / demographic / sensitive fields → set needs_confirmation:true and value:"".

Output ONLY a compact JSON object mapping each field id → {"value": "...", "needs_confirmation": boolean}. No prose, no markdown, no code fence.`;

      log(`表单：“${s.title}” · ${s.fields.length} 个字段 · 指令 ${prompt.length} 字符 · 用户资料 ${mem.length} 字符`);
      log(`规划 Agent：${cliId}（${binPath}）`);

      const isClaude = cliId === "claude";
      // --strict-mcp-config with no --mcp-config = load ZERO MCP servers → much
      // faster startup (skips the user's global playwright/gmail/linear/… servers
      // the planner doesn't need; it only reads local files).
      const args = isClaude
        ? ["-p", prompt, "--permission-mode", "acceptEdits", "--strict-mcp-config", "--allowedTools", "Read,Glob,Grep", "--disallowedTools", "Bash,Write,Edit,NotebookEdit,Task,WebFetch,WebSearch"]
        : spec.args(prompt);
      // Scale the timeout with form size (big forms = more drafting). Cap < maxDuration.
      const killMs = Math.min(300_000, 150_000 + s.fields.length * 6_000);
      log(`正在启动规划 Agent（超时 ${Math.round(killMs / 1000)} 秒）…`);

      const result = await new Promise<{ buf: string; code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
        // stdin = /dev/null so the CLI doesn't wait 3s for piped input.
        const child = spawn(binPath, args, { cwd: careerOneRoot(), env: process.env, stdio: ["ignore", "pipe", "pipe"] });
        let buf = "";
        let firstByteAt = 0;
        const hb = setInterval(() => {
          log(`…已运行 ${Math.round((Date.now() - t0) / 1000)} 秒 · 已接收 ${buf.length} 个字符`);
        }, 4000);
        child.stdout.on("data", (d: Buffer) => {
          if (!firstByteAt) {
            firstByteAt = Date.now();
            log(`首次收到输出：${Math.round((firstByteAt - t0) / 1000)} 秒`);
          }
          buf += d.toString();
        });
        child.stderr.on("data", (d: Buffer) => {
          const e = d.toString().trim();
          if (e) log(`CLI 错误输出：${e.slice(0, 160).replace(/\s+/g, " ")}`);
        });
        const killer = setTimeout(() => {
          log("已达到超时时间，正在终止任务");
          try {
            child.kill("SIGTERM");
          } catch {
            /* ignore */
          }
        }, killMs);
        child.on("close", (code, signal) => {
          clearTimeout(killer);
          clearInterval(hb);
          resolve({ buf, code, signal });
        });
        child.on("error", (e) => {
          clearTimeout(killer);
          clearInterval(hb);
          log(`启动失败：${e.message}`);
          resolve({ buf, code: null, signal: null });
        });
      });

      log(`规划 Agent 已退出：代码=${result.code}，信号=${result.signal} · 共 ${result.buf.length} 个字符`);
      log(`输出开头：${result.buf.slice(0, 100).replace(/\s+/g, " ") || "（空）"}`);
      log(`输出末尾：${result.buf.slice(-100).replace(/\s+/g, " ") || "（空）"}`);

      if (!result.buf.trim()) {
        return fail(result.signal ? "规划 Agent 在输出前被终止，请重试或减少表单字段" : "规划 Agent 没有返回内容，请确认所选 CLI 能在当前目录正常运行");
      }

      const { obj, truncated } = extractJsonObject(result.buf);
      if (!obj) {
        return fail(
          result.signal ? "规划 Agent 在回答途中被终止，表单可能过大或处理过慢，未能恢复任何字段" : "无法将规划 Agent 的回答解析为 JSON",
          result.buf.slice(-300),
        );
      }
      const count = Object.keys(obj).length;
      log(`已解析 ${count} 个答案${truncated ? "（从截断输出中恢复，部分字段可能缺失）" : ""}`);
      emit({ t: "done", answers: obj, truncated, count });
      controller.close();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
