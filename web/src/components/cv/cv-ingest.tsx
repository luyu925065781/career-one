"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Upload, FileText, Loader2, Check, AlertTriangle, Lock, ArrowRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { cvReadiness, parseCvStream } from "@/lib/cv/quality";

type Phase = "input" | "parsing" | "review" | "saving" | "error";

function cliId(): string | null {
  try {
    return JSON.parse(localStorage.getItem("career-one:config") || "{}").cliId || null;
  } catch {
    return null;
  }
}

const STYLE = `
.co-cvdrop{position:relative;border:1.5px dashed color-mix(in srgb, var(--fg) 22%, transparent);border-radius:1rem;transition:border-color .2s,background .2s}
.co-cvdrop[data-over="true"]{border-color:var(--color-brand);background:var(--gradient-primary-subtle)}
.co-cvtrace{animation:co-rise .4s ease both}
`;

export function CvIngest({ onSaved }: { onSaved?: () => void }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("input");
  const [paste, setPaste] = useState("");
  const [over, setOver] = useState(false);
  const [trace, setTrace] = useState("");
  const [md, setMd] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const readiness = md ? cvReadiness(md) : null;

  // Stream the ingest, parsing markers live.
  const runStream = useCallback(async (init: RequestInit) => {
    setPhase("parsing");
    setTrace("正在读取简历…");
    setErr("");
    try {
      const r = await fetch("/api/cv/ingest", init);
      if (r.status === 404) {
        setErr("请先在设置中连接 Agent CLI，简历会在本机解析。");
        setPhase("error");
        return;
      }
      if (!r.body) {
        setErr("Agent 没有返回结果。");
        setPhase("error");
        return;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parsed = parseCvStream(buf);
        if (parsed.error) {
          setErr(parsed.error === "unreadable" ? "无法读取该文件中的文字，文件可能是扫描图片。请改为粘贴简历文字。" : "无法解析这份简历，请改为粘贴简历文字。");
          setPhase("error");
          return;
        }
        if (parsed.trace) setTrace(parsed.trace.split("\n").filter(Boolean).slice(-1)[0] || "正在读取简历…");
        if (parsed.markdown) setMd(parsed.markdown);
      }
      const final = parseCvStream(buf);
      if (!final.markdown.trim()) {
        setErr("没有读取到有效简历内容，请改为粘贴简历文字。");
        setPhase("error");
        return;
      }
      setMd(final.markdown);
      setPhase("review");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "读取简历时响应流出错");
      setPhase("error");
    }
  }, []);

  const ingestText = (text: string) => {
    const id = cliId();
    if (!id) {
      setErr("needs-cli");
      setPhase("error");
      return;
    }
    void runStream({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, cliId: id }) });
  };

  const ingestFile = (file: File) => {
    // .md/.txt/.markdown fast path — plain text, NO CLI needed, instant.
    if (/\.(md|markdown|txt)$/i.test(file.name)) {
      file
        .text()
        .then((t) => {
          if (!t.trim()) {
            setErr("该文件内容为空，请改为粘贴简历文字。");
            setPhase("error");
            return;
          }
          setMd(t.trim());
          setPhase("review");
        })
        .catch(() => {
          setErr("无法读取该文件，请改为粘贴简历文字。");
          setPhase("error");
        });
      return;
    }
    // PDF/other → the user's CLI parses it. Needs a configured CLI.
    const id = cliId();
    if (!id) {
      setErr("needs-cli");
      setPhase("error");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    form.append("cliId", id);
    void runStream({ method: "POST", body: form });
  };

  const [saveErr, setSaveErr] = useState("");
  const save = async () => {
    if (!md.trim()) {
      setSaveErr("简历内容为空，请重新粘贴。");
      return;
    }
    setSaveErr("");
    setPhase("saving");
    try {
      const r = await fetch("/api/cv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: md }) });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setSaveErr(d.error || "无法保存简历，请重试。");
        setPhase("review"); // keep the parsed CV so they don't lose it
        return;
      }
    } catch {
      setSaveErr("无法保存简历，请检查连接后重试。");
      setPhase("review");
      return;
    }
    onSaved?.();
    // The profile is now the single place to review job-search direction and
    // reusable search tags after the CV is saved.
    router.push("/profile");
  };

  // ── INPUT ──
  if (phase === "input" || phase === "error") {
    return (
      <div className="space-y-3">
        <style>{STYLE}</style>
        <div
          className="co-cvdrop p-6"
          data-over={over}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) ingestFile(f);
          }}
        >
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && paste.trim()) ingestText(paste.trim());
            }}
            placeholder="在这里粘贴简历，或拖入 PDF / .md 文件。内容不完整也没关系，Agent 会协助整理。"
            className="h-32 w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-faint"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-button border border-outline-border bg-outline-bg px-3 py-1.5 text-xs font-medium text-outline-text transition hover:border-outline-border-hover hover:bg-outline-bg-hover max-sm:min-h-[44px] max-sm:px-4"
            >
              <Upload className="size-3.5" /> 上传 PDF / 文件
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.md,.markdown,.txt,.docx" hidden onChange={(e) => e.target.files?.[0] && ingestFile(e.target.files[0])} />
            <span className="inline-flex items-center gap-1 text-[11px] text-faint">
              <Lock className="size-3" /> 文件保留在本机，由你自己的 Agent 解析。
            </span>
            <button
              type="button"
              disabled={!paste.trim()}
              onClick={() => ingestText(paste.trim())}
              className="ml-auto inline-flex items-center gap-1.5 rounded-button bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-sm transition hover:brightness-110 disabled:opacity-50 max-sm:min-h-[44px]"
            >
              读取简历 <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
        {phase === "error" &&
          (err === "needs-cli" ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[13px] text-amber-700 dark:text-amber-300">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>读取 PDF 需要连接 Agent CLI，也可以直接在上方粘贴简历文字。</span>
              <Link href="/config" className="ml-auto inline-flex items-center gap-1 rounded-button bg-amber-500/20 px-2.5 py-1 font-medium text-amber-700 transition hover:bg-amber-500/30 dark:text-amber-200">
                连接 Agent CLI <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-[13px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-3.5 shrink-0" /> {err}
            </p>
          ))}
      </div>
    );
  }

  // ── PARSING (the 10s bridge) ──
  if (phase === "parsing") {
    return (
      <div className="rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur-sm">
        <style>{STYLE}</style>
        <div className="flex items-center gap-2.5">
          <Loader2 className="size-4 animate-spin text-icon-brand" />
          <span className={`font-display text-lg text-foreground`}>{trace || "正在读取简历…"}</span>
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500" /> 0 tokens · ¥0.00 · 本地
        </div>
        {md && <div className="co-cvtrace mt-4 max-h-40 overflow-hidden rounded-lg border border-border bg-surface/40 p-3 text-[11px] text-faint">{md.slice(0, 400)}…</div>}
      </div>
    );
  }

  // ── REVIEW (propose → confirm) ──
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-4 backdrop-blur-sm md:p-5">
      <style>{STYLE}</style>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FileText className="size-4 text-icon-brand" />
        <h3 className={`font-display text-lg text-foreground`}>简历已整理，请检查后保存</h3>
        {readiness && (
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              readiness.scoreable ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            )}
          >
            {readiness.scoreable ? <Check className="size-3" /> : <AlertTriangle className="size-3" />}
            {readiness.scoreable ? "可以开始匹配" : "内容还需补充"}
          </span>
        )}
      </div>
      {readiness?.hint && <p className="mb-2 text-[12px] text-amber-600 dark:text-amber-400">{readiness.hint}</p>}
      {saveErr && (
        <p className="mb-2 flex items-center gap-1.5 text-[12px] text-red-500">
          <AlertTriangle className="size-3.5 shrink-0" /> {saveErr}
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <textarea
          value={md}
          onChange={(e) => setMd(e.target.value)}
          className="h-72 w-full resize-none rounded-lg border border-border bg-surface/40 p-3 font-mono text-[12px] leading-relaxed outline-none focus:border-brand/40"
        />
        <div className="prose prose-sm dark:prose-invert h-72 max-w-none overflow-y-auto rounded-lg border border-border bg-surface/40 p-3 text-[13px]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={phase === "saving"}
          className="inline-flex items-center gap-2 rounded-button bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:brightness-110 disabled:opacity-60"
        >
          {phase === "saving" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          保存并完善求职画像
        </button>
        <button
          type="button"
          onClick={() => {
            setMd("");
            setPhase("input");
          }}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted transition hover:text-foreground"
        >
          <RotateCcw className="size-3.5" /> 重新开始
        </button>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-faint">
          <Lock className="size-3" /> 本地保存至 cv.md
        </span>
      </div>
    </div>
  );
}
