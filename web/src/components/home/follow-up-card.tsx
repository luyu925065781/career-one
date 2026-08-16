"use client";

import { useState } from "react";
import { Check, Clock, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { CompanyLogo } from "@/components/company-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { resolveCompanyIdentity } from "@/lib/company";

export type FollowUp = { num?: number; company: string; role?: string; status?: string; appliedDate?: string; notes?: string };

// One-tap overdue follow-up row (demand loop). "Mark followed up" appends to
// data/follow-ups.md (append-only) and optimistically clears the row; snoozing is
// a client dismiss. The cadence is the core's — we just surface + record.
export function FollowUpCard({ followup, onLogged }: { followup: FollowUp; onLogged?: () => void }) {
  const [state, setState] = useState<"idle" | "logging" | "done" | "snoozed">("idle");
  const companyIdentity = resolveCompanyIdentity(followup.company);
  if (state === "snoozed" || state === "done") return null;

  const log = async () => {
    setState("logging");
    try {
      await fetch("/api/followups/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ num: followup.num, company: followup.company, note: "已跟进" }),
      });
    } catch {
      /* best-effort */
    }
    onLogged?.();
    setState("done");
  };

  return (
    <Card compact className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex min-w-0 flex-[1_1_55%] items-center gap-3">
        <CompanyLogo name={followup.company} size={22} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            <span className="font-medium text-foreground">{companyIdentity.label}</span>
            {followup.role && <span className="text-muted"> · {followup.role}</span>}
          </p>
          <p className="flex items-center gap-1 text-[11px] text-faint">
            <Clock className="size-3" /> {followup.appliedDate ? `投递于 ${followup.appliedDate}` : "待跟进"}
          </p>
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={state === "logging"}
          onClick={log}
          className="whitespace-nowrap"
        >
          {state === "logging" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} <span className="hidden sm:inline">标记已跟进</span><span className="sm:hidden">已跟进</span>
        </Button>
        {followup.num != null && (
          <a href={`/pipeline/${followup.num}?view=report`} title="打开报告" aria-label="打开报告" className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "shrink-0 text-faint")}>
            <FileText className="size-4" />
          </a>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={() => setState("snoozed")} className="shrink-0 text-faint">
          稍后提醒
        </Button>
      </div>
    </Card>
  );
}
