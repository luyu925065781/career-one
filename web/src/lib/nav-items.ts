import { LayoutDashboard, Compass, ListChecks, Radar, FileText, BookOpenCheck, ScanSearch } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import {
  isFeatureEnabled,
  type FeatureId,
} from "@/lib/release";

// Single source of truth for navigation destinations. Primary items drive both
// desktop and mobile menus; contextual items stay attached to their parent flow.
export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  feature: FeatureId;
};

export const PRIMARY_NAV_ITEMS = {
  home: { href: "/", label: "看板", icon: LayoutDashboard, feature: "home" },
  discoverJobs: { href: "/explore", label: "发现岗位", icon: Compass, feature: "discoverJobs" },
  jobDiagnosis: { href: "/cn-diagnose", label: "岗位评估", icon: ScanSearch, feature: "jobDiagnosis" },
  pipeline: { href: "/pipeline", label: "求职进度", icon: ListChecks, feature: "pipeline" },
  interviewStories: { href: "/interview", label: "面试故事库", icon: BookOpenCheck, feature: "interviewStories" },
  cv: { href: "/cv", label: "我的简历", icon: FileText, feature: "cv" },
} satisfies Record<string, NavItem>;

export const CONTEXTUAL_NAV_ITEMS = {
  jobSources: { href: "/portals", label: "岗位来源", icon: Radar, feature: "jobSources" },
} satisfies Record<string, NavItem>;

const ALL_NAV_ITEMS: NavItem[] = Object.values(PRIMARY_NAV_ITEMS);

export const NAV_ITEMS: NavItem[] = ALL_NAV_ITEMS.filter((item) =>
  isFeatureEnabled(item.feature),
);

export function isActivePath(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
