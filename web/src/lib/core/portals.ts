import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import * as yaml from "js-yaml";
import { careerOneRoot } from "@/lib/career-one";
import { DEFAULT_FILTERS, cleanChips, type ExploreFilters } from "@/lib/explore";

/**
 * ACL for portals.yml — the core's scan-filter config (a CONTRACT entry-point,
 * see reference_web_core_sync_protocol). The Explorer NEVER mutates the user's
 * real portals.yml: it writes an EPHEMERAL filter file and points the scanner at
 * it via CAREER_ONE_PORTALS, so an ad-hoc search can't clobber the curated config.
 * We also read the real portals.yml + config/profile.yml (tolerantly) only to
 * SEED sensible defaults for the first search.
 *
 * The temporary document also includes only explicitly configured public target
 * company career pages. Recruitment platforms, WebSearch-only companies and
 * local executable parsers are never copied into the browser-triggered scan.
 *
 * Filter semantics mirror scan.mjs::buildTitleFilter / buildLocationFilter:
 *   title positive → substring match (empty = everything matches)
 *   title negative → substring reject
 *   location always_allow > block > allow (case-insensitive substring)
 */
type FilterLists = Pick<ExploreFilters, "positive" | "negative" | "allow" | "block" | "alwaysAllow">;

function listFrom(v: unknown): string[] {
  return cleanChips(v);
}

/** Serialize filters into a minimal, valid portals.yml. Scalars go through
 *  JSON.stringify (a valid YAML double-quoted scalar) so arbitrary keywords —
 *  colons, quotes, leading dashes — can never break the document or inject YAML. */
export function serializePortals(f: FilterLists, trackedCompanies: Record<string, unknown>[] = []): string {
  const block = (key: string, items: string[]) =>
    items.length ? `  ${key}:\n` + items.map((k) => `    - ${JSON.stringify(k)}`).join("\n") + "\n" : "";

  let out = "# Ephemeral Explorer filters — generated per-search, safe to delete.\n";
  if (f.positive.length || f.negative.length) {
    out += "title_filter:\n";
    out += block("positive", f.positive);
    out += block("negative", f.negative);
  }
  if (f.allow.length || f.block.length || f.alwaysAllow.length) {
    out += "location_filter:\n";
    out += block("always_allow", f.alwaysAllow);
    out += block("allow", f.allow);
    out += block("block", f.block);
  }
  if (trackedCompanies.length) {
    out += yaml.dump({ tracked_companies: trackedCompanies }, { lineWidth: 120, noRefs: true });
  }
  return out;
}

function publicTrackedCompanies(): Record<string, unknown>[] {
  try {
    const raw = yaml.load(fs.readFileSync(path.join(careerOneRoot(), "portals.yml"), "utf8"));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const rows = (raw as Record<string, unknown>).tracked_companies;
    if (!Array.isArray(rows)) return [];
    return rows.flatMap((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return [];
      const company = value as Record<string, unknown>;
      const careersUrl = typeof company.careers_url === "string" ? company.careers_url.trim() : "";
      if (company.enabled === false || company.scan_method === "websearch" || !/^https:\/\/[^\s]+$/i.test(careersUrl)) return [];
      const { parser: _parser, scan_query: _scanQuery, search_query: _searchQuery, ...safe } = company;
      return [{ ...safe, careers_url: careersUrl, enabled: true }];
    });
  } catch {
    return [];
  }
}

/** Write the ephemeral filter file to a temp path; caller cleans it up. */
export function writeTempPortals(f: FilterLists): string {
  const file = path.join(os.tmpdir(), `career-one-explore-${randomUUID()}.yml`);
  fs.writeFileSync(file, serializePortals(f, publicTrackedCompanies()), "utf8");
  return file;
}

export function cleanupTempPortals(file: string): void {
  try {
    if (file.startsWith(os.tmpdir()) && file.includes("career-one-explore-")) fs.unlinkSync(file);
  } catch {
    /* best-effort */
  }
}

function loadYaml(rel: string): Record<string, unknown> | null {
  try {
    const doc = yaml.load(fs.readFileSync(path.join(careerOneRoot(), rel), "utf8"));
    return doc && typeof doc === "object" ? (doc as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Tolerantly seed first-search defaults from the user's real config. Reads
 * portals.yml (title_filter / location_filter) and falls back to
 * config/profile.yml (target_roles, location) for the positive keywords when
 * portals has none. Never throws — a bare checkout just yields DEFAULT_FILTERS.
 */
export function seedExploreFilters(): { filters: ExploreFilters; seededFrom: string[] } {
  const filters: ExploreFilters = { ...DEFAULT_FILTERS, ats: [...DEFAULT_FILTERS.ats] };
  const seededFrom: string[] = [];
  const profile = loadYaml("config/profile.yml");

  const portals = loadYaml("portals.yml");
  if (portals) {
    const tf = (portals.title_filter ?? {}) as Record<string, unknown>;
    const lf = (portals.location_filter ?? {}) as Record<string, unknown>;
    filters.positive = listFrom(tf.positive);
    filters.negative = listFrom(tf.negative);
    filters.allow = listFrom(lf.allow);
    filters.block = listFrom(lf.block);
    filters.alwaysAllow = listFrom(lf.always_allow);
    if (filters.positive.length || filters.allow.length || filters.block.length) seededFrom.push("portals.yml");
  }

  if (filters.positive.length === 0) {
    const roles = (profile?.target_roles ?? {}) as Record<string, unknown>;
    const fromRoles = listFrom([
      ...(typeof roles.primary === "string" ? [roles.primary] : []),
      ...(Array.isArray(roles.archetypes) ? roles.archetypes : []),
    ]);
    if (fromRoles.length) {
      filters.positive = fromRoles;
      seededFrom.push("profile.yml");
    }
  }

  // Agent-confirmed profile data seeds a safe, non-exclusive location default
  // only when the user has not already saved explicit location rules. Current
  // city belongs in alwaysAllow: it avoids losing multi-location roles without
  // silently restricting the search to that city or inventing relocation rules.
  if (filters.allow.length === 0 && filters.block.length === 0 && filters.alwaysAllow.length === 0) {
    const profileLocation = (profile?.location ?? {}) as Record<string, unknown>;
    const rawCity = typeof profileLocation.city === "string" ? profileLocation.city.trim() : "";
    const profileCity = /^(?:tbd|待确认|未知|unknown)$/i.test(rawCity) ? "" : rawCity;
    if (profileCity) filters.alwaysAllow = [profileCity];
  }

  return { filters, seededFrom };
}

export { listFrom as normalizeKeywords };
