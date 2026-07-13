import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BUILD_MODULE = join(ROOT, "distribution", "build-packages.mjs");
const MANIFEST_MODULE = join(ROOT, "distribution", "runtime-paths.mjs");
const CANONICAL_SKILL = join(ROOT, ".agents", "skills", "career-one", "SKILL.md");
const PORTABLE_CLI = join(ROOT, ".agents", "skills", "career-one", "scripts", "career-one.mjs");

test("portable distribution sources exist", () => {
  assert.ok(existsSync(BUILD_MODULE), "distribution builder is required");
  assert.ok(existsSync(MANIFEST_MODULE), "runtime path manifest is required");
  assert.ok(existsSync(PORTABLE_CLI), "the canonical Skill must own the portable CLI");
});

test("runtime manifest includes system essentials and excludes user data", async () => {
  const { RUNTIME_PATHS, USER_DATA_PATHS } = await import(pathToFileURL(MANIFEST_MODULE).href);
  for (const required of ["AGENTS.md", "doctor.mjs", "package.json", "modes/", "templates/"]) {
    assert.ok(RUNTIME_PATHS.includes(required), `runtime must include ${required}`);
  }
  for (const forbidden of USER_DATA_PATHS) {
    assert.ok(!RUNTIME_PATHS.includes(forbidden), `runtime must exclude user path ${forbidden}`);
  }
});

test("Codex and WorkBuddy builds share one Skill and initialize a clean workspace", async () => {
  const fixture = mkdtempSync(join(tmpdir(), "career-one-distribution-"));
  try {
    const { buildDistributions } = await import(pathToFileURL(BUILD_MODULE).href);
    const built = buildDistributions({ outputRoot: fixture });
    const workBuddySkill = join(built.workbuddy, "SKILL.md");
    const codexSkill = join(built.codex, "skills", "career-one", "SKILL.md");
    const codexManifest = join(built.codex, ".codex-plugin", "plugin.json");

    assert.equal(readFileSync(workBuddySkill, "utf8"), readFileSync(CANONICAL_SKILL, "utf8"));
    assert.equal(readFileSync(codexSkill, "utf8"), readFileSync(CANONICAL_SKILL, "utf8"));
    assert.equal(JSON.parse(readFileSync(codexManifest, "utf8")).name, "career-one");
    assert.ok(existsSync(built.workbuddyArchive), "WorkBuddy must receive an uploadable archive");

    for (const skillRoot of [built.workbuddy, join(built.codex, "skills", "career-one")]) {
      assert.ok(existsSync(join(skillRoot, "scripts", "career-one.mjs")));
      assert.ok(existsSync(join(skillRoot, "assets", "runtime", "doctor.mjs")));
      assert.ok(!existsSync(join(skillRoot, "assets", "runtime", "cv.md")));
      assert.ok(!existsSync(join(skillRoot, "assets", "runtime", "config", "profile.yml")));
      assert.ok(!existsSync(join(skillRoot, "assets", "runtime", "portals.yml")));
      assert.ok(!existsSync(join(skillRoot, "assets", "runtime", "web")));
    }

    const workspace = join(fixture, "workspace");
    execFileSync(process.execPath, [join(built.workbuddy, "scripts", "career-one.mjs"), "init", workspace, "--skip-install"], {
      stdio: "pipe",
    });
    assert.ok(existsSync(join(workspace, "AGENTS.md")));
    assert.ok(existsSync(join(workspace, "doctor.mjs")));
    assert.ok(existsSync(join(workspace, ".agents", "skills", "career-one", "SKILL.md")));
    assert.ok(!existsSync(join(workspace, "cv.md")));
    assert.ok(!existsSync(join(workspace, "config", "profile.yml")));
    assert.ok(!existsSync(join(workspace, "portals.yml")));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
