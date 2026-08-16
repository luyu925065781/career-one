// Shared CLI skill entrypoint bootstrap — used by npx init and update-system.
// Materialize the canonical career-one Skill for supported Agent products.
// Materializes pointer files on filesystems without symlink support.
import { cpSync, readFileSync, writeFileSync, existsSync, mkdirSync, lstatSync } from 'node:fs';
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

export const COMPATIBILITY_ENTRYPOINTS = [
  { source: 'system/compat/doctor.mjs', path: 'doctor.mjs' },
  { source: 'system/compat/start-web.mjs', path: 'start-web.mjs' },
  { source: 'system/compat/test-all.mjs', path: 'test-all.mjs' },
  { source: 'system/compat/启动择程AI.command', path: '启动择程AI.command' },
  { source: 'system/compat/agents/CODEX.md', path: 'CODEX.md' },
  { source: 'system/compat/agents/GEMINI.md', path: 'GEMINI.md' },
  { source: 'system/compat/agents/KIMI.md', path: 'KIMI.md' },
  { source: 'system/compat/agents/OPENCODE.md', path: 'OPENCODE.md' },
  { source: 'system/integrations/claude-plugin', path: '.claude-plugin' },
  { source: 'system/config/env.example', path: '.env.example' },
  { source: 'system/config/profile.example.yml', path: 'config/profile.example.yml' },
  { source: 'system/config/plugins.example.yml', path: 'config/plugins.example.yml' },
  { source: 'system/config/tracker-aliases.json', path: 'config/tracker-aliases.json' },
  { source: 'system/deploy/Dockerfile', path: 'Dockerfile' },
  { source: 'system/deploy/docker-compose.yml', path: 'docker-compose.yml' },
  { source: 'system/deploy/career-one-docker', path: 'career-one-docker' },
  { source: 'system/deploy/flake.nix', path: 'flake.nix' },
  { source: 'system/deploy/flake.lock', path: 'flake.lock' },
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

export function ensureCompatibilityEntrypoints(root) {
  const touched = [];
  for (const entry of COMPATIBILITY_ENTRYPOINTS) {
    const sourcePath = repoPath(root, entry.source);
    if (!existsSync(sourcePath)) continue;
    const entryPath = repoPath(root, entry.path);
    try {
      mkdirSync(dirname(entryPath), { recursive: true });
      cpSync(sourcePath, entryPath, { recursive: true, force: true, preserveTimestamps: true });
      touched.push(entry.path);
    } catch {
      continue;
    }
  }
  return touched;
}
