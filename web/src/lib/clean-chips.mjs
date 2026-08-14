// Pure JS implementation of cleanChips — no TypeScript types so it can be
// imported directly by both explore.ts (which re-exports it) and by
// test-clean-chips.mjs (which can't import .ts without a runner).
// This is the single source of truth for the chip-cleaning logic.

const CHIP_CAP = 16;

/** Trim, drop empties, de-dupe case-insensitively, cap length. */
export function cleanChips(v) {
  if (v == null) return [];
  const arr = Array.isArray(v) ? v : [v];
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    if (typeof item !== "string") continue;
    const k = item.trim();
    if (!k) continue;
    if (!/[\p{L}\p{N}]/u.test(k)) continue; // drop punctuation-only junk (e.g. a stray "*")
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(k);
    if (out.length >= CHIP_CAP) break;
  }
  return out;
}

/** Format the configured target roles for pasting into a recruitment search box. */
export function formatJobSearchKeywords(values) {
  return cleanChips(values).join("，");
}

/** Prefer Chinese role labels, then use English labels to fill the limit. */
export function selectTargetRoleTags(values, limit = 5) {
  const cleaned = cleanChips(values);
  const chinese = cleaned.filter((value) => /[\u3400-\u9fff]/.test(value));
  const other = cleaned.filter((value) => !/[\u3400-\u9fff]/.test(value));
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 5;
  return [...chinese, ...other].slice(0, safeLimit);
}
