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
        这里保留历史岗位来源设置，不会自动爬取或启动 Agent 搜索。请在招聘网站自行找到职位，再到“岗位评估”提交招聘截图或完整 JD。
      </p>
      <p className="mt-1.5 text-xs text-faint">
        数据来自 <code className="text-muted">portals.yml</code>，可以直接编辑，也可以让助手修改。
      </p>
      <div className="mt-6">
        <PortalsView />
      </div>
    </div>
  );
}
