"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { CoMark } from "@/components/co-mark";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { JobsProvider } from "@/components/jobs/job-store";
import { PipelineProvider } from "@/components/pipeline/pipeline-provider";
import { ApplyProvider } from "@/components/apply/apply-provider";
import { ExploreProvider } from "@/components/explore/explore-provider";
import { FirstScoreView } from "@/components/explore/first-score-view";
import { WorkerPills } from "@/components/jobs/worker-pills";
import { NAV_ITEMS, isActivePath } from "@/lib/nav-items";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <JobsProvider>
      <PipelineProvider>
      <ApplyProvider>
      <ExploreProvider>
      <MobileNav />
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-hidden border-r border-border bg-surface/30 p-4 md:flex">
          <Link href="/" className="mb-8 flex items-center gap-2.5 px-1">
            <CoMark size={28} />
            <span className="font-sans text-xl font-semibold tracking-normal text-landing">
              择程AI
            </span>
          </Link>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActivePath(href, pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-brand-soft text-brand-text"
                      : "text-muted hover:bg-surface-hover hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <WorkerPills />

          <div className="-mb-4 -mx-4 mt-auto border-t border-border px-4 py-2">
            <div className="flex h-7 items-center justify-between px-1">
              <span className="whitespace-nowrap font-sans text-sm font-normal leading-none tracking-[0.14em] text-faint">择路扬帆，前程似锦</span>
              <ThemeToggle />
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-x-hidden">{children}</main>
        <FirstScoreView />
      </div>
      </ExploreProvider>
      </ApplyProvider>
      </PipelineProvider>
    </JobsProvider>
  );
}
