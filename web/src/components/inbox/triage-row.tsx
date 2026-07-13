"use client";

import Link from "next/link";
import { Bookmark, BookmarkCheck, Loader2, X } from "lucide-react";
import type { InboxJob } from "@/lib/career-one";
import type { AtsSource } from "@/lib/explore";
import { ATS_LABEL } from "@/lib/explore";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/company-logo";
import { cn } from "@/lib/cn";

export type RowScore = { score: number | null; tone: "good" | "warn" | "bad" | "muted"; jobId: string; running: boolean };

function agoLabel(age: number | null): string | null {
  if (age == null) return null;
  if (age <= 0) return "今天";
  if (age === 1) return "昨天";
  if (age < 7) return `${age} 天前`;
  if (age < 30) return `${Math.floor(age / 7)} 周前`;
  return `${Math.floor(age / 30)} 个月前`;
}

// One raw posting in the triage list. Shows ONLY cheap, free signals + an honest
// "not scored" (CRUDA) — never a fake match%. Once its shortlist eval finishes it
// flips to EVALUADA (a real A–F badge). Save→shortlist / Skip→hidden are free + undoable.
export function TriageRow({
  job,
  source,
  age,
  scored,
  selected,
  shortlisted,
  onToggleSelect,
  onSave,
  onSkip,
}: {
  job: InboxJob;
  source: AtsSource | null;
  age: number | null;
  scored?: RowScore;
  selected: boolean;
  shortlisted: boolean;
  onToggleSelect: () => void;
  onSave: () => void;
  onSkip: () => void;
}) {
  const ago = agoLabel(age);
  const evaluated = !!scored && (scored.running || scored.score != null);

  return (
    <li
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 transition-colors sm:gap-3 sm:px-4",
        selected ? "bg-brand-soft/50" : "hover:bg-surface-hover",
        evaluated && "opacity-95",
      )}
    >
      {/* multi-select — power-user batch to shortlist */}
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        aria-label={`选择 ${job.company} ${job.role}`}
        className="size-4 shrink-0 accent-brand max-sm:min-h-[44px] max-sm:min-w-[24px]"
      />

      <CompanyLogo name={job.company} size={20} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <span className="font-medium text-foreground">{job.company}</span>
          <span className="text-muted"> · {job.role}</span>
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-faint">
          {job.location && <span className="truncate">{job.location}</span>}
          {source && <span className="rounded bg-surface-hover px-1 py-px font-medium text-muted">{ATS_LABEL[source]}</span>}
          {ago && <span>{ago}</span>}
          {/* 🔴 CRUDA: honest "not scored" — no fabricated match%. */}
          {!evaluated && <span className="italic text-muted">尚未评分</span>}
        </p>
      </div>

      {/* EVALUADA state (right-aligned, visually distinct from raw rows) */}
      {evaluated ? (
        <Link href={`/jobs/${scored!.jobId}`} className="flex shrink-0 items-center gap-1.5 text-xs">
          {scored!.running ? (
            <>
              <Loader2 className="size-3.5 animate-spin text-icon-brand" />
              <span className="text-brand max-sm:hidden">评分中…</span>
            </>
          ) : (
            <Badge tone={scored!.tone}>{scored!.score}/5</Badge>
          )}
        </Link>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onSave}
            title={shortlisted ? "已加入候选清单" : "保存到候选清单"}
            aria-pressed={shortlisted}
            className={cn(
              "inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors max-sm:min-h-[44px] max-sm:min-w-[44px]",
              shortlisted ? "text-brand" : "text-muted hover:bg-surface-hover hover:text-brand",
            )}
          >
            {shortlisted ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
            <span className="max-sm:hidden">{shortlisted ? "已保存" : "保存"}</span>
          </button>
          <button
            type="button"
            onClick={onSkip}
            title="跳过并从岗位收件箱隐藏"
            className="inline-flex items-center justify-center rounded-md p-1 text-faint transition-colors hover:bg-surface-hover hover:text-foreground max-sm:min-h-[44px] max-sm:min-w-[44px]"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </li>
  );
}
