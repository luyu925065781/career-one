import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const BUILD_MODULE = join(ROOT, "system", "distribution", "build-packages.mjs");
const MANIFEST_MODULE = join(ROOT, "system", "distribution", "runtime-paths.mjs");
const CANONICAL_SKILL = join(ROOT, ".agents", "skills", "career-one", "SKILL.md");
const PORTABLE_CLI = join(ROOT, ".agents", "skills", "career-one", "scripts", "career-one.mjs");
const ROOT_PACKAGE = join(ROOT, "package.json");
const WEB_PACKAGE = join(ROOT, "web", "package.json");
const SCAFFOLDER_PACKAGE = join(ROOT, "system", "scaffolder", "package.json");
const DOCTOR = join(ROOT, "system", "compat", "doctor.mjs");

test("portable distribution sources exist", () => {
  assert.ok(existsSync(BUILD_MODULE), "distribution builder is required");
  assert.ok(existsSync(MANIFEST_MODULE), "runtime path manifest is required");
  assert.ok(existsSync(PORTABLE_CLI), "the canonical Skill must own the portable CLI");
});

test("Node.js runtime requirement matches Next.js 16 across every public entrypoint", () => {
  const expected = ">=20.9.0";
  const rootPackage = JSON.parse(readFileSync(ROOT_PACKAGE, "utf8"));
  const webPackage = JSON.parse(readFileSync(WEB_PACKAGE, "utf8"));
  const scaffolderPackage = JSON.parse(readFileSync(SCAFFOLDER_PACKAGE, "utf8"));
  const skill = readFileSync(CANONICAL_SKILL, "utf8");
  const doctor = readFileSync(DOCTOR, "utf8");
  const portableCli = readFileSync(PORTABLE_CLI, "utf8");

  assert.equal(rootPackage.engines?.node, expected);
  assert.equal(webPackage.engines?.node, expected);
  assert.equal(scaffolderPackage.engines?.node, expected);
  assert.match(skill, /Node\.js 20\.9\+/);
  assert.match(skill, /推荐使用 Node\.js 22 LTS/);
  assert.match(doctor, /MIN_NODE_VERSION\s*=\s*'20\.9\.0'/);
  assert.match(portableCli, /MIN_NODE_VERSION\s*=\s*"20\.9\.0"/);
});

test("runtime manifest includes system essentials and excludes user data", async () => {
  const { RUNTIME_PATHS, USER_DATA_PATHS } = await import(pathToFileURL(MANIFEST_MODULE).href);
  for (const required of ["AGENTS.md", "docs/PRIVACY.md", "docs/TERMS.md", "docs/DESIGN.md", "doctor.mjs", "package.json", "package-lock.json", "release.config.json", "scripts/", "modes/", "templates/", "Logo/", "start-web.mjs", "启动择程AI.command", "web/src/", "web/package.json"]) {
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
      assert.ok(existsSync(join(skillRoot, "assets", "runtime", "scripts", "agent", "agent-runs.mjs")));
      assert.ok(!existsSync(join(skillRoot, "assets", "runtime", "agent-runs.mjs")));
      assert.ok(existsSync(join(skillRoot, "assets", "runtime", "config", "tracker-aliases.json")));
      assert.ok(!existsSync(join(skillRoot, "assets", "runtime", "tracker-aliases.json")));
      assert.ok(existsSync(join(skillRoot, "assets", "runtime", "start-web.mjs")));
      assert.ok(existsSync(join(skillRoot, "assets", "runtime", "启动择程AI.command")));
      assert.ok((statSync(join(skillRoot, "assets", "runtime", "启动择程AI.command")).mode & 0o111) !== 0);
      assert.ok(existsSync(join(skillRoot, "assets", "runtime", "package-lock.json")));
      assert.ok(existsSync(join(skillRoot, "assets", "runtime", "web", "package.json")));
      assert.ok(existsSync(join(skillRoot, "assets", "runtime", "web", "src", "app", "jobs", "page.tsx")));
      assert.ok(existsSync(join(skillRoot, "assets", "runtime", "Logo", "logo.svg")));
      assert.ok(!existsSync(join(skillRoot, "assets", "runtime", "cv.md")));
      assert.ok(!existsSync(join(skillRoot, "assets", "runtime", "config", "profile.yml")));
      assert.ok(!existsSync(join(skillRoot, "assets", "runtime", "portals.yml")));
    }

    const workspace = join(fixture, "workspace");
    execFileSync(process.execPath, [join(built.workbuddy, "scripts", "career-one.mjs"), "init", workspace, "--skip-install"], {
      stdio: "pipe",
    });
    assert.ok(existsSync(join(workspace, "AGENTS.md")));
    assert.ok(existsSync(join(workspace, "doctor.mjs")));
    assert.ok(existsSync(join(workspace, "scripts", "agent", "agent-runs.mjs")));
    assert.ok(!existsSync(join(workspace, "agent-runs.mjs")));
    assert.ok(existsSync(join(workspace, "config", "tracker-aliases.json")));
    assert.ok(!existsSync(join(workspace, "tracker-aliases.json")));
    assert.ok(existsSync(join(workspace, "start-web.mjs")));
    assert.ok(existsSync(join(workspace, "启动择程AI.command")));
    assert.ok((statSync(join(workspace, "启动择程AI.command")).mode & 0o111) !== 0);
    assert.ok(existsSync(join(workspace, "web", "package.json")));
    assert.ok(existsSync(join(workspace, "web", "src", "app", "jobs", "page.tsx")));
    assert.ok(existsSync(join(workspace, "Logo", "logo.svg")));
    assert.ok(existsSync(join(workspace, ".agents", "skills", "career-one", "SKILL.md")));
    assert.ok(!existsSync(join(workspace, "cv.md")));
    assert.ok(!existsSync(join(workspace, "config", "profile.yml")));
    assert.ok(!existsSync(join(workspace, "portals.yml")));
    assert.ok(existsSync(join(workspace, ".git")), "portable init must create updateable Git metadata");
    assert.equal(
      execFileSync("git", ["remote", "get-url", "origin"], { cwd: workspace, encoding: "utf8" }).trim(),
      "https://github.com/luyu925065781/career-one.git",
    );
    assert.equal(
      execFileSync("git", ["status", "--porcelain"], { cwd: workspace, encoding: "utf8" }).trim(),
      "",
      "a freshly initialized portable workspace must have a clean system baseline",
    );

    execFileSync(process.execPath, [
      join(built.workbuddy, "scripts", "career-one.mjs"),
      "run",
      "start",
      "--workspace",
      workspace,
      "--intent",
      "evaluate-job",
      "--title",
      "分发包任务测试",
      "--source",
      "agent",
    ], { encoding: "utf8" });
    const run = JSON.parse(readFileSync(join(workspace, "data", "agent-runs.json"), "utf8")).runs[0];
    assert.equal(run.status, "running");
    assert.equal(run.source, "agent");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
