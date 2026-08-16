"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, FileText, ScanSearch, ShieldCheck, Coins } from "lucide-react";
import { cn } from "@/lib/cn";
import { parseReport, scoreTone, legitimacyTone } from "@/lib/format";
import { useJobs, type Job } from "@/components/jobs/job-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SEEN_KEY = "career-one:first-score-seen";
const LEGACY_SEEN_KEY = "career-one:first-score-seen";

// THE AHA — fires once, the first time an evaluation completes. The maintainer's
// north star: the WHY is the hero (a sentence that clearly read THIS CV and reasoned
// about THIS job), the grade is large-but-secondary. A celebration, not a report.
const STYLE = `
.co-aha{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:1.2rem;background:color-mix(in srgb, var(--bg) 70%, rgba(0,0,0,.5));-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);animation:co-aha-in .35s ease both}
.co-aha__card{position:relative;width:min(34rem,100%);border-radius:1.3rem;border:1px solid var(--border,hsl(0 0% 50% /.2));background:var(--bg);box-shadow:0 24px 70px -20px rgba(0,0,0,.5);overflow:hidden}
.co-aha__glow{position:absolute;inset:0;background:radial-gradient(80% 60% at 50% -10%,color-mix(in srgb,var(--color-brand) 22%,transparent),transparent 70%);pointer-events:none}
.co-aha__grade{font-variant-numeric:tabular-nums;line-height:1}
@keyframes co-aha-in{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.co-aha{animation:none}}
`;

/** Pull the strongest "why this person" line out of the worker output. Prefer the
 *  VERDICT summary; else the first substantive sentence of the report body. */
function extractWhy(job: Job): string {
  const s = (job.result?.summary || "").trim();
  if (s.length > 30) return s.replace(/\.$/, "") + ".";
  const body = parseReport(job.text || "").body;
  const para = body
    .split(/\n{2,}/)
    .map((p) => p.replace(/[#*>`-]/g, "").replace(/\s+/g, " ").trim())
    .find((p) => p.length > 60 && /\b(you|your|fit|match|strong|experience|background)\b/i.test(p));
  return para ? para.slice(0, 240) : "你与该岗位具有较强匹配度，完整报告中有详细分析。";
}

export function FirstScoreView() {
  const router = useRouter();
  const { jobs } = useJobs();
  const [dismissed, setDismissed] = useState(false);
  const [seen, setSeen] = useState(true); // assume seen until we read localStorage (avoid flash)

  useEffect(() => {
    try {
      setSeen(localStorage.getItem(SEEN_KEY) === "1" || localStorage.getItem(LEGACY_SEEN_KEY) === "1");
    } catch {
      setSeen(false);
    }
  }, []);

  const firstDone = useMemo(
    () => jobs.filter((j) => j.kind === "evaluate" && j.status === "done").sort((a, b) => (a.endedAt ?? 0) - (b.endedAt ?? 0))[0],
    [jobs],
  );

  // A11y for the emotional-peak modal: focus into it on open, trap Tab, Escape to
  // close, restore focus on close (mirrors the MobileNav pattern).
  const panelRef = useRef<HTMLDivElement>(null);
  const open = !seen && !dismissed && !!firstDone;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => panelRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        try {
          localStorage.setItem(SEEN_KEY, "1"); // dismiss = seen (don't re-pop on reload)
          localStorage.setItem(LEGACY_SEEN_KEY, "1");
        } catch {
          /* ignore */
        }
        setDismissed(true);
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      prev?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const why = extractWhy(firstDone);
  const score = firstDone.result?.score ?? null;
  const meta = parseReport(firstDone.text || "");
  const legit = meta.legitimacy;
  const company = firstDone.title.replace(/^(?:Evaluate|评估)\s*·\s*/, "");
  const role = firstDone.subtitle || "";
  const tone = score != null ? scoreTone(`${score}`) : "muted";

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
      localStorage.setItem(LEGACY_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className="co-aha" role="dialog" aria-modal="true" aria-label="首次岗位评分" onClick={close}>
      <style>{STYLE}</style>
      <div ref={panelRef} tabIndex={-1} className="co-aha__card focus:outline-none" onClick={(e) => e.stopPropagation()}>
        <div className="co-aha__glow" />
        <Button type="button" variant="ghost" size="icon-sm" onClick={close} aria-label="关闭" className="absolute right-3 top-3 z-10 text-faint">
          <X className="size-4" />
        </Button>

        <div className="relative px-7 pb-7 pt-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">
            <span className="text-faint">//</span> 已完成首个岗位评分
          </p>

          <div className="mt-4 flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <h2 className={`font-display truncate text-2xl leading-tight text-foreground`}>{role || company}</h2>
              {role && <p className="truncate text-sm text-muted">{company}</p>}
            </div>
            {score != null && (
              <div className="shrink-0 text-right">
                <div
                  className={cn(
                    "co-aha__grade text-5xl font-semibold",
                    tone === "good" ? "text-metric-success" : tone === "warn" ? "text-metric-warning" : tone === "bad" ? "text-metric-danger" : "text-muted",
                  )}
                >
                  {score}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-faint">/ 5 匹配度</div>
              </div>
            )}
          </div>

          {/* THE WHY — the hero. A sentence that read THIS CV against THIS job. */}
          <blockquote className={`font-display mt-5 border-l-2 border-brand/40 pl-4 text-[19px] leading-snug text-foreground`}>
            <Sparkles className="mb-1 inline size-4 text-icon-brand" /> {why}
          </blockquote>

          {legit && (
            <Badge tone={legitimacyTone(legit) === "good" ? "good" : "warn"} size="sm" className="mt-4 gap-1.5 px-2.5 py-1 text-[11px] font-medium">
              <ShieldCheck className="size-3" /> 岗位真实性：{legit}
            </Badge>
          )}

          <p className="mt-5 flex items-center gap-1.5 text-[12px] text-faint">
            <Coins className="size-3.5" /> 本次评估由你自己的 Agent 执行；整理画像与筛选标签不消耗模型额度。
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                close();
                router.push("/pipeline?tab=EVALUATED");
              }}
            >
              <FileText className="size-4" /> 查看完整报告
            </Button>
            <Button
              type="button"
              variant="tertiary"
              onClick={() => {
                close();
                router.push("/cn-diagnose");
              }}
            >
              <ScanSearch className="size-4" /> 评估另一个岗位
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
