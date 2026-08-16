"use client";

import { Loader2, Wand2, Asterisk, Paperclip, Sparkles, ArrowUpRight, ShieldCheck, RotateCcw, FileCheck2, AlertTriangle, Terminal, Check, ScanLine, PenLine, CheckCircle2, Info, ExternalLink, MousePointerClick } from "lucide-react";
import type { ApplyIssue, DriveStep } from "@/lib/apply/issue";
import { useApply } from "@/components/apply/apply-provider";
import type { ApplyField } from "@/lib/apply/extract";
import { cn } from "@/lib/cn";
import { Fragment, useEffect, useRef, useState } from "react";

// Co-located UI animations (HMR-proof vs Tailwind v4's stale globals.css):
// field cascade-in, per-field "just drafted" flash, skeleton shimmer, hero orb.
const STYLE = `
@keyframes co-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.co-rise{animation:co-rise .55s cubic-bezier(.22,1,.36,1) both}
@keyframes co-flash{0%{box-shadow:0 0 0 0 transparent}22%{box-shadow:0 0 0 3px color-mix(in srgb,var(--color-brand) 38%,transparent)}100%{box-shadow:0 0 0 0 transparent}}
.co-flash{animation:co-flash 1.15s ease both;border-radius:.6rem}
@keyframes co-shim{0%{background-position:-200% 0}100%{background-position:200% 0}}
.co-skel{background:linear-gradient(90deg, color-mix(in srgb,var(--fg) 5%, transparent) 25%, color-mix(in srgb,var(--fg) 12%, transparent) 37%, color-mix(in srgb,var(--fg) 5%, transparent) 63%);background-size:200% 100%;animation:co-shim 1.6s linear infinite;border-radius:.5rem}
@keyframes co-orb{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.35);opacity:.9}}
.co-orb{animation:co-orb 2.4s ease-in-out infinite}
@keyframes co-spin{to{transform:rotate(360deg)}}
.co-ring{animation:co-spin 3s linear infinite}
@media (prefers-reduced-motion: reduce){.co-rise,.co-flash,.co-skel,.co-orb,.co-ring{animation:none}}
`;

