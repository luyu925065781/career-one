import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { careerOneRoot } from "@/lib/career-one";
import { atomicWriteWithBackup } from "@/lib/core/safe-write";
import { replaceStoryInMarkdown, validateStoryBankMarkdown } from "@/lib/story-bank.mjs";

type DocumentTarget = "cv" | "story-bank";
const DOCUMENTS: Record<DocumentTarget, { relativePath: string; maxBytes: number; label: string }> = {
  cv: { relativePath: "cv.md", maxBytes: 200_000, label: "CV" },
  "story-bank": { relativePath: "interview-prep/story-bank.md", maxBytes: 500_000, label: "故事库" },
};

function targetOf(value: unknown): DocumentTarget {
  return value === "story-bank" ? "story-bank" : "cv";
}

function documentPath(target: DocumentTarget) {
  return path.join(careerOneRoot(), DOCUMENTS[target].relativePath);
}

function digest(content: string) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function readDocument(target: DocumentTarget) {
  try {
    const content = fs.readFileSync(documentPath(target), "utf8");
    return { content, exists: true, hash: digest(content) };
  } catch {
    return { content: "", exists: false, hash: digest("") };
  }
}

export async function GET(req: Request) {
  const target = targetOf(new URL(req.url).searchParams.get("target"));
  return NextResponse.json(readDocument(target));
}

export async function POST(req: Request) {
  let body: {
    content?: string;
    target?: DocumentTarget;
    baseHash?: string;
    storyId?: string;
    storyMarkdown?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const target = targetOf(body.target);
  const spec = DOCUMENTS[target];
  const incoming = target === "story-bank" ? body.storyMarkdown : body.content;
  if (typeof incoming !== "string") {
    return NextResponse.json(
      { error: target === "story-bank" ? "storyMarkdown required" : "content required" },
      { status: 400 },
    );
  }
  if (Buffer.byteLength(incoming, "utf8") > spec.maxBytes) {
    return NextResponse.json({ error: `${spec.label}内容过大。` }, { status: 413 });
  }
  if (target === "story-bank" && (typeof body.storyId !== "string" || !/^S\d+$/i.test(body.storyId))) {
    return NextResponse.json({ error: "storyId invalid" }, { status: 400 });
  }
  if ((target === "story-bank" || body.baseHash !== undefined) && !/^[a-f0-9]{64}$/.test(body.baseHash ?? "")) {
    return NextResponse.json({ error: "baseHash invalid" }, { status: 400 });
  }
  const current = readDocument(target);
  if (body.baseHash && body.baseHash !== current.hash) {
    return NextResponse.json(
      { error: `${spec.label}已在其他位置更新，请重新加载后再保存。`, currentHash: current.hash },
      { status: 409 },
    );
  }
  let content = incoming;
  if (target === "story-bank") {
    try {
      content = replaceStoryInMarkdown(current.content, body.storyId!, incoming);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "故事内容无效" },
        { status: 422 },
      );
    }
    const validation = validateStoryBankMarkdown(content);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 422 });
    if (Buffer.byteLength(content, "utf8") > spec.maxBytes) {
      return NextResponse.json({ error: `${spec.label}内容过大。` }, { status: 413 });
    }
  }
  // DATA_CONTRACT: both targets are user-layer and gitignored (no git recovery).
  // Never blind-overwrite — snapshot the prior document and write atomically.
  try {
    const bak = atomicWriteWithBackup(documentPath(target), content);
    return NextResponse.json({ ok: true, backedUp: !!bak, hash: digest(content) });
  } catch {
    return NextResponse.json({ error: "write failed" }, { status: 500 });
  }
}
