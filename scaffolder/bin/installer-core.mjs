export const REPOSITORY_URL = "https://github.com/luyu925065781/career-one.git";
export const STABLE_RELEASE_API = "https://api.github.com/repos/luyu925065781/career-one/releases/latest";
export const RELEASES_API = "https://api.github.com/repos/luyu925065781/career-one/releases?per_page=30";

const CHANNELS = new Set(["stable", "beta"]);
const VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;
const PUBLIC_PRERELEASE_RE = /^(?:alpha|beta|rc)(?:\.|$)/i;

function parsedVersion(tag) {
  const match = String(tag || "").trim().match(VERSION_RE);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

function compareIdentifiers(left, right) {
  const leftNumber = /^\d+$/.test(left) ? Number(left) : null;
  const rightNumber = /^\d+$/.test(right) ? Number(right) : null;
  if (leftNumber !== null && rightNumber !== null) return leftNumber - rightNumber;
  if (leftNumber !== null) return -1;
  if (rightNumber !== null) return 1;
  return left.localeCompare(right);
}

function compareVersions(leftTag, rightTag) {
  const left = parsedVersion(leftTag);
  const right = parsedVersion(rightTag);
  if (!left || !right) return 0;
  for (const key of ["major", "minor", "patch"]) {
    if (left[key] !== right[key]) return left[key] - right[key];
  }
  if (left.prerelease.length === 0 && right.prerelease.length > 0) return 1;
  if (right.prerelease.length === 0 && left.prerelease.length > 0) return -1;
  for (let index = 0; index < Math.max(left.prerelease.length, right.prerelease.length); index += 1) {
    if (left.prerelease[index] === undefined) return -1;
    if (right.prerelease[index] === undefined) return 1;
    const compared = compareIdentifiers(left.prerelease[index], right.prerelease[index]);
    if (compared !== 0) return compared;
  }
  return 0;
}

export function inferReleaseChannel(packageVersion) {
  return String(packageVersion || "").includes("-") ? "beta" : "stable";
}

export function parseInstallArgs(argv, packageVersion) {
  const result = {
    command: "init",
    target: "career-one",
    channel: inferReleaseChannel(packageVersion),
    skipInstall: false,
    help: false,
  };
  let hasTarget = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (index === 0 && arg === "init") continue;
    if (arg === "-h" || arg === "--help") {
      result.help = true;
      continue;
    }
    if (arg === "--skip-install") {
      result.skipInstall = true;
      continue;
    }
    if (arg === "--channel") {
      const channel = argv[index + 1];
      if (!CHANNELS.has(channel)) throw new Error("--channel 只能是 stable 或 beta");
      result.channel = channel;
      index += 1;
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`未知参数 ${arg}`);
    if (hasTarget) throw new Error(`只能指定一个安装目录，收到额外参数 ${arg}`);
    result.target = arg;
    hasTarget = true;
  }
  return result;
}

export function selectReleaseTag(payload, channel) {
  if (!CHANNELS.has(channel)) throw new Error(`未知发布通道 ${channel}`);
  const releases = Array.isArray(payload) ? payload : payload ? [payload] : [];
  const candidates = releases.filter((release) => {
    if (!release || release.draft || !parsedVersion(release.tag_name)) return false;
    const prerelease = parsedVersion(release.tag_name).prerelease.join(".");
    if (channel === "stable") return !release.prerelease && prerelease.length === 0;
    return Boolean(release.prerelease) && PUBLIC_PRERELEASE_RE.test(prerelease);
  });
  candidates.sort((left, right) => compareVersions(right.tag_name, left.tag_name));
  return candidates[0]?.tag_name || null;
}

export async function resolveReleaseTag(fetchImpl, channel) {
  if (!CHANNELS.has(channel)) throw new Error(`未知发布通道 ${channel}`);
  const url = channel === "stable" ? STABLE_RELEASE_API : RELEASES_API;
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "career-one-cli",
    },
  });
  if (!response?.ok) {
    throw new Error(`无法读取 GitHub Release（HTTP ${response?.status || "unknown"}）`);
  }
  const tag = selectReleaseTag(await response.json(), channel);
  if (!tag) throw new Error(`没有找到可安装的 ${channel} GitHub Release`);
  return tag;
}

export function dependencyInstallCommands(hasWeb) {
  const commands = [{ location: ".", args: ["ci", "--ignore-scripts"] }];
  if (hasWeb) commands.push({ location: "web", args: ["ci", "--ignore-scripts"] });
  return commands;
}
