import { PortalsView } from "@/components/portals-view";
import { CONTEXTUAL_NAV_ITEMS } from "@/lib/nav-items";

export const dynamic = "force-dynamic";
const PageIcon = CONTEXTUAL_NAV_ITEMS.jobSources.icon;

export default function PortalsPage() {
  return (
    <div className="page-shell py-8">
      <div className="flex items-center gap-3">
        <PageIcon className="size-6 shrink-0 text-icon-brand" aria-hidden="true" />
        <h1 className="font-display text-2xl tracking-tight text-landing">岗位来源</h1>
      </div>
      <p className="mt-1.5 w-full text-sm text-muted">
        管理招聘平台、目标公司和搜索规则。所有设置保存在本机，并由择程AI的扫描与 Agent 工作流共同使用。
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
