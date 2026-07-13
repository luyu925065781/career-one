import { Send } from "lucide-react";
import { ApplyView } from "@/components/apply-view";
import { ApplyBackdropMount } from "@/components/apply/apply-backdrop-mount";

export const dynamic = "force-dynamic";

export default function ApplyPage() {
  return (
    <div className="relative min-h-screen">
      {/* full-viewport blurred form wallpaper (behind everything) */}
      <ApplyBackdropMount />
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center gap-3">
          <Send className="size-6 text-icon-brand" />
          <h1 className="font-display text-2xl tracking-tight text-landing">申请辅助</h1>
        </div>
        <p className="mt-1.5 max-w-xl text-sm text-muted">
          择程AI在本机读取真实申请表，并根据你的 `cv.md` 生成填写建议。你需要逐项核对，系统只负责辅助填写，最终提交必须由你本人完成。
        </p>
        <div className="mt-6">
          <ApplyView />
        </div>
      </div>
    </div>
  );
}
