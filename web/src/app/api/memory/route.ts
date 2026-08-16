import { NextResponse } from "next/server";
import { readMemory, rememberFact } from "@/lib/career-one";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ memory: readMemory() });
}

// Append a durable fact the assistant learned about the user. Written to the
// CANONICAL modes/_profile.md (single source of truth) so the CLI/TUI see it too
// — never a web-only memory store.
export async function POST(req: Request) {
  let b: { fact?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }
  const fact = (b.fact ?? "").toString();
  if (!fact.trim()) return NextResponse.json({ error: "缺少需要保存的用户信息" }, { status: 400 });

  const result = rememberFact(fact);
  if (result === "error") return NextResponse.json({ error: "用户信息保存失败" }, { status: 500 });
  return NextResponse.json({ ok: true, deduped: result === "deduped" });
}
