import { RELEASE_CONFIG } from "@/lib/release";

// Build metadata comes from the repository-level release.config.json injected by
// next.config.mjs. release.mjs verifies that VERSION and package versions match it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shortSha(): string {
  return (
    process.env.GITHUB_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    ""
  ).slice(0, 7);
}

export async function GET() {
  return Response.json({
    version: RELEASE_CONFIG.version,
    coreVersion: RELEASE_CONFIG.version,
    channel: RELEASE_CONFIG.channel,
    sha: shortSha(),
  });
}
