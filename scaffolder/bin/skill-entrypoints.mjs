// Shared CLI skill entrypoint bootstrap — used by npx init and update-system.
// Materialize the canonical career-one Skill for supported Agent products.
// Materializes pointer files on filesystems without symlink support.
import { readFileSync, writeFileSync, existsSync, mkdirSync, lstatSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const CANONICAL_SKILL_PATH = '.agents/skills/career-one/SKILL.md';

export const SKILL_ENTRYPOINTS = [
  '.claude/skills/career-one/SKILL.md',
  '.opencode/skills/career-one/SKILL.md',
  '.qwen/skills/career-one/SKILL.md',
  '.antigravitycli/skills/career-one/SKILL.md',
  '.grok/skills/career-one/SKILL.md',
  '.kimi/skills/career-one/SKILL.md',
  '.trae/skills/career-one/SKILL.md',
].map((path) => ({
  path,
  pointer: '../../../.agents/skills/career-one/SKILL.md',
}));

const SKILL_DEFINITIONS = [
  { canonicalPath: CANONICAL_SKILL_PATH, entrypoints: SKILL_ENTRYPOINTS },
];

function repoPath(root, path) {
  return join(root, ...path.split('/'));
}

function readCanonical(root, canonicalRelativePath) {
  const canonicalPath = repoPath(root, canonicalRelativePath);
  if (!existsSync(canonicalPath)) return null;
  try {
    return readFileSync(canonicalPath, 'utf-8');
  } catch {
    return null;
  }
}

export function materializeSkillEntrypoints(root) {
  const materialized = [];
  for (const definition of SKILL_DEFINITIONS) {
    const canonicalContent = readCanonical(root, definition.canonicalPath);
    if (canonicalContent === null) continue;
    for (const entry of definition.entrypoints) {
      const entryPath = repoPath(root, entry.path);
      if (!existsSync(entryPath)) continue;

      let stat = null;
      try {
        stat = lstatSync(entryPath);
      } catch {
        continue;
      }
      if (stat.isSymbolicLink()) continue;
      if (!stat.isFile()) continue;

      try {
        const content = readFileSync(entryPath, 'utf-8').trim();
        if (content !== entry.pointer) continue;
        writeFileSync(entryPath, canonicalContent);
      } catch {
        continue;
      }
      materialized.push(entry.path);
    }
  }

  return materialized;
}

export function ensureSkillEntrypoints(root) {
  const touched = [];
  for (const definition of SKILL_DEFINITIONS) {
    const canonicalContent = readCanonical(root, definition.canonicalPath);
    if (canonicalContent === null) continue;
    for (const entry of definition.entrypoints) {
      const entryPath = repoPath(root, entry.path);

      if (!existsSync(entryPath)) {
        try {
          mkdirSync(dirname(entryPath), { recursive: true });
          writeFileSync(entryPath, entry.pointer);
          touched.push(entry.path);
        } catch {
          continue;
        }
      }

      let stat = null;
      try {
        stat = lstatSync(entryPath);
      } catch {
        continue;
      }
      if (stat.isSymbolicLink()) continue;
      if (!stat.isFile()) continue;

      try {
        const content = readFileSync(entryPath, 'utf-8').trim();
        if (content !== entry.pointer) continue;
        writeFileSync(entryPath, canonicalContent);
        if (!touched.includes(entry.path)) touched.push(entry.path);
      } catch {
        continue;
      }
    }
  }

  return touched;
}
