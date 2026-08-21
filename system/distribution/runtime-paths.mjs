export const RUNTIME_PATHS = [
  "AGENTS.md",
  "CLAUDE.md",
  "CODEX.md",
  "OPENCODE.md",
  "GEMINI.md",
  "KIMI.md",
  "docs/DATA_CONTRACT.md",
  "docs/DESIGN.md",
  "docs/DESIGN_SYSTEM.md",
  "docs/LEGAL_DISCLAIMER.md",
  "README.md",
  "docs/PRIVACY.md",
  "docs/TERMS.md",
  "LICENSE",
  "VERSION",
  "release.config.json",
  "career-one.mjs",
  "package.json",
  "package-lock.json",
  "start-web.mjs",
  "update-system.mjs",
  "启动择程AI.command",
  "system/",
  "scripts/",
  "Logo/",
  "web/src/",
  "web/public/",
  "web/package.json",
  "web/package-lock.json",
  "web/release.config.json",
  "web/next.config.mjs",
  "web/postcss.config.mjs",
  "web/tsconfig.json",
  "doctor.mjs",
  ".env.example",
  ".gitignore",
  ".npmignore",
  ".agents/skills/career-one/",
  "modes/",
  "templates/",
  "fonts/",
  "providers/",
  "plugins/",
  "plugins-registry/",
  "scaffolder/",
  "docs/RELEASES.md",
  "config/profile.example.yml",
  "config/tracker-aliases.json",
  "config/plugins.example.yml",
  "batch/batch-prompt.md",
  "batch/batch-runner.sh",
];

const SOURCE_FILE_OVERRIDES = new Map([
  ["CODEX.md", "system/compat/agents/CODEX.md"],
  ["OPENCODE.md", "system/compat/agents/OPENCODE.md"],
  ["GEMINI.md", "system/compat/agents/GEMINI.md"],
  ["KIMI.md", "system/compat/agents/KIMI.md"],
  ["release.config.json", "system/release.config.json"],
  ["start-web.mjs", "system/compat/start-web.mjs"],
  ["启动择程AI.command", "system/compat/启动择程AI.command"],
  ["doctor.mjs", "system/compat/doctor.mjs"],
  [".env.example", "system/config/env.example"],
  [".npmignore", "system/config/npmignore"],
  ["config/profile.example.yml", "system/config/profile.example.yml"],
  ["config/tracker-aliases.json", "system/config/tracker-aliases.json"],
  ["config/plugins.example.yml", "system/config/plugins.example.yml"],
  ["batch/batch-prompt.md", "system/batch/batch-prompt.md"],
  ["batch/batch-runner.sh", "system/batch/batch-runner.sh"],
]);

const SOURCE_PREFIX_OVERRIDES = [
  ["docs/", "system/docs/"],
  ["templates/", "system/templates/"],
  ["fonts/", "system/fonts/"],
  ["plugins-registry/", "system/plugins-registry/"],
  ["scaffolder/", "system/scaffolder/"],
];

export function runtimeSourcePath(runtimePath) {
  const normalized = normalizeRuntimePath(runtimePath);
  const exact = SOURCE_FILE_OVERRIDES.get(normalized);
  if (exact) return exact;
  for (const [runtimePrefix, sourcePrefix] of SOURCE_PREFIX_OVERRIDES) {
    if (normalized.startsWith(runtimePrefix)) {
      return `${sourcePrefix}${normalized.slice(runtimePrefix.length)}`;
    }
  }
  return normalized;
}

export const USER_DATA_PATHS = [
  "cv.md",
  "article-digest.md",
  "voice-dna.md",
  "config/profile.yml",
  "config/plugins.yml",
  "modes/_profile.md",
  "modes/_custom.md",
  "portals.yml",
  "data/",
  "reports/",
  "output/",
  "jds/",
  "interview-prep/",
  "writing-samples/",
  "plugins.local/",
  "plugins.lock",
];

export const STARTER_DIRECTORIES = [
  "data",
  "reports",
  "output",
  "jds",
  "interview-prep",
  "interview-prep/sessions",
  "writing-samples",
  "batch/logs",
  "batch/tracker-additions",
];

export function normalizeRuntimePath(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\.\//, "");
}

export function isUserDataPath(value) {
  const normalized = normalizeRuntimePath(value);
  return USER_DATA_PATHS.some((entry) => {
    const boundary = normalizeRuntimePath(entry);
    return boundary.endsWith("/") ? normalized.startsWith(boundary) : normalized === boundary;
  });
}

const NON_MAINLAND_MODE_DIRS = ["ar", "da", "de", "es", "fr", "hi", "id", "it", "ja", "ko", "pl", "pt", "ru", "tr", "ua"];

export function isDistributionOnlyExclusion(value) {
  const normalized = normalizeRuntimePath(value);
  return NON_MAINLAND_MODE_DIRS.some((locale) => normalized.startsWith(`modes/${locale}/`));
}
