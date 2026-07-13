import { BookOpenCheck, CircleAlert, CircleCheck, Database, Target } from "lucide-react";
import { readStoryBank, type InterviewStory } from "@/lib/career-one";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export default function InterviewStoryBankPage() {
  const { stories } = readStoryBank();
  const ready = stories.filter((story) => story.status === "可使用").length;
  const pending = stories.length - ready;
  const tags = [...new Set(stories.flatMap((story) => story.tags))];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 max-sm:pb-24">
      <header className="flex items-start gap-3">
        <BookOpenCheck className="mt-0.5 size-6 shrink-0 text-icon-brand" />
        <div>
          <h1 className="font-display text-2xl tracking-normal text-landing">面试故事库</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">
            从已核验经历中沉淀的 STAR+Reflection 主故事，按不同岗位和面试问题灵活调用。
          </p>
          <p className="mt-1 text-xs text-faint">
            本地数据：<code className="font-mono text-muted">interview-prep/story-bank.md</code>
          </p>
        </div>
      </header>

      {stories.length === 0 ? (
        <EmptyBank />
      ) : (
        <>
          <section className="mt-8 grid grid-cols-2 border-y border-border sm:grid-cols-4" aria-label="故事库概览">
            <Metric label="主故事" value={stories.length} />
            <Metric label="可使用" value={ready} tone="success" />
            <Metric label="待完善" value={pending} tone="warning" />
            <Metric label="能力标签" value={tags.length} />
          </section>

          <section className="mt-8" aria-labelledby="coverage-title">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-icon-muted" />
              <h2 id="coverage-title" className="text-sm font-semibold text-foreground">能力覆盖</h2>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full border border-outline-border bg-outline-bg px-2.5 py-1 text-xs text-outline-text">
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section className="mt-8 space-y-4" aria-label="STAR 面试故事">
            {stories.map((story) => <StoryCard key={story.id} story={story} />)}
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "success" | "warning" }) {
  return (
    <div className="border-border px-4 py-4 even:border-l sm:border-l sm:first:border-l-0">
      <div className={cn(
        "text-2xl font-semibold tabular-nums text-foreground",
        tone === "success" && "text-icon-success",
        tone === "warning" && "text-icon-warning",
      )}>
        {value}
      </div>
      <div className="mt-1 text-xs text-faint">{label}</div>
    </div>
  );
}

function StoryCard({ story }: { story: InterviewStory }) {
  const usable = story.status === "可使用";
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface/55">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-faint">
              <span className="font-mono font-semibold text-muted">{story.id}</span>
              {story.updatedAt && <span>更新于 {story.updatedAt}</span>}
            </div>
            <h2 className="mt-2 text-lg font-semibold leading-7 text-foreground">{story.title}</h2>
          </div>
          <span className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
            usable
              ? "border-emerald-500/25 bg-emerald-500/10 text-icon-success"
              : "border-amber-500/25 bg-amber-500/10 text-icon-warning",
          )}>
            {usable ? <CircleCheck className="size-3.5" /> : <CircleAlert className="size-3.5" />}
            {story.status}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {story.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-surface-hover px-2 py-1 text-xs text-muted">{tag}</span>
          ))}
        </div>

        {story.questions.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <div className="text-xs font-semibold text-faint">适用问题</div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {story.questions.map((question) => (
                <span key={question} className="text-sm text-muted">{question}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid border-t border-border sm:grid-cols-2">
        <StarSection marker="S" label="情境" lines={story.situation} />
        <StarSection marker="T" label="任务" lines={story.task} />
        <StarSection marker="A" label="行动" lines={story.action} />
        <StarSection marker="R" label="结果" lines={story.result} />
      </div>

      <div className="border-t border-border bg-surface/35 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-md border border-brand/25 bg-brand-soft px-2 py-1 text-xs font-semibold text-brand-text">R+</span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">反思与补强</h3>
            <StoryLines lines={story.reflection} className="mt-1.5" />
          </div>
        </div>
      </div>

      {story.source && (
        <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-faint sm:px-6">
          <Database className="size-3.5 text-icon-muted" />
          <span>事实来源</span>
          <code className="font-mono text-muted">{story.source}</code>
        </div>
      )}
    </article>
  );
}

function StarSection({ marker, label, lines }: { marker: string; label: string; lines: string[] }) {
  return (
    <div className="border-t border-border px-5 py-4 first:border-t-0 sm:border-l sm:border-t-0 sm:px-6 sm:odd:border-l-0 sm:[&:nth-child(n+3)]:border-t">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-foreground text-xs font-semibold text-background">{marker}</span>
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      </div>
      <StoryLines lines={lines} className="mt-2.5" />
    </div>
  );
}

function StoryLines({ lines, className }: { lines: string[]; className?: string }) {
  if (lines.length === 0) return <p className={cn("text-sm text-faint", className)}>待补充</p>;
  if (lines.length === 1) return <p className={cn("text-sm leading-6 text-muted", className)}>{lines[0]}</p>;
  return (
    <ul className={cn("space-y-1.5 text-sm leading-6 text-muted", className)}>
      {lines.map((line) => <li key={line} className="flex gap-2"><span className="text-faint">•</span><span>{line}</span></li>)}
    </ul>
  );
}

function EmptyBank() {
  return (
    <div className="mt-8 border-y border-dashed border-border py-14 text-center">
      <BookOpenCheck className="mx-auto size-8 text-icon-muted" />
      <h2 className="mt-4 text-lg font-semibold text-foreground">故事库还是空的</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
        完成岗位评估后，择程AI会从已核验经历中整理可复用的 STAR+R 故事。
      </p>
    </div>
  );
}
