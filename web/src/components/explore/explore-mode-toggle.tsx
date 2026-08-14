"use client";

import { Compass } from "lucide-react";
import { CostBadge } from "@/components/cost/cost-badge";

// The discovery flow has one entry: Web saves the request and the user's Agent
// performs the scan. Keep the cost label at the entry point without presenting
// a second, duplicate search mode.
export function ExploreModeToggle() {
  return (
    <div className="flex w-full rounded-xl border border-border bg-surface/40 p-1 sm:inline-flex sm:w-auto">
      <div
        aria-label="Agent 扫描，免费"
        className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-soft px-2.5 py-2 text-sm text-brand sm:flex-none sm:gap-2 sm:px-3 max-sm:min-h-[44px]"
      >
        <Compass className="size-4" aria-hidden="true" />
        <span className="font-medium">Agent 扫描</span>
        <span className="hidden sm:inline-flex">
          <CostBadge kind="free-network" size="xs" />
        </span>
      </div>
    </div>
  );
}
