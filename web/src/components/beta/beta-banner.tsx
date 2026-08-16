"use client";

import { useEffect, useState } from "react";
import { Bug, X, ShieldCheck, ThumbsUp, Search, Loader2 } from "lucide-react";
import { collect, fingerprint, issueBody, issueUrl, type Diag } from "@/lib/report/report";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import "@/lib/report/logbuf"; // install the client error ring-buffer (side-effect)

type SimilarIssue = { number: number; title: string; url: string };

// Dupe-deflection at write (the maintainer's #1 triage cost): search open
// issues client-side via GitHub's public search API — no key, no server of
// ours. Best-effort: rate-limited or offline → silently no suggestions.
const searchCache = new Map<string, SimilarIssue[]>();
async function searchIssues(q: string): Promise<SimilarIssue[]> {
  const cached = searchCache.get(q);
  if (cached) return cached;
  try {
    const res = await fetch(
      `https://api.github.com/search/issues?per_page=4&q=${encodeURIComponent(`repo:luyu925065781/career-one is:issue is:open ${q}`)}`,
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (!res.ok) return [];
    const d = await res.json();
    const items: SimilarIssue[] = (d.items || []).map((i: { number: number; title: string; html_url: string }) => ({
      number: i.number,
      title: i.title,
      url: i.html_url,
    }));
    searchCache.set(q, items);
    return items;
  } catch {
    return [];
  }
}

// Pre-release feedback entry: a one-click "Report a bug" button that opens a
// PRE-FILLED GitHub issue. There is no telemetry to any server (local-first /
// firewall) — the user reviews the exact, PII-scrubbed payload
// (preview-then-confirm) and clicks to open the issue himself.
export function BetaBanner() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [diag, setDiag] = useState<Diag | null>(null);
  const [similar, setSimilar] = useState<SimilarIssue[]>([]);
  const [searching, setSearching] = useState(false);

  // Text search is behind an EXPLICIT click, never as-you-type: the user's
  // words (which can name a company) must not reach api.github.com at keystroke
  // time — that would break the banner's "nothing is sent until you click"
  // pledge, and scrub() is a path/secret scrubber, not a free-text one, so it
  // could not remove the company name anyway. The click IS the consent.
  const checkExisting = async () => {
    const words = desc.trim().split(/\s+/).slice(0, 6).join(" ");
    if (!words) return;
    setSearching(true);
    const found = await searchIssues(`label:web-alpha ${words}`);
    setSearching(false);
    if (found.length) setSimilar(found);
  };

  useEffect(() => {
    fetch("/api/version")
      .then((r) => r.json())
      .then((d) => {
        if (d?.channel && d.channel !== "stable") setVisible(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const openReport = async () => {
    const d = await collect();
    setDiag(d);
    setOpen(true);
    // One exact-match search by fingerprint: same bug already filed → the
    // strongest dedupe signal, shown before the user types a word.
    searchIssues(`in:body "${fingerprint(d)}"`).then((found) => {
      if (found.length) setSimilar(found);
    });
  };

  if (!visible) return null;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={openReport}
        className="fixed bottom-3 right-3 z-[70] shadow-lg"
      >
        <Bug className="size-3" /> 反馈问题
      </Button>

      {open && diag && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="反馈问题" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-[var(--bg)] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <Bug className="size-4 text-icon-brand" />
              <h2 className="text-sm font-semibold text-foreground">反馈问题 · {diag.channel}</h2>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="关闭" className="ml-auto text-faint">
                <X className="size-4" />
              </Button>
            </div>
            <textarea
              data-ui-control
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
              autoFocus
              placeholder="请描述当时的操作和遇到的问题"
              className="w-full resize-none rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm outline-none transition focus:border-brand/50"
            />
            {desc.trim().split(/\s+/).length >= 3 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={checkExisting}
                disabled={searching}
                className="mt-2 text-muted"
              >
                {searching ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />} 先查找相似反馈
              </Button>
            )}
            <details className="mt-3 rounded-lg border border-border bg-surface/40">
              <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted">查看将要附带的诊断信息，提交前可检查 ↓</summary>
              <pre className="max-h-52 overflow-auto whitespace-pre-wrap border-t border-border px-3 py-2 font-mono text-[11px] leading-relaxed text-muted">{issueBody(diag, desc)}</pre>
            </details>
            {similar.length > 0 && (
              <div data-ui-feedback="inline" data-tone="warning" className="mt-3 px-3 py-2">
                <p className="text-xs font-medium">可能已有相同问题，优先为现有 issue 点赞：</p>
                <ul className="mt-1.5 space-y-1">
                  {similar.map((s) => (
                    <li key={s.number}>
                      <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-foreground underline-offset-2 transition-colors hover:text-interactive-hover hover:underline">
                        <ThumbsUp className="size-3 shrink-0 text-icon-warning" />
                        <span className="font-mono">#{s.number}</span> {s.title.slice(0, 60)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-faint">
              <ShieldCheck className="mt-px size-3.5 shrink-0 text-icon-success" /> 你确认后才会打开 GitHub issue；点击前不会发送任何内容，也不会包含简历、个人配置、投递回答或岗位网址。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="tertiary" onClick={() => setOpen(false)}>
                取消
              </Button>
              <a
                href={issueUrl(diag, desc)}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className={cn(buttonVariants({ variant: "primary" }))}
              >
                <Bug className="size-4" /> 打开 GitHub issue
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
