import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  channelMatchesVersion,
  prepareRelease,
  readReleaseState,
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

test("当前仓库的发布状态与声明通道一致", () => {
  const config = readReleaseState();
  const result = verifyRelease({ branch: "develop", expectedChannel: config.channel });
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("邀请测试版保留 Agent 任务与共享任务注册表", () => {
  const config = readReleaseState();
  assert.equal(config.features.agentTasks, "beta");
  assert.equal(stageEnabled(config.features.agentTasks, "beta"), true);
});

test("高危依赖审查必须阻断 main 和 develop 的合并", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/dependency-review.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /branches:\s*\[main, develop\]/);
  assert.match(workflow, /fail-on-severity:\s*high/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
});

test("Release workflow 执行完整门禁并发布校验和", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/release.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /run:\s*node test-all\.mjs\s*$/m);
  assert.doesNotMatch(workflow, /node test-all\.mjs --quick/);
  assert.match(workflow, /run:\s*npm ci --ignore-scripts\s*$/m);
  assert.doesNotMatch(workflow, /run:\s*npm install --ignore-scripts\s*$/m);
  assert.match(workflow, /npm audit --omit=dev --audit-level=high/);
  assert.match(workflow, /SHA256SUMS\.txt/);
  assert.match(workflow, /gh release create[\s\S]*SHA256SUMS\.txt/);

  const gitignore = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");
  assert.doesNotMatch(
    gitignore,
    /^package-lock\.json\s*$/m,
    "root package-lock.json must be committed for npm ci and release version verification",
  );
});

test("邀请测试文档不把未发布的 npm installer 当作入口", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  const setup = readFileSync(new URL("../docs/SETUP.md", import.meta.url), "utf8");
  for (const source of [readme, setup]) {
    assert.match(source, /v1\.1\.0-beta\.1/);
    assert.match(source, /career-one-codex\.zip/);
    assert.match(source, /career-one-workbuddy\.zip/);
    assert.match(source, /npm ci --ignore-scripts/);
  }
  assert.match(readme, /不要使用[^\n]*npx career-one init/);
  assert.match(setup, /do not use[^\n]*npx career-one init/i);
});

test("测试用户帮助入口不指向缺失的支持或商标政策", () => {
  const welcome = readFileSync(
    new URL("../.github/workflows/welcome.yml", import.meta.url),
    "utf8",
  );
  const labeler = readFileSync(new URL("../.github/labeler.yml", import.meta.url), "utf8");
  const disclaimer = readFileSync(new URL("../LEGAL_DISCLAIMER.md", import.meta.url), "utf8");
  assert.match(welcome, /docs\/FAQ\.md/);
  assert.doesNotMatch(welcome, /SUPPORT\.md/);
  assert.doesNotMatch(labeler, /SUPPORT\.md/);
  assert.doesNotMatch(disclaimer, /TRADEMARK\.md/);
});

test("面向中国大陆用户的项目级 README 以中文为主", () => {
  const expectedTitles = new Map([
    ["README.md", "# 择程AI"],
    ["batch/README.md", "# 批量处理"],
    ["examples/README.md", "# 示例"],
    ["examples/dual-track-engineer-instructor/README.md", "# 示例：工程师与讲师双轨职业"],
    ["interview-prep/sessions/README.md", "# 面试记录"],
    ["modes/interview/README.md", "# 面试工作流"],
    ["plugins/README.md", "# career-one 插件"],
    ["plugins/_template/README.md", "# {{NAME}}：career-one 插件"],
    ["scaffolder/README.md", "# career-one 安装器"],
    ["seeds/README.md", "# 招聘渠道种子抓取器"],
    ["templates/README.md", "# 模板"],
    ["web/README.md", "# 择程AI Web 工作台"],
    ["writing-samples/README.md", "# 写作样本"],
  ]);

  for (const [relative, expectedTitle] of expectedTitles) {
    const source = readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
    assert.equal(source.split("\n", 1)[0], expectedTitle, `${relative} 应使用约定的中文标题`);
    assert.match(source, /[\u3400-\u9fff]/u, `${relative} 应包含中文说明`);
  }
});

test("prepare 同步所有版本文件且保留功能分级", () => {
  const root = mkdtempSync(join(tmpdir(), "career-one-release-"));
  try {
    mkdirSync(join(root, "web"), { recursive: true });
    mkdirSync(join(root, "scaffolder"), { recursive: true });
    mkdirSync(
      join(root, "packages", "codex-plugin", "career-one", ".codex-plugin"),
      { recursive: true },
    );
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
    writeFileSync(
      join(root, "packages", "codex-plugin", "career-one", ".codex-plugin", "plugin.json"),
      '{"name":"career-one","version":"1.0.0"}\n',
    );

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
    for (const relative of [
      "package.json",
      "package-lock.json",
      "web/package.json",
      "web/package-lock.json",
      "scaffolder/package.json",
    ]) {
      const manifest = JSON.parse(readFileSync(join(root, relative), "utf8"));
      assert.equal(manifest.version, "1.1.0-beta.1", `${relative} top-level version`);
      if (relative.endsWith("package-lock.json")) {
        assert.equal(manifest.packages[""].version, "1.1.0-beta.1", `${relative} root package version`);
      }
    }
    assert.equal(
      JSON.parse(
        readFileSync(
          join(root, "packages", "codex-plugin", "career-one", ".codex-plugin", "plugin.json"),
          "utf8",
        ),
      ).version,
      "1.1.0-beta.1",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
