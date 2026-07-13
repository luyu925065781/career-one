import { spawn } from "node:child_process";
import fs from "node:fs";
import { careerOneRoot, rootScript } from "@/lib/career-one";
import { writeTempPortals, cleanupTempPortals } from "./portals";
import { ATS_SOURCES, type DiscoveredOffer, type ExploreFilters, type ScanEvent } from "@/lib/explore";

export type { DiscoveredOffer, ScanEvent, AtsSource } from "@/lib/explore";
export { ATS_SOURCES } from "@/lib/explore";

// Browser-triggered discovery now runs the canonical tracked-company scanner
// against an ephemeral config containing public target-company career pages.
// It never writes user data: --dry-run keeps review/add as an explicit action.
const RESULT_PREFIX = "@@CAREER_ONE_SCAN_JSON@@";
const TARGETS_RE = /Scanning\s+(\d+)\s+companies/;

type JsonOffer = {
  company?: string;
  title?: string;
  url?: string;
  location?: string;
  postedAt?: string;
  source?: string;
};

type ScanJson = {
  companiesAvailable?: number;
  companiesScanned?: number;
  postingsKept?: number;
  postingsUndated?: number;
  unreachableTargets?: number;
  offers?: JsonOffer[];
};

function firstMatch(title: string, positives: string[]): string | undefined {
  const lower = title.toLowerCase();
  return positives.find((keyword) => keyword && lower.includes(keyword.toLowerCase()));
}

function parseResult(stdout: string): ScanJson | null {
  const marker = stdout.lastIndexOf(RESULT_PREFIX);
  if (marker === -1) return null;
  const line = stdout.slice(marker + RESULT_PREFIX.length).split(/\r?\n/, 1)[0]?.trim();
  if (!line) return null;
  try {
    return JSON.parse(line) as ScanJson;
  } catch {
    return null;
  }
}

// Kept for the report-shape capability endpoint. The name is a migration-era
// compatibility contract; it now probes the tracked-company scanner marker.
export function scannerSupportsJson(): boolean {
  try {
    return fs.readFileSync(rootScript("scan"), "utf8").includes(RESULT_PREFIX);
  } catch {
    return false;
  }
}

export function runDiscovery(filters: ExploreFilters, onEvent: (event: ScanEvent) => void): Promise<DiscoveredOffer[]> {
  return new Promise((resolve) => {
    const tempPortals = writeTempPortals(filters);
    const args = [
      rootScript("scan"),
      "--dry-run",
      "--json",
      "--since",
      String(Math.max(1, filters.sinceDays || 7)),
    ];
    const child = spawn(process.execPath, args, {
      cwd: careerOneRoot(),
      env: { ...process.env, CAREER_ONE_PORTALS: tempPortals },
    });

    const offers: DiscoveredOffer[] = [];
    const seen = new Set<string>();
    let stdout = "";
    let stdoutLines = "";
    let stderrLines = "";
    let announced = false;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanupTempPortals(tempPortals);
      resolve(offers);
    };
    const killer = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {
        /* already closed */
      }
    }, 120_000);

    const handleStdoutLine = (line: string) => {
      const match = line.match(TARGETS_RE);
      if (match && !announced) {
        announced = true;
        onEvent({ kind: "atsStart", ats: "official", companies: Number(match[1]) });
      }
    };

    child.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      stdoutLines += text;
      const lines = stdoutLines.split(/\r?\n/);
      stdoutLines = lines.pop() ?? "";
      for (const line of lines) handleStdoutLine(line);
    });
    child.stderr.on("data", (data: Buffer) => {
      stderrLines += data.toString();
      const lines = stderrLines.split(/\r?\n/);
      stderrLines = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) onEvent({ kind: "log", line: line.trim() });
    });

    child.on("error", (error) => {
      clearTimeout(killer);
      onEvent({ kind: "error", message: error.message || "公开招聘官网扫描无法启动" });
      finish();
    });
    child.on("close", () => {
      clearTimeout(killer);
      if (stdoutLines.trim()) handleStdoutLine(stdoutLines);
      const result = parseResult(stdout);
      if (!result || !Array.isArray(result.offers)) {
        onEvent({ kind: "error", message: "公开招聘官网扫描没有返回可读取的结果。" });
        finish();
        return;
      }

      for (const raw of result.offers) {
        const url = raw.url?.trim() || "";
        const company = raw.company?.trim() || "";
        const title = raw.title?.trim() || "";
        if (!/^https?:\/\//i.test(url) || !company || !title || seen.has(url)) continue;
        seen.add(url);
        const offer: DiscoveredOffer = {
          url,
          company,
          title,
          location: raw.location?.trim() || "",
          postedAt: /^\d{4}-\d{2}-\d{2}$/.test(raw.postedAt || "") ? raw.postedAt! : "",
          ats: "official",
          source: raw.source || "official-careers",
          matchedKeyword: firstMatch(title, filters.positive),
        };
        offers.push(offer);
        onEvent({ kind: "offer", offer });
      }

      const scanned = result.companiesScanned ?? 0;
      const unreachable = result.unreachableTargets ?? 0;
      if (!announced) onEvent({ kind: "atsStart", ats: "official", companies: scanned });
      onEvent({ kind: "atsDone", ats: "official", unreachable });
      onEvent({
        kind: "summary",
        companiesScanned: scanned,
        companiesAvailable: result.companiesAvailable ?? scanned,
        unreachable,
        matches: result.postingsKept ?? offers.length,
        capHit: false,
        datasetStatus: { official: unreachable > 0 && scanned === 0 ? "stale" : "ok" },
        postingsDroppedNoDate: 0,
      });
      finish();
    });
  });
}
