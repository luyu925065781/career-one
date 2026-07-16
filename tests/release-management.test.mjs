import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  channelMatchesVersion,
  prepareRelease,
  stageEnabled,
  validateReleaseState,
  verifyRelease,
} from "../release.mjs";

test("功能阶段按正式、内测、开发通道逐级开放", () => {
  assert.equal(stageEnabled("stable", "stable"), true);
  assert.equal(stageEnabled("beta", "stable"), false);
  assert.equal(stageEnabled("development", "stable"), false);
  assert.equal(stageEnabled("beta", "beta"), true);
  assert.equal(stageEnabled("development", "beta"), false);
  assert.equal(stageEnabled("development", "development"), true);
  assert.equal(stageEnabled("hidden", "development"), false);
});

test("版本号必须与发布通道匹配", () => {
  assert.equal(channelMatchesVersion("stable", "1.2.0"), true);
  assert.equal(channelMatchesVersion("stable", "1.2.0-beta.1"), false);
  assert.equal(channelMatchesVersion("beta", "1.2.0-beta.1"), true);
  assert.equal(channelMatchesVersion("development", "1.2.0-dev.1"), true);
  assert.equal(channelMatchesVersion("development", "1.2.0"), false);
});

test("稳定版拒绝从非 main 分支发布", () => {
  const errors = validateReleaseState(
    {
      version: "1.2.0",
      channel: "stable",
      features: { home: "stable" },
    },
    { branch: "develop" },
  );
  assert.ok(errors.some((error) => error.includes("main")));
});

test("当前仓库的开发版发布状态一致", () => {
  const result = verifyRelease({ branch: "develop", expectedChannel: "development" });
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("prepare 同步所有版本文件且保留功能分级", () => {
  const root = mkdtempSync(join(tmpdir(), "career-one-release-"));
  try {
    mkdirSync(join(root, "web"), { recursive: true });
    mkdirSync(join(root, "scaffolder"), { recursive: true });
    writeFileSync(
      join(root, "release.config.json"),
      `${JSON.stringify(
        {
          version: "1.0.0",
          channel: "stable",
          features: { home: "stable", analytics: "development" },
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(
      join(root, "web", "release.config.json"),
      `${JSON.stringify(
        {
          version: "1.0.0",
          channel: "stable",
          features: { home: "stable", analytics: "development" },
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(join(root, "VERSION"), "1.0.0 # x-release-please-version\n");
    for (const relative of [
      "package.json",
      "web/package.json",
      "scaffolder/package.json",
    ]) {
      writeFileSync(join(root, relative), '{"name":"test","version":"1.0.0"}\n');
    }
    for (const relative of ["package-lock.json", "web/package-lock.json"]) {
      writeFileSync(
        join(root, relative),
        '{"name":"test","version":"1.0.0","packages":{"":{"version":"1.0.0"}}}\n',
      );
    }

    const result = prepareRelease({
      root,
      channel: "beta",
      version: "1.1.0-beta.1",
      branch: "develop",
    });
    assert.equal(result.ok, true, result.errors.join("\n"));
    assert.match(readFileSync(join(root, "VERSION"), "utf8"), /^1\.1\.0-beta\.1 /);
    const config = JSON.parse(readFileSync(join(root, "release.config.json"), "utf8"));
    assert.equal(config.features.analytics, "development");
    assert.deepEqual(
      JSON.parse(readFileSync(join(root, "web", "release.config.json"), "utf8")),
      config,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
