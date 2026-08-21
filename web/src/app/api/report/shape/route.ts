import fs from "node:fs";
import path from "node:path";
import { careerOneRoot, doctorState, readApplications, readInbox, trackerCanDelete } from "@/lib/career-one";
import { scannerSupportsJson } from "@/lib/core/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// STRUCTURAL diagnostics for the in-app bug reporter: shapes, counts and
// capability probes only — never file contents. A malformed tracker shows up
// here as "12 candidate rows, 5 parsed", which is exactly what triage needs,
// without a single company name leaving the machine.

function lineCount(rel: string, predicate: (l: string) => boolean): number {
  try {
    return fs
      .readFileSync(path.join(careerOneRoot(), rel), "utf8")
      .split("\n")
      .filter(predicate).length;
  } catch {
    return 0;
  }
}

function dirCount(rel: string, ext: string): number {
  try {
    return fs.readdirSync(path.join(careerOneRoot(), rel)).filter((f) => f.endsWith(ext)).length;
  } catch {
    return 0;
  }
}

export async function GET() {
  const doctor = doctorState();
  // "candidate" = a line that LOOKS like a row; parsed = what the tolerant
  // reader accepted. A gap between the two is the data-contract fingerprint.
  const inboxCandidates = lineCount("data/pipeline.md", (l) => /^\s*-\s*\[[ xX]\]/.test(l));
  const trackerCandidates = lineCount(
    "data/applications.md",
    (l) => l.trim().startsWith("|") && !/^\|\s*#\s*\|/.test(l.trim()) && !/^\|\s*:?-{2,}/.test(l.trim()),
  );
  return Response.json({
    runtime: { node: process.version, platform: process.platform, arch: process.arch },
    setup: {
      phase: doctor.phase,
      missing: doctor.missing, // system prerequisite filenames only (CV + profile)
      hasCv: doctor.hasCv,
      hasData: doctor.hasData,
    },
    data: {
      inbox: { candidates: inboxCandidates, parsed: readInbox().length },
      tracker: { candidates: trackerCandidates, parsed: readApplications().length },
      reports: dirCount("reports", ".md"),
      pdfs: dirCount("output", ".pdf"),
      followupsFile: fs.existsSync(path.join(careerOneRoot(), "data", "follow-ups.md")),
    },
    capabilities: {
      scanJson: scannerSupportsJson(),
      trackerDelete: trackerCanDelete(),
    },
  });
}
