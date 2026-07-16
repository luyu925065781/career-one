export const RUNTIME_PATHS = [
  "AGENTS.md",
  "CLAUDE.md",
  "CODEX.md",
  "OPENCODE.md",
  "GEMINI.md",
  "KIMI.md",
  "DATA_CONTRACT.md",
  "ARCHITECTURE.md",
  "README.md",
  "LICENSE",
  "VERSION",
  "package.json",
  "start-web.mjs",
  "web/src/",
  "web/public/",
  "web/package.json",
  "web/package-lock.json",
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
  "docs/SETUP.md",
  "docs/CODEX.md",
  "docs/SUPPORTED_CLIS.md",
  "docs/FREE_TIER.md",
  "docs/CUSTOMIZATION.md",
  "docs/FAQ.md",
  "docs/APPLY_AUTOFILL.md",
  "config/profile.example.yml",
  "config/plugins.example.yml",
  "batch/batch-prompt.md",
  "batch/batch-runner.sh",
  "writing-samples/README.md",
  "interview-prep/sessions/README.md",
];

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
