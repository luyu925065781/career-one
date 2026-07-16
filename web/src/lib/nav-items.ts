import { LayoutDashboard, Compass, ListChecks, Radar, BarChart3, FileText, Settings, ScanSearch, BookOpenCheck, Bot } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import {
  featureStageLabel,
  isFeatureEnabled,
  type FeatureId,
} from "@/lib/release";

// Single source of truth for the app's primary destinations — shared by the
// desktop sidebar and the mobile nav so they can never drift.
export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  feature: FeatureId;
  chip?: string;
};

const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "今日", icon: LayoutDashboard, feature: "home" },
  { href: "/jobs", label: "Agent 任务", icon: Bot, feature: "agentTasks" },
  { href: "/explore", label: "发现岗位", icon: Compass, feature: "discoverJobs" },
  { href: "/cn-diagnose", label: "岗位诊断", icon: ScanSearch, feature: "jobDiagnosis" },
  { href: "/pipeline", label: "求职进度", icon: ListChecks, feature: "pipeline" },
  { href: "/interview", label: "面试故事库", icon: BookOpenCheck, feature: "interviewStories" },
  { href: "/portals", label: "岗位来源", icon: Radar, feature: "jobSources" },
  { href: "/analytics", label: "数据分析", icon: BarChart3, feature: "analytics" },
  { href: "/cv", label: "我的简历", icon: FileText, feature: "cv" },
  { href: "/config", label: "设置", icon: Settings, feature: "settings" },
];

export const NAV_ITEMS: NavItem[] = ALL_NAV_ITEMS
  .filter((item) => isFeatureEnabled(item.feature))
  .map((item) => ({
    ...item,
    chip: featureStageLabel(item.feature) || undefined,
  }));

export function isActivePath(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
