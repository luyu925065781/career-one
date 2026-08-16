"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { CompanyLogo } from "@/components/company-logo";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { scoreNum, scoreTone } from "@/lib/format";
import { resolveCompanyIdentity } from "@/lib/company";
import type { Application } from "@/lib/career-one";

// Awaiting-decision row: a scored role with no terminal status. One-tap Apply /
// Skip writes back through the EXISTING /api/status (UPDATE-only, canonical states).
export function DecisionCard({ app }: { app: Application }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "Applied" | "Discarded">("");
  const [done, setDone] = useState<string | null>(null);
  const score = scoreNum(app.score);
  const tone = scoreTone(app.score);
  const companyIdentity = resolveCompanyIdentity(app.company, app.via);

  const setStatus = async (status: "Applied" | "Discarded") => {
    setBusy(status);
    try {
      await fetch("/api/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ n: app.n, status }) });
      setDone(status);
      router.refresh();
    } catch {
      /* ignore */
    } finally {
      setBusy("");
    }
  };

  if (done) return null;

  return (
    <Card compact className="flex min-w-0 flex-col gap-2.5">
      <div className="flex items-start gap-2.5">
        <CompanyLogo name={app.company} size={24} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{companyIdentity.label}</p>
          <p className="truncate text-[13px] text-muted">{app.role}</p>
        </div>
        {Number.isFinite(score) && score > 0 && (
          <Badge tone={tone} className="shrink-0 px-2">
            {app.score}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!!busy}
          onClick={() => setStatus("Applied")}
          className="flex-1"
        >
          {busy === "Applied" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} 标记已投递
        </Button>
        <Button
          type="button"
          variant="tertiary"
          size="sm"
          disabled={!!busy}
          onClick={() => setStatus("Discarded")}
          className="max-sm:px-4"
        >
          {busy === "Discarded" ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />} 放弃
        </Button>
        <a
          href={`/pipeline/${app.n}`}
          title="打开报告"
          aria-label="打开报告"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0 text-faint")}
        >
          <FileText className="size-4" />
        </a>
      </div>
    </Card>
  );
}
