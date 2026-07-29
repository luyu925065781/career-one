import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { NextResponse } from "next/server";
import { careerOneRoot, rootScript } from "@/lib/career-one";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Artifact = { path?: unknown; label?: unknown; page?: unknown };
type Body = {
  action?: unknown;
  id?: unknown;
  intent?: unknown;
  title?: unknown;
  subtitle?: unknown;
  source?: unknown;
  input?: unknown;
  page?: unknown;
  progress?: unknown;
  summary?: unknown;
  score?: unknown;
  error?: unknown;
  artifacts?: unknown;
  proposalId?: unknown;
  instruction?: unknown;
};

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function pushOption(args: string[], name: string, value: unknown) {
  const normalized = text(value);
  if (normalized) args.push(name, normalized);
}

function runContract(args: string[]): unknown {
  const script = rootScript("agent-runs");
  if (!fs.existsSync(script)) throw new Error("当前工作区缺少 Agent 任务协议，请更新择程AI");
  const output = execFileSync(process.execPath, [script, ...args, "--workspace", careerOneRoot()], {
    cwd: careerOneRoot(),
    encoding: "utf8",
    timeout: 15_000,
    maxBuffer: 3 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(output);
}

function runInbox(args: string[]): string {
  const script = rootScript("agent-inbox");
  if (!fs.existsSync(script)) throw new Error("当前工作区缺少 Agent 待办协议，请更新择程AI");
  return execFileSync(process.execPath, [script, ...args], {
    cwd: careerOneRoot(),
    encoding: "utf8",
    timeout: 15_000,
    maxBuffer: 512 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const stderr = typeof (error as { stderr?: unknown })?.stderr === "string" ? (error as { stderr: string }).stderr : "";
  const detail = stderr.trim().split("\n").at(-1) || message;
  return NextResponse.json({ error: detail.replace(/^择程AI：/, "") }, { status: 400 });
}

export async function GET(req: Request) {
  const proposalId = new URL(req.url).searchParams.get("proposalId");
  try {
    const result = proposalId ? runContract(["proposal", proposalId]) : runContract(["list"]);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const action = text(body.action);
  const id = text(body.id);
  try {
    if (action === "queue") {
      const instruction = text(body.instruction)?.slice(0, 1_000);
      if (!instruction) {
        return NextResponse.json({ error: "缺少交给 Agent 的任务指令" }, { status: 400 });
      }
      const args = ["queue"];
      pushOption(args, "--id", id);
      pushOption(args, "--intent", body.intent);
      pushOption(args, "--title", body.title);
      pushOption(args, "--subtitle", body.subtitle);
      pushOption(args, "--source", body.source || "web");
      pushOption(args, "--input", body.input);
      pushOption(args, "--page", body.page);
      pushOption(args, "--instruction", instruction);
      const run = runContract(args) as { id?: string };
      if (!run.id) throw new Error("Agent 待办任务创建失败");
      try {
        runInbox(["add", `[task:${run.id}] ${instruction}`]);
      } catch (error) {
        try {
          runContract(["fail", run.id, "--error", "写入 Agent 待办失败"]);
        } catch {
          // Preserve the original inbox error.
        }
        throw error;
      }
      return NextResponse.json({ ...run, instruction });
    }
    if (action === "start") {
      const args = ["start"];
      pushOption(args, "--id", id);
      pushOption(args, "--intent", body.intent);
      pushOption(args, "--title", body.title);
      pushOption(args, "--subtitle", body.subtitle);
      pushOption(args, "--source", body.source || "web");
      pushOption(args, "--input", body.input);
      pushOption(args, "--page", body.page);
      return NextResponse.json(runContract(args));
    }
    if (action === "progress" && id) {
      return NextResponse.json(runContract(["progress", id, "--label", text(body.progress) || "执行中"]));
    }
    if (action === "complete" && id) {
      const args = ["complete", id];
      pushOption(args, "--summary", body.summary);
      pushOption(args, "--page", body.page);
      if (body.score !== undefined && body.score !== null) args.push("--score", String(body.score));
      if (Array.isArray(body.artifacts)) {
        for (const artifact of body.artifacts as Artifact[]) {
          const artifactPath = text(artifact?.path);
          if (!artifactPath) continue;
          args.push("--artifact", [artifactPath, text(artifact.label) || artifactPath, text(artifact.page) || ""].join("|"));
        }
      }
      return NextResponse.json(runContract(args));
    }
    if (action === "fail" && id) {
      return NextResponse.json(runContract(["fail", id, "--error", text(body.error) || "任务执行失败"]));
    }
    if (action === "archive" && id) {
      return NextResponse.json(runContract(["archive", id]));
    }
    if ((action === "approve" || action === "reject") && text(body.proposalId)) {
      return NextResponse.json(runContract([action, text(body.proposalId)!]));
    }
    return NextResponse.json({ error: "不支持的任务操作" }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
