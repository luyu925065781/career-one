import { PortalsView } from "@/components/portals-view";
import { CONTEXTUAL_NAV_ITEMS } from "@/lib/nav-items";

export const dynamic = "force-dynamic";
const PageIcon = CONTEXTUAL_NAV_ITEMS.jobSources.icon;

export default function PortalsPage() {
  return (
    <div className="page-shell py-8">
      <div className="flex items-center gap-3">
        <PageIcon className="size-6 shrink-0 text-icon-brand" aria-hidden="true" />
        <h1 className="page-title">岗位来源</h1>
      </div>
      <p className="mt-1.5 w-full text-sm text-muted">
        这是可选的高级来源配置，用于招聘平台、目标公司招聘页和 ATS；不影响你直接评估招聘截图或完整 JD。
      </p>
      <p className="mt-1.5 text-xs text-faint">
        岗位与地点偏好来自求职画像；只有平台和技术来源信息保存在 <code className="text-muted">portals.yml</code>。此页面不会自动爬取或启动 Agent 搜索。
      </p>
      <div className="mt-6">
        <PortalsView />
      </div>
    </div>
  );
}
