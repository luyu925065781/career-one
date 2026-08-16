import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
} from "../scripts/system/release.mjs";

test("仓库根目录只保留稳定的系统入口脚本", () => {
  const allowed = ["career-one.mjs", "doctor.mjs", "start-web.mjs", "test-all.mjs", "update-system.mjs"];
  const actual = readdirSync(new URL("../", import.meta.url))
    .filter((name) => name.endsWith(".mjs"))
    .sort();
  assert.deepEqual(actual, allowed, `根目录脚本必须迁移到 scripts/，仅保留：${allowed.join(", ")}`);
});

test("仓库根目录只保留 README 与 Agent 自动发现文档", () => {
  const allowed = ["AGENTS.md", "CLAUDE.md", "CODEX.md", "GEMINI.md", "KIMI.md", "OPENCODE.md", "README.md"];
  const repoRoot = new URL("../", import.meta.url);
  const actual = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: repoRoot, encoding: "utf8" })
    .split("\0")
    .filter((name) => name && !name.includes("/") && name.endsWith(".md") && existsSync(new URL(name, repoRoot)))
    .sort();
  assert.deepEqual(actual, allowed, `长文档必须归档到 docs/ 或 .github/，根目录仅保留：${allowed.join(", ")}`);
});

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
  const conditionalStarts = workflow.match(/^\s*if\b.*;\s*then\s*$/gm) ?? [];
  const conditionalEnds = workflow.match(/^\s*fi\s*$/gm) ?? [];
  assert.equal(
    conditionalEnds.length,
    conditionalStarts.length,
    "Release shell conditionals must be closed before publish",
  );
  assert.match(workflow, /run:\s*node test-all\.mjs\s*$/m);
  assert.doesNotMatch(workflow, /node test-all\.mjs --quick/);
  assert.match(workflow, /run:\s*npm ci --ignore-scripts\s*$/m);
  assert.doesNotMatch(workflow, /run:\s*npm install --ignore-scripts\s*$/m);
  assert.match(workflow, /npm audit --omit=dev --audit-level=high/);
  assert.match(workflow, /uses:\s*actions\/upload-artifact@v7/);
  assert.match(workflow, /SHA256SUMS\.txt/);
  assert.match(workflow, /gh release create[\s\S]*SHA256SUMS\.txt/);

  const gitignore = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");
  assert.doesNotMatch(
    gitignore,
    /^package-lock\.json\s*$/m,
    "root package-lock.json must be committed for npm ci and release version verification",
  );
});

test("公开 README 保留核心入口并展示当前真实 npm 通道", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  assert.match(readme, /^## 快速开始$/m);
  assert.match(readme, /^## 用法$/m);
  assert.match(readme, /^## 岗位发现边界$/m);
  assert.doesNotMatch(readme, /^## 获取与使用$/m);
  assert.match(readme, /npx career-one@next/);
  assert.match(readme, /git clone https:\/\/github\.com\/luyu925065781\/career-one\.git/);
  assert.match(readme, /npm ci --ignore-scripts/);
  assert.match(readme, /国内多数招聘平台需要登录并有严格的访问控制/);
});

test("测试用户帮助入口不指向缺失的支持或商标政策", () => {
  const welcome = readFileSync(
    new URL("../.github/workflows/welcome.yml", import.meta.url),
    "utf8",
  );
  const labeler = readFileSync(new URL("../.github/labeler.yml", import.meta.url), "utf8");
  const disclaimer = readFileSync(new URL("../docs/LEGAL_DISCLAIMER.md", import.meta.url), "utf8");
  assert.match(welcome, /docs\/FAQ\.md/);
  assert.doesNotMatch(welcome, /SUPPORT\.md/);
  assert.doesNotMatch(labeler, /SUPPORT\.md/);
  assert.doesNotMatch(disclaimer, /TRADEMARK\.md/);
});

test("公开 Codex 插件声明稳定的身份、政策页面和 starter prompts", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../packages/codex-plugin/career-one/.codex-plugin/plugin.json", import.meta.url), "utf8"),
  );
  assert.equal(manifest.author.name, "NumberX");
  assert.equal(manifest.homepage, "https://github.com/luyu925065781/career-one");
  assert.equal(manifest.repository, "https://github.com/luyu925065781/career-one");
  assert.equal(manifest.license, "MIT");
  assert.equal(
    manifest.interface.privacyPolicyURL,
    "https://github.com/luyu925065781/career-one/blob/develop/docs/PRIVACY.md",
  );
  assert.equal(
    manifest.interface.termsOfServiceURL,
    "https://github.com/luyu925065781/career-one/blob/develop/docs/TERMS.md",
  );
  assert.ok(Array.isArray(manifest.interface.defaultPrompt));
  assert.ok(manifest.interface.defaultPrompt.length >= 1 && manifest.interface.defaultPrompt.length <= 3);
  for (const prompt of manifest.interface.defaultPrompt) assert.ok(prompt.length <= 128);
  assert.match(readFileSync(new URL("../docs/PRIVACY.md", import.meta.url), "utf8"), /本地|local/i);
  assert.match(readFileSync(new URL("../docs/TERMS.md", import.meta.url), "utf8"), /用户|user/i);
});

test("npm 发布工作流使用 OIDC，并严格区分 next 与 latest", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/npm-publish.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /actions\/setup-node@v6/);
  assert.match(workflow, /node-version:\s*24/);
  assert.match(workflow, /working-directory:\s*scaffolder/);
  assert.match(workflow, /npm publish --access public --tag next/);
  assert.match(workflow, /npm publish --access public --tag latest/);
  assert.match(workflow, /npm pack --dry-run/);
});

test("公开插件提交材料包含正反测试并且不会打入插件源码目录", () => {
  const cases = JSON.parse(
    readFileSync(new URL("../packages/codex-plugin/submission/test-cases.json", import.meta.url), "utf8"),
  );
  assert.equal(cases.positive.length, 5);
  assert.equal(cases.negative.length, 3);
  for (const item of cases.positive) {
    assert.ok(item.prompt);
    assert.ok(item.expected_behavior);
    assert.ok(item.expected_result_shape);
    assert.ok(item.fixture_data);
  }
  for (const item of cases.negative) {
    assert.ok(item.prompt);
    assert.ok(item.expected_behavior);
    assert.ok(item.rationale);
  }
  assert.doesNotMatch(
    readFileSync(new URL("../distribution/build-packages.mjs", import.meta.url), "utf8"),
    /submission\/test-cases\.json/,
  );
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
