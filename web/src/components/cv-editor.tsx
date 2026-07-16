"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Loader2, PencilLine, Sparkles, X } from "lucide-react";
import type { InterviewStory } from "@/lib/career-one";
import { cn } from "@/lib/cn";
import { parseStoryBank, serializeStoryMarkdown } from "@/lib/story-bank.mjs";

const STORY_ACTION_CLASS = "liquid-glass-control group inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold tracking-[0.01em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 max-sm:h-11 max-sm:px-3";

export function CvEditor() {
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [exists, setExists] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/cv")
      .then((r) => r.json())
      .then((d) => {
        setContent(d.content ?? "");
        setExists(d.exists ?? false);
      })
      .finally(() => setLoaded(true));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setDirty(false);
        setExists(true);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl tracking-tight text-landing">简历编辑器</h1>
          <p className="mt-1 w-full text-sm text-muted">
            编辑 <code className="text-foreground">cv.md</code> 并实时预览。
            {!exists && loaded && <span className="ml-1 text-faint">当前还没有 cv.md，输入内容即可创建。</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors max-sm:min-h-[44px]",
            dirty
              ? "bg-brand text-brand-foreground hover:bg-brand-200"
              : "border border-border bg-surface text-muted",
          )}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
          {saved ? "已保存" : "保存"}
        </button>
      </div>

      {!loaded ? (
        <div className="mt-6 text-sm text-muted">正在加载…</div>
      ) : (
        <MarkdownWorkspace
          className="mt-6"
          content={content}
          onChange={(value) => {
            setContent(value);
            setDirty(true);
          }}
          placeholder="# 姓名\n\n## 个人简介\n..."
        />
      )}
    </div>
  );
}

function storyPrompt(story: InterviewStory) {
  return `请只优化面试故事 ${story.id}《${story.title}》。先读取 interview-prep/story-bank.md 中这一条故事，以及允许作为事实来源的 cv.md、article-digest.md、config/profile.yml、modes/_profile.md 和 interview-prep/ 中的面试资料。增强这条故事的 STAR+Reflection 表达，但不得新增、删除或修改其他故事，也不得改变故事编号。只能使用已核验事实；信息不足时先问我，不要猜测。准备好后先列出本条故事的修改摘要，再通过 setStory 提交仅包含 ${story.id} 的 Markdown 草稿，必须等我在确认卡中确认后才能保存。不要直接修改任何文件。`;
}

/**
 * Per-story maintenance entry points. Every write carries an immutable story
 * ID; the server merges that one block into the user-owned story bank.
 */
export function StoryActions({ story }: { story: InterviewStory }) {
  const router = useRouter();
  const [manualOpen, setManualOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [baseHash, setBaseHash] = useState("");
  const [error, setError] = useState("");
  const dirty = content !== original;

  useEffect(() => {
    if (!manualOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) setManualOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [manualOpen, saving]);

  async function openManualEditor() {
    setManualOpen(true);
    setLoaded(false);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/cv?target=story-bank", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "无法读取故事库");
      const current = parseStoryBank(result.content ?? "").stories.find((item) => item.id === story.id);
      if (!current) throw new Error(`故事 ${story.id} 已不存在，请刷新页面后重试`);
      const next = serializeStoryMarkdown(current);
      setContent(next);
      setOriginal(next);
      setBaseHash(result.hash || "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法读取故事库");
    } finally {
      setLoaded(true);
    }
  }

  async function saveStory() {
    if (!dirty || !baseHash || saving) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const response = await fetch("/api/cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "story-bank", storyId: story.id, storyMarkdown: content, baseHash }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "保存失败");
      setOriginal(content);
      setBaseHash(result.hash || baseHash);
      setSaved(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function openAgent() {
    window.dispatchEvent(new CustomEvent("co-assistant", { detail: { message: storyPrompt(story) } }));
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={openAgent}
          className={STORY_ACTION_CLASS}
        >
          <Sparkles className="size-3.5 text-icon-brand transition-colors" />
          AI 优化
        </button>
        <button
          type="button"
          onClick={openManualEditor}
          className={STORY_ACTION_CLASS}
        >
          <PencilLine className="size-3.5 text-icon-muted transition-colors group-hover:text-icon-brand" />
          手动维护
        </button>
      </div>

      {manualOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setManualOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`story-editor-title-${story.id}`}
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
          >
            <header className="flex items-start gap-4 border-b border-border px-5 py-4 sm:px-6">
              <div className="min-w-0 flex-1">
                <h2 id={`story-editor-title-${story.id}`} className="text-lg font-semibold text-foreground">
                  手动维护 {story.id} · {story.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  本次只会更新这一条故事；其他故事保持原样，内容仍保存在 <code className="font-mono text-foreground">interview-prep/story-bank.md</code>。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                disabled={saving}
                className="rounded-full p-2 text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
                aria-label="关闭手动编辑"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              {!loaded ? (
                <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-muted">
                  <Loader2 className="size-4 animate-spin" /> 正在加载故事库…
                </div>
              ) : (
                <MarkdownWorkspace
                  content={content}
                  onChange={(value) => {
                    setContent(value);
                    setSaved(false);
                    setError("");
                  }}
                  placeholder={`## ${story.id} · 故事标题\n...`}
                  minHeightClass="min-h-[52vh]"
                />
              )}
              {error && <p className="mt-3 text-sm text-icon-danger">{error}</p>}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
              <p className="text-xs leading-5 text-faint">保存时会校验故事格式、检查版本冲突，并为旧内容创建本地备份。</p>
              <button
                type="button"
                onClick={saveStory}
                disabled={!loaded || !dirty || saving || !baseHash}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-200 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
                {saving ? "正在保存" : saved ? "已保存" : "确认并保存"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

function MarkdownWorkspace({
  content,
  onChange,
  placeholder,
  className,
  minHeightClass = "min-h-[60vh]",
}: {
  content: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  minHeightClass?: string;
}) {
  return (
    <div className={cn("grid gap-4 lg:grid-cols-2", className)}>
      <textarea
        value={content}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        placeholder={placeholder}
        className={cn(
          minHeightClass,
          "w-full resize-none rounded-2xl border border-border bg-surface/50 p-4 font-mono text-sm leading-relaxed outline-none transition-colors placeholder:text-faint focus:border-brand/40",
        )}
      />
      <article className={cn("report-prose overflow-auto rounded-2xl border border-border bg-surface/30 p-5", minHeightClass)}>
        {content.trim() ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        ) : (
          <p className="text-muted">预览内容显示在这里。</p>
        )}
      </article>
    </div>
  );
}
