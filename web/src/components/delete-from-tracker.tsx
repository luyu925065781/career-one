"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// disc#9: remove a bogus tracker row (e.g. a job marked Evaluated after the CLI
// errored mid-run). Hard delete via the core write-gate (/api/tracker/delete →
// tracker.mjs delete), behind a confirm. The soft option (status → Discarded) lives
// in StatusSelect and stays for real-but-passed applications.
export function DeleteFromTracker({ n }: { n: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [orphan, setOrphan] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function openConfirm() {
    setOpen(true);
    setErr("");
    setOrphan(null);
    try {
      const r = await fetch("/api/tracker/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ n, dryRun: true }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(d.error || "无法移除该记录。");
        return;
      }
      setOrphan(d.orphanReport ?? null);
    } catch {
      setErr("无法访问求职进度数据。");
    }
  }

  async function confirmDelete() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/tracker/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ n }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(d.error || "删除失败。");
        setBusy(false);
        return;
      }
      // Row is gone — leave the (now-orphaned) report page for the pipeline.
      router.push("/pipeline");
      router.refresh();
    } catch {
      setErr("删除失败。");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        onClick={openConfirm}
        variant="danger-ghost"
        size="sm"
      >
        <Trash2 className="size-3.5" /> 从求职进度中移除
      </Button>
    );
  }

  return (
    <div data-ui-feedback="inline" data-tone="danger" className="p-3 text-xs">
      <p className="font-medium text-foreground">永久删除求职记录 #{n}？</p>
      <p className="mt-1 text-muted">
        此操作无法撤销。{orphan ? ` 报告文件（${orphan}）仍会保留在本地磁盘。` : ""}
      </p>
      {err && <p className="mt-1.5 text-danger" role="alert">{err}</p>}
      <div className="mt-2.5 flex gap-2">
        <Button
          disabled={busy}
          onClick={confirmDelete}
          variant="danger"
          size="sm"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} 删除
        </Button>
        <Button
          disabled={busy}
          onClick={() => setOpen(false)}
          variant="tertiary"
          size="sm"
        >
          取消
        </Button>
      </div>
    </div>
  );
}
