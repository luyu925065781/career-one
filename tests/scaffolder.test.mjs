import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  dependencyInstallCommands,
  inferReleaseChannel,
  parseInstallArgs,
  resolveReleaseTag,
  selectReleaseTag,
} from "../scaffolder/bin/installer-core.mjs";

test("npm 安装器通过 node_modules/.bin 符号链接启动时仍执行 CLI", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "career-one-cli-"));
  const cliPath = fileURLToPath(new URL("../scaffolder/bin/cli.mjs", import.meta.url));
  const symlinkPath = join(tempRoot, "career-one");
  try {
    symlinkSync(cliPath, symlinkPath);
    const result = spawnSync(process.execPath, [symlinkPath, "--help"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /career-one \[目录\]/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("npm 安装器无参数时直接初始化，并由包版本推断发布通道", () => {
  assert.deepEqual(parseInstallArgs([], "1.1.0-beta.4"), {
    command: "init",
    target: "career-one",
    channel: "beta",
    skipInstall: false,
    help: false,
  });
  assert.equal(inferReleaseChannel("1.2.0"), "stable");
  assert.equal(inferReleaseChannel("1.2.0-rc.1"), "beta");
});

test("npm 安装器兼容 init 与直接目录参数，并允许显式通道", () => {
  assert.deepEqual(
    parseInstallArgs(["init", "my-career", "--channel", "stable", "--skip-install"], "1.1.0-beta.4"),
    {
      command: "init",
      target: "my-career",
      channel: "stable",
      skipInstall: true,
      help: false,
    },
  );
  assert.equal(parseInstallArgs(["my-career"], "1.1.0").target, "my-career");
  assert.throws(
    () => parseInstallArgs(["--channel", "development"], "1.1.0"),
    /stable.*beta/,
  );
});

test("Beta 安装只选择最高 prerelease，稳定安装拒绝 prerelease", () => {
  const releases = [
    { tag_name: "v1.1.0-beta.2", prerelease: true, draft: false },
    { tag_name: "v1.1.0-beta.10", prerelease: true, draft: false },
    { tag_name: "v1.1.0", prerelease: false, draft: false },
    { tag_name: "v9.9.9-beta.1", prerelease: true, draft: true },
  ];
  assert.equal(selectReleaseTag(releases, "beta"), "v1.1.0-beta.10");
  assert.equal(selectReleaseTag(releases[2], "stable"), "v1.1.0");
  assert.equal(selectReleaseTag(releases[0], "stable"), null);
  assert.equal(selectReleaseTag([], "beta"), null);
});

test("依赖安装使用锁文件和 ignore-scripts，并覆盖 Web 工作台", () => {
  assert.deepEqual(dependencyInstallCommands(true), [
    { location: ".", args: ["ci", "--ignore-scripts"] },
    { location: "web", args: ["ci", "--ignore-scripts"] },
  ]);
  assert.deepEqual(dependencyInstallCommands(false), [
    { location: ".", args: ["ci", "--ignore-scripts"] },
  ]);
});

test("Release 查询失败或没有匹配版本时必须停止，不能回退默认分支", async () => {
  await assert.rejects(
    resolveReleaseTag(async () => ({ ok: false, status: 404 }), "beta"),
    /GitHub Release/,
  );
  await assert.rejects(
    resolveReleaseTag(async () => ({ ok: true, json: async () => [] }), "beta"),
    /beta.*Release/i,
  );
});