// The form-proxy UI: the real employer form is opened headlessly on the user's
// machine and re-rendered here in plain language, pre-filled from their CV. The
// user verifies every answer, then we fill the real form behind the scenes and
// bring it to the front for them to submit. We never submit.
export function ApplyView() {
  const a = useApply();
  const [input, setInput] = useState("");

  if (a.status === "idle" || a.status === "error") {
    return (
      <div>
        <div className="flex w-full items-center gap-2 rounded-full border border-border bg-surface/70 py-1.5 pl-4 pr-1.5 shadow-sm transition focus-within:border-brand/50">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && a.open(input.trim())}
            placeholder="粘贴投递表单网址（Ashby、Lever、Greenhouse 等）"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-faint"
          />
          <button
            onClick={() => a.open(input.trim())}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-200"
          >
            <Wand2 className="size-4" /> 读取表单
          </button>
        </div>
        {a.error && (
          <div className="mt-4 w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3.5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-icon-warning" />
              <div className="min-w-0">
                <p className="text-sm text-amber-800 dark:text-amber-300">{a.error}</p>
                {a.url && /^https?:\/\//.test(a.url) && (
                  <a href={a.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                    直接打开表单 <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const opening = a.status === "opening";
  const driving = a.status === "driving";
  const prefilling = a.status === "prefilling";
  const filling = a.status === "filling";
  const done = a.status === "done";
  const busy = opening || driving;
  const phase = busy ? 0 : prefilling ? 1 : 2;

  return (
    <div className="w-full">
      <style>{STYLE}</style>

      {/* journey: Read → Draft → Review */}
      <PhaseRail phase={phase} />

      {!busy && (
        <div className="co-rise mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl text-landing drop-shadow-sm">{a.title || "岗位申请"}</h2>
          <button onClick={a.reset} className="inline-flex items-center gap-1 text-xs text-faint transition-colors hover:text-foreground">
            <RotateCcw className="size-3" /> 新建
          </button>
        </div>
      )}

      {/* opening: big magic hero + skeleton fields (no layout jump when real ones arrive) */}
      {opening && (
        <>
          <ProcessingHero title="正在读取表单…" subtitle="在你的电脑上打开真实投递页面并读取全部字段。" />
          <FieldSkeleton />
        </>
      )}

      {/* driving: watch the agent reach the form live (it navigates, never submits) */}
      {driving && <DrivePanel steps={a.driveSteps} />}

      {a.error && (
        <p className="co-rise mb-3 flex items-start gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 backdrop-blur-sm dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {a.error}
        </p>
      )}

      {!busy && (
        <div className="co-rise">
          <ApplyIssues issues={a.issues} />
          {/* drafting banner while the planner writes the answers */}
          {prefilling && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft/60 px-4 py-3 backdrop-blur-sm">
              <span className="relative grid size-8 shrink-0 place-items-center">
                <span className="co-orb absolute inset-0 rounded-full bg-brand/40 blur-[6px]" />
                <Sparkles className="size-4 text-icon-brand" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">正在起草回答…</div>
                <RotatingStatus />
              </div>
              <Loader2 className="ml-auto size-4 shrink-0 animate-spin text-icon-brand" />
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              onClick={a.prefill}
              disabled={prefilling || filling}
              className="inline-flex items-center gap-1.5 rounded-full border border-outline-border bg-outline-bg px-3.5 py-1.5 text-sm font-medium text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover disabled:opacity-50"
            >
              {prefilling ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {prefilling ? "正在根据简历起草…" : "根据简历预填"}
            </button>
            <span className="text-xs text-muted">也可以让右下角助手撰写或修改任一回答。</span>
          </div>

          {(prefilling || a.prefillLog.length > 0) && (
            <details className="mb-4 rounded-lg border border-border bg-surface/60 backdrop-blur-sm" open={false}>
              <summary className="flex cursor-pointer select-none items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted">
                <Terminal className="size-3.5" /> 预填诊断
                {prefilling && <Loader2 className="size-3 animate-spin text-icon-brand" />}
                <span className="ml-auto text-faint">{a.prefillLog.length} 步</span>
              </summary>
              <div className="max-h-52 overflow-y-auto border-t border-border px-3 py-2">
                <ol className="space-y-0.5 font-mono text-[11px] leading-relaxed text-muted">
                  {a.prefillLog.map((l, i) => (
                    <li key={i} className={l.startsWith("✗") ? "text-amber-600 dark:text-amber-400" : ""}>
                      {l}
                    </li>
                  ))}
                  {prefilling && <li className="text-faint">…</li>}
                </ol>
              </div>
            </details>
          )}

          {/* the questions — float on the blurred form image, cascade in, each
              flashes brand-orange the instant its drafted answer lands */}
          <div className="space-y-1 rounded-2xl border border-border/70 bg-surface/80 p-2 shadow-2xl shadow-black/10 backdrop-blur-md sm:p-3">
            {a.fields.map((f, i) => (
              <div key={f.id} className="co-rise rounded-xl px-3 py-2.5" style={{ animationDelay: `${Math.min(i * 45, 700)}ms` }}>
                <FieldRow
                  field={f}
                  value={a.answers[f.id] ?? ""}
                  needs={!!a.meta[f.id]?.needsConfirmation}
                  index={i}
                  drafting={prefilling}
                  onChange={(v) => a.setAnswer(f.id, v)}
                />
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={a.fill}
              disabled={filling || prefilling}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground shadow-lg shadow-brand/25 transition-all hover:bg-brand-200 hover:shadow-brand/40 disabled:opacity-50"
            >
              {filling ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpRight className="size-4" />}
              {filling ? "正在填写真实表单…" : "填写真实表单并检查"}
            </button>
            <button
              onClick={a.agentFill}
              disabled={filling || prefilling}
              title="让 Agent 逐项填写复杂或多步骤表单，但绝不会自动提交"
              className="inline-flex items-center gap-1.5 rounded-full border border-outline-border bg-outline-bg px-4 py-2.5 text-sm font-medium text-outline-text transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover disabled:opacity-50"
            >
              <MousePointerClick className="size-4" /> 让 Agent 填写
            </button>
            <p className="inline-flex items-center gap-1.5 text-xs text-muted">
              <ShieldCheck className="size-3.5 text-icon-success" /> 不会自动提交，最终由你本人确认。
            </p>
          </div>

          {/* agent filling the form live (full-agent escalation) */}
          {filling && a.driveSteps.length > 0 && <div className="mt-6"><DrivePanel steps={a.driveSteps} filling /></div>}

          {(filling || done) && a.steps.length > 0 && (
            <div className="co-rise mt-6">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">执行过程</div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {a.steps.map((s, i) => (
                  <figure key={i} className="shrink-0">
                    {s.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.thumb} alt="" className="h-24 w-36 rounded-md border border-border object-cover" />
                    ) : (
                      <div className="flex h-24 w-36 items-center justify-center rounded-md border border-dashed border-border text-faint">…</div>
                    )}
                    <figcaption className={cn("mt-1 w-36 truncate text-[10px]", s.ok ? "text-faint" : "text-amber-500")}>{s.label || "字段"}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}
          {done && (
            <div className="co-rise mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm backdrop-blur-sm">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-icon-success" />
              <div>
                <span className="font-medium text-emerald-700 dark:text-emerald-400">真实申请表已打开并完成预填。</span>{" "}
                <span className="text-muted">请逐项核对并由你本人点击提交，择程AI不会代替你提交。</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Watch the agent reach the form live (it navigates, never submits) ───────
const DRIVE_VERB: Record<string, string> = { click: "点击", type: "输入", select: "选择", scroll: "滚动", "parse-error": "思考中…", stuck: "遇到阻碍", reached_form: "已到达表单" };
function DrivePanel({ steps, filling }: { steps: DriveStep[]; filling?: boolean }) {
  const last = steps[steps.length - 1];
  return (
    <div className="co-rise">
      <div className="flex flex-col items-center gap-3 py-7 text-center">
        <span className="relative grid size-14 place-items-center">
          <span className="co-orb absolute inset-0 rounded-full bg-brand/30 blur-lg" />
          <span className="co-ring absolute inset-0 rounded-full border-2 border-brand/30 border-t-brand" />
          <MousePointerClick className="size-6 text-icon-brand" />
        </span>
        <div className="font-display text-2xl text-landing">{filling ? "Agent 正在填写表单…" : "正在打开投递表单…"}</div>
        <p className="max-w-sm text-sm text-muted">{filling ? "Agent 在你的电脑上逐项填写真实表单；它不会提交，由你检查后提交。" : "Agent 正在你的电脑上打开真实投递页面；它不会自动提交。"}</p>
      </div>
      {last?.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={last.thumb} alt="" className="w-full rounded-xl border border-border shadow-xl shadow-black/10" />
      ) : (
        <div className="co-skel h-56 w-full rounded-xl" />
      )}
      {steps.length > 0 && (
        <ol className="mt-3 space-y-1.5 rounded-xl border border-border/70 bg-surface/70 p-3 backdrop-blur-sm">
          {steps.map((s, i) => (
            <li key={i} className={cn("flex items-center gap-2 text-xs", i === steps.length - 1 ? "text-foreground" : "text-muted")}>
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand">{s.turn}</span>
              <span className="shrink-0 font-medium">{DRIVE_VERB[s.action] ?? s.action}</span>
              <span className="truncate text-faint">{s.detail}</span>
              {s.note && <span className="shrink-0 text-amber-500">· {s.note}</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ── Issues the interpreter surfaced — never fail mute ───────────────────────
function ApplyIssues({ issues }: { issues: ApplyIssue[] }) {
  if (!issues.length) return null;
  const warns = issues.filter((i) => i.level === "warn" || i.level === "block");
  const infos = issues.filter((i) => i.level === "info");
  return (
    <div className="mb-4 space-y-2">
      {warns.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 backdrop-blur-sm">
          <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-4" /> 需要你检查的内容
          </div>
          <ul className="space-y-1 text-xs text-amber-800/90 dark:text-amber-300/90">
            {warns.map((i, k) => (
              <li key={k} className="flex gap-1.5">
                <span className="mt-px text-amber-500">•</span> {i.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {infos.map((i, k) => (
        <div key={k} className="flex items-center gap-1.5 text-xs text-muted">
          <Info className="size-3.5 shrink-0 text-icon-info" /> {i.message}
        </div>
      ))}
    </div>
  );
}

// ── Journey rail: Reading → Drafting → Review ───────────────────────────────
function PhaseRail({ phase }: { phase: number }) {
  const steps = [
    { label: "读取表单", icon: ScanLine },
    { label: "起草回答", icon: PenLine },
    { label: "检查并提交", icon: CheckCircle2 },
  ];
  return (
    <div className="mb-6 flex items-center gap-2.5">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const state = i < phase ? "done" : i === phase ? "active" : "todo";
        return (
          <Fragment key={i}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "relative grid size-6 place-items-center rounded-full border transition-colors",
                  state === "done" && "border-brand bg-brand text-brand-foreground",
                  state === "active" && "border-brand text-brand",
                  state === "todo" && "border-border text-faint",
                )}
              >
                {state === "done" ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                {state === "active" && <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-brand/30" />}
              </span>
              <span className={cn("hidden text-xs font-medium sm:inline", i <= phase ? "text-foreground" : "text-faint")}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <span className="relative h-px flex-1 overflow-hidden rounded bg-border">
                <span className={cn("absolute inset-y-0 left-0 bg-brand transition-all duration-700", i < phase ? "w-full" : "w-0")} />
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// Honest, calming rotation of what the planner is actually doing, so the (~1-2min)
// draft doesn't feel stalled. Crossfades every ~2.8s.
const DRAFT_MSGS = [
  "正在读取简历…",
  "正在分析岗位和公司…",
  "正在将经历匹配到每个问题…",
  "正在按你的表达风格起草回答…",
  "正在标记需要你确认的内容…",
];
function RotatingStatus() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % DRAFT_MSGS.length), 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <div key={i} className="co-rise truncate text-xs text-muted">
      {DRAFT_MSGS[i]}
    </div>
  );
}

function ProcessingHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="co-rise flex flex-col items-center gap-3 py-14 text-center">
      <span className="relative grid size-16 place-items-center">
        <span className="co-orb absolute inset-0 rounded-full bg-brand/30 blur-lg" />
        <span className="co-ring absolute inset-0 rounded-full border-2 border-brand/30 border-t-brand" />
        <Sparkles className="size-7 text-icon-brand" />
      </span>
      <div className="font-display text-3xl text-landing">{title}</div>
      <p className="max-w-sm text-sm text-muted">{subtitle}</p>
    </div>
  );
}

function FieldSkeleton() {
  return (
    <div className="co-rise space-y-3 rounded-2xl border border-border/70 bg-surface/70 p-5 backdrop-blur-md" style={{ animationDelay: "120ms" }}>
      {[64, 80, 48, 72, 56].map((w, i) => (
        <div key={i} className="space-y-2">
          <div className="co-skel h-3" style={{ width: `${w}px` }} />
          <div className="co-skel h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

function FieldRow({
  field: f,
  value,
  needs,
  index,
  drafting,
  onChange,
}: {
  field: ApplyField;
  value: string;
  needs: boolean;
  index: number;
  drafting: boolean;
  onChange: (v: string) => void;
}) {
  // Flash brand-orange the moment a drafted answer first lands (empty → value).
  const prev = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!prev.current && value) {
      setFlash(true);
      // outlast the staggered animation-delay (≤900ms) + the 1.15s flash
      const t = setTimeout(() => setFlash(false), 2300);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);

  const base = cn(
    "w-full rounded-lg border bg-surface/60 px-3 py-2 text-sm outline-none transition focus:border-brand/60",
    needs ? "border-amber-500/50" : "border-border",
  );
  // While the planner is drafting, an empty answer shimmers like it's being
  // written; it flashes into the real value the instant the draft lands.
  const writing = drafting && !value && f.type !== "file";
  return (
    <div className={flash ? "co-flash" : ""} style={flash ? { animationDelay: `${Math.min(index * 70, 900)}ms` } : undefined}>
      <label className="mb-1.5 flex items-center gap-1 text-sm font-medium">
        {f.label || <span className="text-faint">未命名字段</span>}
        {f.required && <Asterisk className="size-3 text-icon-brand" />}
        {needs && <span className="ml-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">需要确认</span>}
      </label>
      {writing ? (
        <div className={cn("co-skel", f.type === "textarea" ? "h-[68px]" : "h-9")} />
      ) : f.type === "textarea" ? (
        <textarea rows={3} maxLength={f.maxLength} value={value} onChange={(e) => onChange(e.target.value)} placeholder={needs ? "请由你填写此项。" : "…"} className={cn(base, "resize-none")} />
      ) : (f.type === "select" || f.type === "radio") && f.options && f.options.length > 0 ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={base}>
          <option value="">请选择…</option>
          {f.options.map((o, i) => (
            <option key={i} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : f.type === "checkbox" ? (
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={value === "true" || value === "yes"} onChange={(e) => onChange(e.target.checked ? "true" : "")} className="size-4 accent-brand" /> {f.label || "是"}
        </label>
      ) : f.type === "file" ? (
        /resume|résumé|\bcv\b|curriculum|currículum|lebenslauf/i.test(f.label || "") ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            <FileCheck2 className="size-4 shrink-0" /> 将自动附上定制简历 PDF，你可以在真实表单中替换。
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted">
            <Paperclip className="size-4 shrink-0" /> 请在交接后的真实表单中手动上传该文件。
          </div>
        )
      ) : (
        <input type={["email", "tel", "url", "number", "date"].includes(f.type) ? f.type : "text"} maxLength={f.maxLength} value={value} onChange={(e) => onChange(e.target.value)} placeholder={needs ? "请由你填写此项。" : "…"} className={base} />
      )}
    </div>
  );
}
