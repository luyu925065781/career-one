export type ReleaseChannel = "stable" | "beta" | "development";
export type FeatureStage = "stable" | "beta" | "development" | "hidden";
export type FeatureId =
  | "home"
  | "agentTasks"
  | "discoverJobs"
  | "jobDiagnosis"
  | "pipeline"
  | "interviewStories"
  | "jobSources"
  | "analytics"
  | "cv"
  | "settings"
  | "apply"
  | "assistant"
  | "designSystem";

const CHANNEL_LABELS: Record<ReleaseChannel, string> = {
  stable: "正式版",
  beta: "内测版",
  development: "开发版",
};

const STAGE_LABELS: Record<FeatureStage, string> = {
  stable: "",
  beta: "内测",
  development: "开发",
  hidden: "隐藏",
};

export const RELEASE_CONFIG = releaseConfig as {
  version: string;
  channel: ReleaseChannel;
  features: Record<FeatureId, FeatureStage>;
};

export function isStageEnabled(
  stage: FeatureStage,
  channel: ReleaseChannel = RELEASE_CONFIG.channel,
): boolean {
  if (stage === "hidden") return false;
  if (channel === "development") return true;
  if (channel === "beta") return stage === "stable" || stage === "beta";
  return stage === "stable";
}

export function featureStage(feature: FeatureId): FeatureStage {
  return RELEASE_CONFIG.features[feature];
}

export function isFeatureEnabled(
  feature: FeatureId,
  channel: ReleaseChannel = RELEASE_CONFIG.channel,
): boolean {
  return isStageEnabled(featureStage(feature), channel);
}

export function releaseChannelLabel(channel = RELEASE_CONFIG.channel): string {
  return CHANNEL_LABELS[channel];
}

export function featureStageLabel(feature: FeatureId): string {
  return STAGE_LABELS[featureStage(feature)];
}

export function releaseDisplayLabel(): string {
  return `${RELEASE_CONFIG.version} · ${releaseChannelLabel()}`;
}

const ROUTE_FEATURES: Array<[prefix: string, feature: FeatureId]> = [
  ["/api/agent-runs", "agentTasks"],
  ["/api/runs", "agentTasks"],
  ["/api/explore", "discoverJobs"],
  ["/api/cn-diagnose", "jobDiagnosis"],
  ["/api/tracker", "pipeline"],
  ["/api/status", "pipeline"],
  ["/api/report", "pipeline"],
  ["/api/followups", "pipeline"],
  ["/api/pipeline", "pipeline"],
  ["/api/portals", "jobSources"],
  ["/api/cv-pdf", "cv"],
  ["/api/cv", "cv"],
  ["/api/profile", "settings"],
  ["/api/clis", "settings"],
  ["/api/apply", "apply"],
  ["/api/assistant", "assistant"],
  ["/api/run", "assistant"],
  ["/design-system", "designSystem"],
  ["/cn-diagnose", "jobDiagnosis"],
  ["/interview", "interviewStories"],
  ["/analytics", "analytics"],
  ["/pipeline", "pipeline"],
  ["/portals", "jobSources"],
  ["/explore", "discoverJobs"],
  ["/config", "settings"],
  ["/apply", "apply"],
  ["/jobs", "agentTasks"],
  ["/cv", "cv"],
];

export function featureForPath(pathname: string): FeatureId | null {
  const path = pathname.split(/[?#]/, 1)[0] || "/";
  if (path === "/") return "home";
  const match = ROUTE_FEATURES.find(
    ([prefix]) => path === prefix || path.startsWith(`${prefix}/`),
  );
  return match?.[1] || null;
}

export function isPathEnabled(
  pathname: string,
  channel: ReleaseChannel = RELEASE_CONFIG.channel,
): boolean {
  const feature = featureForPath(pathname);
  return feature ? isFeatureEnabled(feature, channel) : true;
}
import releaseConfig from "../../release.config.json";
