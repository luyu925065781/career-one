#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = join(ROOT, "web");
const DEFAULT_PORT = 3301;

function optionValue(args, name) {
  const index = args.lastIndexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function readPort(args) {
  const raw = optionValue(args, "--port") || process.env.PORT || String(DEFAULT_PORT);
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`无效端口：${raw}`);
  return port;
}

function readPage(args) {
  const raw = optionValue(args, "--page") || "/jobs";
  const page = String(raw).trim();
  if (!page.startsWith("/") || page.startsWith("//") || /[\r\n]/.test(page)) {
    throw new Error(`无效页面：${raw}`);
  }
  return page;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function portIsListening(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(700, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

export function htmlLooksLikeWorkbench(html) {
  const content = String(html || "");
  return content.includes("择程AI")
    && (
      content.includes("AI求职工作台")
      || content.includes("Agent 任务")
      || content.includes("求职进度")
    );
}

async function isCareerOneWorkbench(port) {
  try {
    const response = await fetch(`http://localhost:${port}`, {
      signal: AbortSignal.timeout(1800),
      cache: "no-store",
    });
    if (!response.ok) return false;
    const html = await response.text();
    return htmlLooksLikeWorkbench(html);
  } catch {
    return false;
  }
}

function openBrowser(url) {
  let command;
  let commandArgs;
  if (process.platform === "darwin") {
    command = "open";
    commandArgs = [url];
  } else if (process.platform === "win32") {
    command = "cmd";
    commandArgs = ["/c", "start", "", url];
  } else {
    command = "xdg-open";
    commandArgs = [url];
  }
  const opener = spawn(command, commandArgs, { detached: true, stdio: "ignore", windowsHide: true });
  opener.once("error", () => {
    console.log(`浏览器未能自动打开，请手动访问：${url}`);
  });
  opener.unref();
}

async function waitForWorkbench(port, child, getSpawnError = () => null, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const spawnError = getSpawnError();
    if (spawnError) throw new Error(`Next.js 无法启动：${spawnError.message}`);
    if (child.exitCode !== null) throw new Error(`Next.js 已提前退出（退出码 ${child.exitCode}）`);
    if (await isCareerOneWorkbench(port)) return;
    await delay(300);
  }
  throw new Error(`等待工作台启动超时：http://localhost:${port}`);
}

export async function startWeb(argv = process.argv.slice(2)) {
  const port = readPort(argv);
  const page = readPage(argv);
  const baseUrl = `http://localhost:${port}`;
  const targetUrl = `${baseUrl}${page}`;
  const shouldOpen = argv.includes("--open") || argv.includes("--page");
  const background = argv.includes("--background");

  if (argv.includes("--dry-run")) {
    console.log(`将启动或复用择程AI工作台：${baseUrl}`);
    console.log(`任务上下文页面：${targetUrl}${shouldOpen ? "（将自动打开）" : ""}`);
    return;
  }

  if (await portIsListening(port)) {
    if (!(await isCareerOneWorkbench(port))) {
      throw new Error(`端口 ${port} 已被其他服务占用；为保护现有进程，择程AI不会自动关闭它`);
    }
    console.log(`✓ 已复用正在运行的择程AI工作台：${baseUrl}`);
    console.log(`→ 当前任务页面：${targetUrl}`);
    if (shouldOpen) openBrowser(targetUrl);
    return;
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  console.log(`→ 正在${background ? "后台" : ""}启动择程AI工作台：${baseUrl}`);
  const child = spawn(npmCommand, ["run", "dev", "--", "--port", String(port)], {
    cwd: WEB_DIR,
    env: process.env,
    detached: background,
    stdio: background ? "ignore" : "inherit",
    shell: false,
    windowsHide: background,
  });
  let spawnError;
  child.once("error", (error) => {
    spawnError = error;
    if (!background) {
      console.error(`启动前端失败：${error.message}`);
      process.exitCode = 1;
    }
  });
  if (background) {
    child.unref();
  } else {
    child.once("exit", (code, signal) => {
      if (signal) console.log(`前端服务已由信号 ${signal} 停止`);
      process.exitCode = code ?? (signal ? 1 : 0);
    });
  }

  await waitForWorkbench(port, child, () => spawnError);
  console.log(`✓ 择程AI工作台已就绪：${baseUrl}`);
  console.log(`→ 当前任务页面：${targetUrl}`);
  if (shouldOpen) openBrowser(targetUrl);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  startWeb().catch((error) => {
    console.error(`启动前端失败：${error.message}`);
    process.exitCode = 1;
  });
}
