import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { careerOneRoot, rootScript } from "@/lib/career-one";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Artifact = { path?: unknown; label?: unknown; page?: unknown; available?: unknown };
type ScreenshotAttachment = { name?: unknown; type?: unknown; dataUrl?: unknown };
type TextAttachment = { name?: unknown; text?: unknown };
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
  question?: unknown;
  summary?: unknown;
  score?: unknown;
  error?: unknown;
  artifacts?: unknown;
  proposalId?: unknown;
  instruction?: unknown;
  attachments?: unknown;
  textAttachment?: unknown;
};

const MAX_SCREENSHOTS = 3;
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_ATTACHMENT_BYTES = 512 * 1024;
const MAX_TASK_INSTRUCTION_CHARS = 1_000;
const SCREENSHOT_MIME_EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;
const TASK_ATTACHMENT_PATTERN = /^data\/task-attachments\/([a-zA-Z0-9][a-zA-Z0-9_-]{2,96})\/(?:0[1-3]-[a-f0-9]{12}\.(?:png|jpg|webp)|job-description\.txt)$/;

class TaskAttachmentNotFoundError extends Error {
  constructor() {
    super("未找到任务附件");
    this.name = "TaskAttachmentNotFoundError";
  }
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function pushOption(args: string[], name: string, value: unknown) {
  const normalized = text(value);
  if (normalized) args.push(name, normalized);
}

function workspaceFingerprint(): string {
  const configuredRoot = path.resolve(careerOneRoot());
  let canonicalRoot = configuredRoot;
  try {
    canonicalRoot = fs.realpathSync(configuredRoot);
  } catch {
    // A missing or temporarily unavailable root still needs a stable namespace
    // so the browser never falls back to another workspace's cached tasks.
  }
  return createHash("sha256").update(canonicalRoot).digest("hex").slice(0, 16);
}

function artifactExistsInWorkspace(value: unknown): boolean {
  const relativePath = text(value)?.replaceAll("\\", "/");
  if (!relativePath || path.isAbsolute(relativePath) || relativePath.split("/").includes("..")) return false;

  try {
    const root = fs.realpathSync(path.resolve(careerOneRoot()));
    const candidate = fs.realpathSync(path.resolve(root, relativePath));
    if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) return false;
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function withArtifactAvailability(result: unknown): unknown {
  if (!result || typeof result !== "object" || Array.isArray(result)) return result;
  const payload = result as Record<string, unknown>;
  if (!Array.isArray(payload.runs)) return result;
  return {
    ...payload,
    runs: payload.runs.map((rawRun) => {
      if (!rawRun || typeof rawRun !== "object" || Array.isArray(rawRun)) return rawRun;
      const run = rawRun as Record<string, unknown>;
      return {
        ...run,
        artifacts: Array.isArray(run.artifacts)
          ? run.artifacts.map((rawArtifact) => {
              if (!rawArtifact || typeof rawArtifact !== "object" || Array.isArray(rawArtifact)) return rawArtifact;
              const artifact = rawArtifact as Artifact;
              return { ...artifact, available: artifactExistsInWorkspace(artifact.path) };
            })
          : run.artifacts,
      };
    }),
  };
}

function validateTaskId(value: string | undefined): string {
  if (!value || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,96}$/.test(value)) throw new Error("任务 ID 无效");
  return value;
}

function taskAttachmentRoot(): string {
  const workspaceRoot = fs.realpathSync(path.resolve(careerOneRoot()));
  const configuredRoot = path.resolve(workspaceRoot, "data", "task-attachments");
  fs.mkdirSync(configuredRoot, { recursive: true, mode: 0o700 });
  const attachmentRoot = fs.realpathSync(configuredRoot);
  if (!attachmentRoot.startsWith(`${workspaceRoot}${path.sep}`)) throw new Error("任务附件目录超出当前工作区");
  return attachmentRoot;
}

function taskAttachmentDirectory(taskId: string, create: boolean): { id: string; taskDir: string } {
  const id = validateTaskId(taskId);
  const safeId = path.basename(id);
  if (safeId !== id) throw new Error("任务 ID 无效");

  const attachmentRoot = taskAttachmentRoot();
  const taskDir = path.resolve(attachmentRoot, safeId);
  if (path.dirname(taskDir) !== attachmentRoot) throw new Error("任务附件目录超出允许范围");

  if (!fs.existsSync(taskDir)) {
    if (!create) throw new TaskAttachmentNotFoundError();
    fs.mkdirSync(taskDir, { mode: 0o700 });
  }
  if (fs.lstatSync(taskDir).isSymbolicLink()) throw new Error("任务附件目录不能是符号链接");
  if (!fs.statSync(taskDir).isDirectory()) throw new Error("任务附件目录无效");

  const canonicalTaskDir = fs.realpathSync(taskDir);
  if (path.dirname(canonicalTaskDir) !== attachmentRoot) throw new Error("任务附件目录超出允许范围");
  return { id: safeId, taskDir: canonicalTaskDir };
}

function validateImageSignature(bytes: Buffer, mime: keyof typeof SCREENSHOT_MIME_EXTENSIONS): boolean {
  if (mime === "image/png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mime === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

function attachmentAbsolutePath(relativePath: string): { absolute: string; contentType: string } {
  const normalized = relativePath.trim().replaceAll("\\", "/");
  const match = normalized.match(TASK_ATTACHMENT_PATTERN);
  if (!match) throw new Error("任务附件路径无效");
  const { taskDir } = taskAttachmentDirectory(match[1], false);
  const fileName = path.basename(match[2]);
  if (fileName !== match[2]) throw new Error("任务附件路径无效");
  const candidate = path.resolve(taskDir, fileName);
  if (path.dirname(candidate) !== taskDir) throw new Error("任务附件路径超出允许范围");
  if (!fs.existsSync(candidate)) throw new TaskAttachmentNotFoundError();
  const absolute = fs.realpathSync(candidate);
  if (path.dirname(absolute) !== taskDir) throw new Error("任务附件路径超出允许范围");
  const extension = path.extname(absolute).slice(1);
  const contentType = extension === "png" ? "image/png" : extension === "jpg" ? "image/jpeg" : extension === "webp" ? "image/webp" : "text/plain; charset=utf-8";
  return { absolute, contentType };
}

function storeScreenshotAttachments(taskId: string, rawAttachments: unknown): Artifact[] {
  if (!Array.isArray(rawAttachments) || rawAttachments.length === 0) return [];
  if (rawAttachments.length > MAX_SCREENSHOTS) throw new Error(`每个任务最多保存 ${MAX_SCREENSHOTS} 张招聘截图`);

  const { id, taskDir } = taskAttachmentDirectory(taskId, true);

  return (rawAttachments as ScreenshotAttachment[]).map((attachment, index) => {
    const originalName = text(attachment?.name)?.slice(0, 160) || `招聘截图-${index + 1}`;
    const mime = text(attachment?.type) as keyof typeof SCREENSHOT_MIME_EXTENSIONS | undefined;
    const dataUrl = text(attachment?.dataUrl);
    if (!mime || !(mime in SCREENSHOT_MIME_EXTENSIONS) || !dataUrl) throw new Error(`第 ${index + 1} 张截图格式无效`);

    const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match || match[1] !== mime) throw new Error(`第 ${index + 1} 张截图编码无效`);
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length === 0 || bytes.length > MAX_SCREENSHOT_BYTES) throw new Error(`第 ${index + 1} 张截图不能超过 8 MB`);
    if (!validateImageSignature(bytes, mime)) throw new Error(`第 ${index + 1} 张截图内容与图片格式不一致`);

    const extension = SCREENSHOT_MIME_EXTENSIONS[mime];
    const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    const fileName = `${String(index + 1).padStart(2, "0")}-${digest}.${extension}`;
    const absolute = path.join(taskDir, fileName);
    const temp = path.join(taskDir, `.${randomUUID()}.tmp`);
    fs.writeFileSync(temp, bytes, { flag: "wx", mode: 0o600 });
    fs.renameSync(temp, absolute);
    return {
      path: path.posix.join("data", "task-attachments", id, fileName),
      label: `招聘截图 ${index + 1} · ${originalName}`,
    };
  });
}

function storeTextAttachment(taskId: string, rawAttachment: unknown): Artifact[] {
  if (!rawAttachment || typeof rawAttachment !== "object" || Array.isArray(rawAttachment)) return [];
  const attachment = rawAttachment as TextAttachment;
  const value = typeof attachment.text === "string" ? attachment.text.trim() : "";
  if (!value) return [];
  const bytes = Buffer.from(value, "utf8");
  if (bytes.length > MAX_TEXT_ATTACHMENT_BYTES) throw new Error("完整 JD 不能超过 512 KB");

  const { id, taskDir } = taskAttachmentDirectory(taskId, true);
  const fileName = "job-description.txt";
  const absolute = path.join(taskDir, fileName);
  const temp = path.join(taskDir, `.${randomUUID()}.tmp`);
  fs.writeFileSync(temp, bytes, { flag: "wx", mode: 0o600 });
  fs.renameSync(temp, absolute);
  return [{
    path: path.posix.join("data", "task-attachments", id, fileName),
    label: text(attachment.name) || "完整岗位 JD",
  }];
}

function instructionWithAttachments(instruction: string, attachments: Artifact[]): string {
  if (attachments.length === 0 || instruction.includes("**Screenshots:**")) {
    return instruction.slice(0, MAX_TASK_INSTRUCTION_CHARS);
  }
  const screenshotPaths = attachments
    .map((attachment) => String(attachment.path))
    .filter((attachmentPath) => /\.(?:png|jpg|webp)$/i.test(attachmentPath));
  const textPaths = attachments
    .map((attachment) => String(attachment.path))
    .filter((attachmentPath) => attachmentPath.endsWith(".txt"));
  const suffixParts = [];
  if (screenshotPaths.length > 0) {
    suffixParts.push(`截图已保存在当前工作区：${screenshotPaths.join("、")}。请直接读取这些本地文件；生成报告时在报告头加入“**Screenshots:** ${screenshotPaths.join(" | ")}”，让 Web 报告展示原始岗位截图。`);
  }
  if (textPaths.length > 0) {
    suffixParts.push(`完整岗位 JD 已保存在当前工作区：${textPaths.join("、")}。请直接读取这些本地文本附件。`);
  }
  const suffix = suffixParts.join(" ");
  const baseBudget = Math.max(0, MAX_TASK_INSTRUCTION_CHARS - suffix.length - 1);
  return `${instruction.slice(0, baseBudget).trimEnd()} ${suffix}`.trim();
}

function appendArtifacts(args: string[], artifacts: Artifact[]) {
  for (const artifact of artifacts) {
    const artifactPath = text(artifact.path);
    if (!artifactPath) continue;
    args.push("--artifact", [artifactPath, text(artifact.label) || artifactPath, text(artifact.page) || ""].join("|"));
  }
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
  const lines = stderr.split("\n").map((line) => line.trim()).filter(Boolean);
  const detail = (lines.find((line) => line.startsWith("择程AI：")) || lines[0] || message).replace(/^择程AI：/, "");
  const userMessage = /^(?:Unknown command|未知命令)\b/.test(detail)
    ? "当前工作区的 Agent 任务协议版本不兼容，请更新择程AI后重试"
    : detail;
  return NextResponse.json({ error: userMessage, workspaceId: workspaceFingerprint() }, { status: 400 });
}

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const proposalId = searchParams.get("proposalId");
  const attachment = searchParams.get("attachment");
  try {
    if (attachment) {
      const { absolute, contentType } = attachmentAbsolutePath(attachment);
      if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
        return NextResponse.json({ error: "未找到任务附件", workspaceId: workspaceFingerprint() }, { status: 404 });
      }
      return new Response(fs.readFileSync(absolute), {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${path.basename(absolute)}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    const result = proposalId ? runContract(["proposal", proposalId]) : withArtifactAvailability(runContract(["list"]));
    return NextResponse.json({ ...(result as object), workspaceId: workspaceFingerprint() });
  } catch (error) {
    if (error instanceof TaskAttachmentNotFoundError) {
      return NextResponse.json({ error: error.message, workspaceId: workspaceFingerprint() }, { status: 404 });
    }
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
      const baseInstruction = text(body.instruction)?.slice(0, 1_000);
      if (!baseInstruction) {
        return NextResponse.json({ error: "缺少交给 Agent 的任务指令" }, { status: 400 });
      }
      const taskId = validateTaskId(id);
      const attachments = [
        ...storeScreenshotAttachments(taskId, body.attachments),
        ...storeTextAttachment(taskId, body.textAttachment),
      ];
      const instruction = instructionWithAttachments(baseInstruction, attachments);
      const args = ["queue"];
      pushOption(args, "--id", id);
      pushOption(args, "--intent", body.intent);
      pushOption(args, "--title", body.title);
      pushOption(args, "--subtitle", body.subtitle);
      pushOption(args, "--source", body.source || "web");
      pushOption(args, "--input", body.input);
      pushOption(args, "--page", body.page);
      pushOption(args, "--instruction", instruction);
      let run = runContract(args) as { id?: string };
      if (!run.id) throw new Error("Agent 待办任务创建失败");
      const runId = run.id;
      if (attachments.length > 0) {
        const attachLabel = attachments.some((attachment) => String(attachment.path).endsWith(".txt"))
          ? "岗位输入已保存到本地附件目录"
          : "招聘截图已保存到本地附件目录";
        const attachArgs = ["attach", runId, "--label", attachLabel, "--instruction", instruction];
        appendArtifacts(attachArgs, attachments);
        run = runContract(attachArgs) as { id?: string };
      }
      try {
        runInbox(["add", `[task:${runId}] ${instruction}`]);
      } catch (error) {
        try {
          runContract(["fail", runId, "--error", "写入 Agent 待办失败"]);
        } catch {
          // Preserve the original inbox error.
        }
        throw error;
      }
      return NextResponse.json({ ...run, instruction, attachmentPaths: attachments.map((attachment) => attachment.path) });
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
    if (action === "attach" && id) {
      const baseInstruction = text(body.instruction)?.slice(0, 1_000);
      if (!baseInstruction) return NextResponse.json({ error: "缺少交给 Agent 的任务指令" }, { status: 400 });
      runContract(["get", validateTaskId(id)]);
      const attachments = [
        ...storeScreenshotAttachments(id, body.attachments),
        ...storeTextAttachment(id, body.textAttachment),
      ];
      if (attachments.length === 0) return NextResponse.json({ error: "没有可保存的岗位输入" }, { status: 400 });
      const instruction = instructionWithAttachments(baseInstruction, attachments);
      const attachLabel = attachments.some((attachment) => String(attachment.path).endsWith(".txt"))
        ? "岗位输入已保存到本地附件目录"
        : "招聘截图已保存到本地附件目录";
      const args = ["attach", id, "--label", attachLabel, "--instruction", instruction];
      appendArtifacts(args, attachments);
      const run = runContract(args);
      return NextResponse.json({ ...run as object, instruction, attachmentPaths: attachments.map((attachment) => attachment.path) });
    }
    if (action === "wait" && id) {
      const args = ["wait", id];
      pushOption(args, "--question", body.question);
      pushOption(args, "--label", body.progress);
      return NextResponse.json(runContract(args));
    }
    if (action === "complete" && id) {
      const args = ["complete", id];
      pushOption(args, "--summary", body.summary);
      pushOption(args, "--page", body.page);
      if (body.score !== undefined && body.score !== null) args.push("--score", String(body.score));
      if (Array.isArray(body.artifacts)) appendArtifacts(args, body.artifacts as Artifact[]);
      return NextResponse.json(runContract(args));
    }
    if (action === "fail" && id) {
      return NextResponse.json(runContract(["fail", id, "--error", text(body.error) || "任务执行失败"]));
    }
    if (action === "archive" && id) {
      return NextResponse.json(runContract(["archive", id]));
    }
    if ((action === "approve" || action === "reject") && text(body.proposalId)) {
      const proposal = runContract([action, text(body.proposalId)!]) as { runId?: string };
      if (!proposal.runId) throw new Error("修改提案缺少关联任务");
      const run = runContract(["get", proposal.runId]);
      return NextResponse.json({ proposal, run });
    }
    return NextResponse.json({ error: "不支持的任务操作" }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
