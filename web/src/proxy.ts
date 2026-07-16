import { NextRequest, NextResponse } from "next/server";
import {
  RELEASE_CONFIG,
  featureForPath,
  isFeatureEnabled,
} from "@/lib/release";

export function proxy(request: NextRequest) {
  const feature = featureForPath(request.nextUrl.pathname);
  if (!feature || isFeatureEnabled(feature)) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: "feature_unavailable",
        feature,
        channel: RELEASE_CONFIG.channel,
      },
      { status: 404 },
    );
  }

  const target = request.nextUrl.clone();
  target.pathname = "/";
  target.search = "";
  target.searchParams.set("unavailable", feature);
  return NextResponse.redirect(target);
}

export const config = {
  matcher: [
    "/jobs/:path*",
    "/explore/:path*",
    "/cn-diagnose/:path*",
    "/pipeline/:path*",
    "/interview/:path*",
    "/portals/:path*",
    "/analytics/:path*",
    "/cv/:path*",
    "/config/:path*",
    "/apply/:path*",
    "/design-system/:path*",
    "/api/agent-runs/:path*",
    "/api/runs/:path*",
    "/api/explore/:path*",
    "/api/cn-diagnose/:path*",
    "/api/tracker/:path*",
    "/api/status/:path*",
    "/api/report/:path*",
    "/api/followups/:path*",
    "/api/pipeline/:path*",
    "/api/portals/:path*",
    "/api/cv/:path*",
    "/api/cv-pdf/:path*",
    "/api/profile/:path*",
    "/api/clis/:path*",
    "/api/apply/:path*",
    "/api/assistant/:path*",
    "/api/run/:path*",
  ],
};
