"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { CANONICAL_STATES, CANONICAL_STATE_LABELS, statusDot } from "@/lib/format";
import { cn } from "@/lib/cn";

// Status writeback control. Updates the existing tracker row (status cell) via
// /api/status — never adds rows. Reverts on failure; confirms with the
// terminal-popup animation.
export function StatusSelect({
  n,
  current,
  showLabel = true,
  compact = false,
  ariaLabel = "更新求职状态",
}: {
  n: string;
  current: string;
  showLabel?: boolean;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const [status, setStatus] = useState(current);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setStatus(current);
  }, [current]);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const prev = status;
    setStatus(next);
    setBusy(true);
    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ n, status: next }),
      });
      if (!res.ok) throw new Error("write failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch {
      setStatus(prev); // revert on failure
    } finally {
      setBusy(false);
    }
  }

  const known = (CANONICAL_STATES as readonly string[]).includes(status);
  return (
    <span className={cn("inline-flex items-center", compact ? "gap-1.5" : "gap-2")}>
      {showLabel && <span className="text-xs text-faint">状态</span>}
      {compact && <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", statusDot(status))} />}
      <select
        data-ui-control
        data-density={compact ? "compact" : undefined}
        aria-label={ariaLabel}
        value={status}
        onChange={onChange}
        disabled={busy}
        className={cn(
          "rounded-md border border-border bg-surface px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus:border-brand/50 disabled:opacity-50 max-sm:min-h-[44px]",
          compact && "min-w-[7.25rem] border-outline-border bg-outline-bg px-2 py-1 text-xs hover:border-outline-border-hover hover:bg-outline-bg-hover",
        )}
      >
        {!known && <option value={status}>{status}</option>}
        {CANONICAL_STATES.map((s) => (
          <option key={s} value={s}>
            {CANONICAL_STATE_LABELS[s]}
          </option>
        ))}
      </select>
      {saved && (compact ? (
        <span role="status" className="animate-terminal-popup inline-flex text-icon-success">
          <Check aria-hidden="true" className="size-3.5" />
          <span className="sr-only">状态已保存</span>
        </span>
      ) : (
        <span role="status" className="animate-terminal-popup inline-flex items-center gap-1 text-xs font-medium text-brand">
          <Check aria-hidden="true" className="size-3" /> 已保存
        </span>
      ))}
    </span>
  );
}
