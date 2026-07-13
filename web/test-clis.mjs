import test from "node:test";
import assert from "node:assert/strict";
import { KNOWN } from "./src/lib/clis.ts";

function cli(id) {
  const spec = KNOWN.find((item) => item.id === id);
  assert.ok(spec, `missing CLI spec: ${id}`);
  return spec;
}

test("CLI registry keeps stable unique identifiers", () => {
  const ids = KNOWN.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("WorkBuddy uses the official CodeBuddy headless command", () => {
  const spec = cli("workbuddy");
  assert.equal(spec.bin, "codebuddy");
  assert.equal(spec.run, "codebuddy -p");

  const readArgs = spec.args("总结项目");
  assert.ok(readArgs.includes("-p"));
  assert.ok(readArgs.includes("总结项目"));
  const readAllowedTools = readArgs[readArgs.indexOf("--allowedTools") + 1];
  assert.equal(readAllowedTools, "Read,Glob,Grep");
  assert.doesNotMatch(readAllowedTools, /Write|Bash/);

  const writeArgs = spec.args("生成报告", { workspaceWrite: true, liveSearch: true });
  const allowedTools = writeArgs[writeArgs.indexOf("--allowedTools") + 1];
  assert.match(allowedTools, /Write/);
  assert.match(allowedTools, /Bash\(node:\*\)/);
  assert.match(allowedTools, /WebSearch/);
});

test("TRAE uses the official trae-cli run command", () => {
  const spec = cli("trae");
  assert.equal(spec.bin, "trae-cli");
  assert.equal(spec.run, "trae-cli run");
  assert.deepEqual(spec.args("评估岗位"), ["run", "评估岗位"]);
});
