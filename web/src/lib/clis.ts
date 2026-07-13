import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Server-only (node imports). The agnostic runtimes career-one can delegate to
// in headless mode (AGENTS.md). Install URLs from career-one-docs.
export type CliSpec = {
  id: string;
  name: string;
  bin: string;
  run: string;
  url: string;
  /** headless invocation args for a single prompt */
  args: (prompt: string, options?: CliRunOptions) => string[];
};

export type CliRunOptions = {
  /**
   * Allow the worker to write inside the repository. Required for Codex when a
   * workflow must persist reports, tracker rows, or generated PDFs.
   */
  workspaceWrite?: boolean;
  /** Enable live web search for discovery/research-style prompts. */
  liveSearch?: boolean;
};

function codexArgs(prompt: string, options: CliRunOptions = {}): string[] {
  const args = ["exec"];
  if (options.workspaceWrite) args.push("--sandbox", "workspace-write");
  if (options.liveSearch) args.push("--search");
  args.push(prompt);
  return args;
}

function codebuddyArgs(prompt: string, options: CliRunOptions = {}): string[] {
  const allowed = ["Read", "Glob", "Grep"];
  if (options.liveSearch) allowed.push("WebFetch", "WebSearch");
  if (options.workspaceWrite) allowed.push("Edit", "Write", "Bash(node:*)", "Bash(npm:*)");

  const disallowed = ["Task", "NotebookEdit"];
  if (!options.workspaceWrite) disallowed.push("Edit", "Write", "Bash");

  return [
    "-p",
    prompt,
    "--permission-mode",
    "dontAsk",
    "--allowedTools",
    allowed.join(","),
    "--disallowedTools",
    disallowed.join(","),
  ];
}

export const KNOWN: CliSpec[] = [
  { id: "claude", name: "Claude Code", bin: "claude", run: "claude -p", url: "https://claude.ai/code", args: (p) => ["-p", p] },
  { id: "codex", name: "Codex", bin: "codex", run: "codex exec", url: "https://developers.openai.com/codex", args: codexArgs },
  { id: "workbuddy", name: "WorkBuddy（CodeBuddy CLI）", bin: "codebuddy", run: "codebuddy -p", url: "https://www.workbuddy.cn/cli/", args: codebuddyArgs },
  { id: "trae", name: "TRAE Agent CLI", bin: "trae-cli", run: "trae-cli run", url: "https://github.com/bytedance/trae-agent", args: (p) => ["run", p] },
  { id: "gemini", name: "Gemini CLI", bin: "gemini", run: "gemini -p", url: "https://github.com/google-gemini/gemini-cli", args: (p) => ["-p", p] },
  { id: "opencode", name: "OpenCode", bin: "opencode", run: "opencode run", url: "https://opencode.ai", args: (p) => ["run", p] },
  { id: "copilot", name: "GitHub Copilot CLI", bin: "copilot", run: "copilot -p", url: "https://docs.github.com/en/copilot/github-copilot-in-the-cli", args: (p) => ["-p", p] },
  { id: "qwen", name: "Qwen CLI", bin: "qwen", run: "qwen -p", url: "https://qwen.ai/qwencode", args: (p) => ["-p", p] },
  { id: "antigravity", name: "Antigravity CLI", bin: "agy", run: "agy -p", url: "https://antigravity.google", args: (p) => ["-p", p] },
];

function searchDirs(): string[] {
  const home = os.homedir();
  const nvmRoot = process.env.NVM_DIR || path.join(home, ".nvm");
  let nvmVersionBins: string[] = [];
  try {
    nvmVersionBins = fs
      .readdirSync(path.join(nvmRoot, "versions/node"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .map((version) => path.join(nvmRoot, "versions/node", version, "bin"));
  } catch {
    // NVM is optional; continue with PATH and the standard install locations.
  }
  const extra = [
    ...(process.env.NVM_BIN ? [process.env.NVM_BIN] : []),
    ...nvmVersionBins,
    path.join(home, ".local/bin"),
    path.join(home, ".npm-global/bin"),
    path.join(home, ".bun/bin"),
    path.join(home, ".deno/bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
  ];
  if (process.platform === "win32") {
    // Windows CLIs frequently install under per-user AppData roots and don't
    // reliably add themselves to PATH (e.g. Antigravity → %LOCALAPPDATA%\agy\bin).
    const localAppData = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
    const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    extra.push(
      path.join(localAppData, "agy", "bin"), // Antigravity CLI
      path.join(localAppData, "Microsoft", "WindowsApps"), // winget/Store shims
      path.join(appData, "npm"), // npm global prefix on Windows
    );
  }
  const fromPath = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  return [...new Set([...fromPath, ...extra])];
}

// On Windows, executables carry an extension (claude.exe, claude.cmd, ...).
// Mirror the shell's PATHEXT resolution so a native-installer claude.exe is
// found, not just an extensionless npm shim. On POSIX, "" keeps the bare name.
function binCandidates(bin: string): string[] {
  if (process.platform !== "win32") return [bin];
  const pathext = process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD";
  const exts = pathext
    .split(";")
    .map((e) => e.trim())
    .filter(Boolean)
    // Only include extensions that `child_process.spawn()` can execute directly.
    .filter((e) => [".com", ".exe", ".bat", ".cmd"].includes(e.toLowerCase()));

  // Try the bare name too (some environments provide an extensionless shim).
  return [bin, ...exts.map((ext) => bin + ext)];
}

export function findBin(bin: string, dirs = searchDirs()): string | null {
  for (const dir of dirs) {
    for (const candidate of binCandidates(bin)) {
      const p = path.join(dir, candidate);
      try {
        fs.accessSync(p, fs.constants.X_OK);
        return p;
      } catch {
        /* not here */
      }
    }
  }
  return null;
}

export function detectClis() {
  const dirs = searchDirs();
  return KNOWN.map((c) => {
    const found = findBin(c.bin, dirs);
    return { id: c.id, name: c.name, run: c.run, url: c.url, installed: !!found, path: found };
  });
}

export function resolveCli(id: string): { spec: CliSpec; binPath: string } | null {
  const spec = KNOWN.find((c) => c.id === id);
  if (!spec) return null;
  const binPath = findBin(spec.bin);
  if (!binPath) return null;
  return { spec, binPath };
}
