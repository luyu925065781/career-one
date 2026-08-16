"use client";

import { useRouter } from "next/navigation";
import { Send, Lock } from "lucide-react";
import { useJobs } from "@/components/jobs/job-store";
import { useApply } from "@/components/apply/apply-provider";
import { Button } from "@/components/ui/button";

// The "Apply" CTA — brand orange, paper-plane. Enabled ONLY when the tailored CV
// for THIS offer is ready (the tracker's PDF column is ✅, or a pdf worker for
// this #n just finished). On click it opens the apply form-proxy for the offer
// (where the user reviews and submits it themselves — never auto-submit).
export function ApplyButton({ n, url, company, pdfReady }: { n: string; url?: string; company: string; pdfReady: boolean }) {
  const router = useRouter();
  const { jobs } = useJobs();
  const apply = useApply();

  const pdfJobDone = jobs.some((j) => j.kind === "pdf" && j.input === n && j.status === "done");
  const hasUrl = !!url && /^https?:\/\//i.test(url);
  const ready = (pdfReady || pdfJobDone) && hasUrl;

  if (!ready) {
    return (
      <Button
        type="button"
        variant="tertiary"
        size="sm"
        disabled
        title={!hasUrl ? "报告中没有投递网址" : "请先生成岗位定制简历 PDF"}
        className="cursor-not-allowed"
      >
        <Lock className="size-3.5" /> 投递
      </Button>
    );
  }
  return (
    <Button
      type="button"
      size="sm"
      onClick={() => {
        apply.open(url!, { prefill: true, company });
        router.push("/apply");
      }}
      title="打开预填后的投递表单，由你检查并亲自提交"
    >
      <Send className="size-3.5" /> 投递
    </Button>
  );
}
