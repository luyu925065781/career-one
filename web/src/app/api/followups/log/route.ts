import fs from "node:fs";
import path from "node:path";
import { careerOneRoot } from "@/lib/career-one";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Append-only follow-up log → data/follow-ups.md (NEVER clobber; the cadence
// calculator reads this to advance the schedule). Mirrors how the CLI records a
// follow-up. One dated line per logged follow-up.
export async function POST(req: Request) {
  let body: { num?: string | number; company?: string; note?: string };
  try {
    body = (await req.json()) as { num?: string | number; company?: string; note?: string };
  } catch {
    return Response.json({ error: "请求格式不正确" }, { status: 400 });
  }
  const company = (body.company || "").toString().trim();
  if (!company) return Response.json({ error: "缺少公司名称" }, { status: 400 });
  const today = new Date().toISOString().slice(0, 10);
  const num = body.num != null ? `#${body.num} ` : "";
  const note = (body.note || "已跟进").toString().replace(/[\r\n]+/g, " ").trim();
  const line = `- ${today} · ${num}${company} — ${note}\n`;

  const file = path.join(careerOneRoot(), "data", "follow-ups.md");
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, "# Follow-ups\n\n", "utf8");
    fs.appendFileSync(file, line, "utf8");
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "跟进记录保存失败" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
