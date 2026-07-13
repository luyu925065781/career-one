import { LayoutDashboard, Compass, ListChecks, Radar, BarChart3, FileText, Settings, ScanSearch, BookOpenCheck } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

// Single source of truth for the app's primary destinations — shared by the
// desktop sidebar and the mobile nav so they can never drift.
export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  chip?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "今日", icon: LayoutDashboard },
  { href: "/explore", label: "发现岗位", icon: Compass, chip: "新" },
  { href: "/cn-diagnose", label: "岗位诊断", icon: ScanSearch },
  { href: "/pipeline", label: "求职进度", icon: ListChecks },
  { href: "/interview", label: "面试故事库", icon: BookOpenCheck },
  { href: "/portals", label: "岗位来源", icon: Radar },
  { href: "/analytics", label: "数据分析", icon: BarChart3 },
  { href: "/cv", label: "我的简历", icon: FileText },
  { href: "/config", label: "设置", icon: Settings },
];

export function isActivePath(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
