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

function hasOwn(object: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

/** Profile-owned intent wins; legacy portals filters fill only unconfirmed keys. */
function mergeProfileSearchConfig(
  profile: Record<string, unknown> | null,
  portals: Record<string, unknown> | null,
): { filters: FilterLists; seededFrom: string[] } {
  const filters: FilterLists = { positive: [], negative: [], allow: [], block: [], alwaysAllow: [] };
  const seededFrom: string[] = [];
  const sourceTitle = (portals?.title_filter ?? {}) as Record<string, unknown>;
  const sourceLocation = (portals?.location_filter ?? {}) as Record<string, unknown>;
  filters.positive = listFrom(sourceTitle.positive);
  filters.negative = listFrom(sourceTitle.negative);
  filters.allow = listFrom(sourceLocation.allow);
  filters.block = listFrom(sourceLocation.block);
  filters.alwaysAllow = listFrom(sourceLocation.always_allow);

  const roles = (profile?.target_roles ?? {}) as Record<string, unknown>;
  const search = (profile?.job_search ?? {}) as Record<string, unknown>;
  const profileRoles = listFrom(roles.primary);
  if (profileRoles.length > 0) filters.positive = profileRoles;
  if (hasOwn(search, "excluded_titles")) filters.negative = listFrom(search.excluded_titles);
  if (hasOwn(search, "preferred_locations")) filters.allow = listFrom(search.preferred_locations);
  if (hasOwn(search, "excluded_locations")) filters.block = listFrom(search.excluded_locations);

  const profileLocation = (profile?.location ?? {}) as Record<string, unknown>;
  const rawCity = typeof profileLocation.city === "string" ? profileLocation.city.trim() : "";
  const city = /^(?:tbd|待填写|待确认|未知|unknown)$/i.test(rawCity) ? "" : rawCity;
  const profileAlways = hasOwn(search, "always_include_locations")
    ? listFrom(search.always_include_locations)
    : [];
  filters.alwaysAllow = listFrom([
    ...(hasOwn(search, "always_include_locations") ? [] : filters.alwaysAllow),
    ...profileAlways,
    ...(city ? [city] : []),
  ]);

  const profileUsed = profileRoles.length > 0
    || hasOwn(search, "excluded_titles")
    || hasOwn(search, "preferred_locations")
    || hasOwn(search, "excluded_locations")
    || hasOwn(search, "always_include_locations")
    || Boolean(city);
  const portalsUsed = (profileRoles.length === 0 && listFrom(sourceTitle.positive).length > 0)
    || (!hasOwn(search, "excluded_titles") && listFrom(sourceTitle.negative).length > 0)
    || (!hasOwn(search, "preferred_locations") && listFrom(sourceLocation.allow).length > 0)
    || (!hasOwn(search, "excluded_locations") && listFrom(sourceLocation.block).length > 0)
    || (!hasOwn(search, "always_include_locations") && listFrom(sourceLocation.always_allow).length > 0);
  if (profileUsed) seededFrom.push("profile.yml");
  if (portalsUsed) seededFrom.push("portals.yml");
  return { filters, seededFrom };
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
 * Tolerantly seed first-search defaults from the user's real config. Candidate
 * intent comes from config/profile.yml; legacy portals filters remain a fallback
 * for fields not yet confirmed in the profile. Never throws.
 */
export function seedExploreFilters(): { filters: ExploreFilters; seededFrom: string[] } {
  const filters: ExploreFilters = { ...DEFAULT_FILTERS, ats: [...DEFAULT_FILTERS.ats] };
  const seededFrom: string[] = [];
  const profile = loadYaml("config/profile.yml");
  const portals = loadYaml("portals.yml");
  const merged = mergeProfileSearchConfig(profile, portals);
  Object.assign(filters, merged.filters);
  seededFrom.push(...merged.seededFrom);

  return { filters, seededFrom };
}

export { listFrom as normalizeKeywords };
