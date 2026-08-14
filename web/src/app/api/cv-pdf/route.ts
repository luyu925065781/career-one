import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { careerOneRoot } from "@/lib/career-one";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizedReportNumber(value: string) {
  return value.replace(/^0+(?=\d)/, "");
}

function reportPdf(root: string, report: string) {
  if (!/^\d+$/.test(report)) return null;
  const manifestPath = path.join(root, "data", "pdf-index.tsv");
  let manifest: string;
  try {
    manifest = fs.readFileSync(manifestPath, "utf8");
  } catch {
    return null;
  }

  const key = normalizedReportNumber(report);
  for (const line of manifest.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [rowReport, pdfPath] = line.split("\t");
    if (normalizedReportNumber(rowReport.trim()) !== key || !pdfPath) continue;

    const outputDir = path.resolve(root, "output");
    const candidate = path.resolve(root, pdfPath);
    const relative = path.relative(outputDir, candidate);
    if (relative.startsWith("..") || path.isAbsolute(relative) || path.extname(candidate).toLowerCase() !== ".pdf") {
      return null;
    }
    return candidate;
  }
  return null;
}

// Serve the tailored CV PDF written by pdf mode. Prefer the report-keyed
// data/pdf-index.tsv entry so anonymous or duplicate company names still open
// the exact file; retain company-slug lookup as a compatibility fallback.
// Inline so it opens in the browser. Local-first: reads the user's own output/.
export async function GET(req: NextRequest) {
  const root = careerOneRoot();
  const report = (req.nextUrl.searchParams.get("report") ?? "").trim();
  const company = (req.nextUrl.searchParams.get("company") ?? "").trim();
  if (!report && !company) return new Response("缺少报告编号或公司名称", { status: 400 });

  let file = report ? reportPdf(root, report) : null;
  if (report && !file) return new Response("没有找到该报告对应的定制简历", { status: 404 });

  // Token-extract instead of replace-then-trim: same slug, and no `-+$`-style
  // pattern that backtracks polynomially on adversarial input (CodeQL).
  const slug = (company.toLowerCase().match(/[a-z0-9]+/g) ?? []).join("-");
  const dir = path.join(root, "output");
  // Match the slug at a token boundary (delimited by non-alphanumerics) so "Meta"
  // doesn't serve "Metabase"'s tailored CV. The pdf mode names files cv-…-{slug}-….
  const re = new RegExp(`(^|[^a-z0-9])${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i");

  if (!file) {
    let files: string[];
    try {
      files = fs
        .readdirSync(dir)
        .filter((f) => f.toLowerCase().endsWith(".pdf"))
        .filter((f) => re.test(f.toLowerCase()));
    } catch {
      return new Response("尚未生成简历输出目录", { status: 404 });
    }
    if (!files.length) return new Response("没有找到该岗位对应的定制简历", { status: 404 });

    files.sort((a, b) => fs.statSync(path.join(dir, b)).mtimeMs - fs.statSync(path.join(dir, a)).mtimeMs);
    file = path.join(dir, files[0]);
  }
  try {
    const buf = fs.readFileSync(file);
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${path.basename(file)}"`, "Cache-Control": "no-store" },
    });
  } catch {
    return new Response("无法读取简历 PDF", { status: 500 });
  }
}
