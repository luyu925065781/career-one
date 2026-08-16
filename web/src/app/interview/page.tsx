import { BookOpenCheck, CircleAlert, CircleCheck, CircleHelp, Database, Target } from "lucide-react";
import { JourneyHandoffCard, StoryActions } from "@/components/cv-editor";
import { doctorState, readStoryBank, type InterviewStory } from "@/lib/career-one";
import { cn } from "@/lib/cn";
import { PRIMARY_NAV_ITEMS } from "@/lib/nav-items";
import { assessStoryReadiness } from "@/lib/story-bank.mjs";

export const dynamic = "force-dynamic";
const PageIcon = PRIMARY_NAV_ITEMS.interviewStories.icon;

export default function InterviewStoryBankPage() {
  const { stories } = readStoryBank();
  const { profileReady } = doctorState();
  const ready = stories.filter((story) => assessStoryReadiness(story).ready).length;
  const pending = stories.length - ready;
  const tags = [...new Set(stories.flatMap((story) => story.tags))];

  return (
    <div className="page-shell py-8 max-sm:pb-24">
      <header>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <PageIcon className="size-6 shrink-0 text-icon-brand" aria-hidden="true" />
            <h1 className="page-title">面试故事库</h1>
          </div>
          <p className="mt-1.5 w-full pl-9 text-sm leading-6 text-muted">
            从已核验经历中沉淀的 STAR+Reflection 主故事，AI会按不同岗位和面试问题灵活调用。
          </p>
          <p className="mt-1 pl-9 text-xs text-faint">
            本地数据：<code className="font-mono text-muted">interview-prep/story-bank.md</code>
          </p>
        </div>
      </header>

      <JourneyHandoffCard
        stage={!profileReady
          ? "profile-current"
          : stories.length > 0 ? "story-complete" : "story-current"}
      />

      {stories.length === 0 ? (
        <EmptyBank profileReady={profileReady} />
      ) : (
        <>
          <section className="mt-8 grid grid-cols-2 border-y border-border sm:grid-cols-4" aria-label="故事库概览">
            <Metric label="已生成" value={stories.length} />
            <Metric label="已完善" value={ready} tone="success" />
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

          <section id="story-list" className="mt-8 scroll-mt-6 space-y-4" aria-label="STAR 面试故事">
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
  const assessment = assessStoryReadiness(story);
  const completed = assessment.ready;
  return (
    <article data-ui-card="solid" className="relative">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-faint">
              <span className="font-mono font-semibold text-muted">{story.id}</span>
              {story.updatedAt && <span>更新于 {story.updatedAt}</span>}
            </div>
            <h2 className="mt-2 text-lg font-semibold leading-7 text-foreground">{story.title}</h2>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <StoryActions story={story} />
            <span className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium",
              completed
                ? "border-success-border bg-success-surface text-success"
                : "border-warning-border bg-warning-surface text-warning",
            )}>
              {completed ? <CircleCheck className="size-3.5" /> : <CircleAlert className="size-3.5" />}
              {completed ? "已完善" : "待完善"}
            </span>
            <StoryStatusHelp storyId={story.id} completed={completed} />
          </div>
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

        {!completed && <StoryMissingWork assessment={assessment} />}
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

function StoryStatusHelp({ storyId, completed }: { storyId: string; completed: boolean }) {
  const standards = [
    ["01", "事实可追溯", "内容来自 cv.md 或其他允许的本地事实来源。"],
    ["02", "STAR 具体", "情境、任务、行动和结果都能讲清本人做了什么。"],
    ["03", "补齐待确认", "草稿中不再留下待确认或待补充信息。"],
    ["04", "用户最终确认", "检查事实和表达后，由您确认最终内容。"],
  ];

  return (
    <details className="group relative">
      <summary
        aria-label={`查看 ${storyId} 的完善标准`}
        title="查看完善标准"
        className="flex size-7 cursor-pointer list-none items-center justify-center rounded-button border border-outline-border bg-outline-bg text-muted transition-colors hover:border-outline-border-hover hover:bg-outline-bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface [&::-webkit-details-marker]:hidden"
      >
        <CircleHelp className="size-3.5" aria-hidden="true" />
      </summary>

      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(20rem,calc(100vw-3rem))] rounded-card border border-border bg-surface p-4 shadow-floating">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-muted">完善标准</p>
            <p className="mt-1 text-sm font-semibold text-foreground">怎样变成“已完善”</p>
          </div>
          <span className={cn(
            "shrink-0 rounded-full px-2 py-1 text-[11px] font-medium",
            completed ? "bg-success-surface text-success" : "bg-warning-surface text-warning",
          )}>
            {completed ? "已完善" : "待完善"}
          </span>
        </div>

        <p className="mt-3 text-xs leading-5 text-muted">
          Agent 会以“已完善”标准为目标优化故事；关键事实不足时，会先向您追问。完整草稿经您的审核确认后，故事才会进入“已完善”状态。
        </p>

        <ol className="mt-3 space-y-2" aria-label={`${storyId} 的面试故事完善标准`}>
          {standards.map(([number, title, description]) => (
            <li key={number} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2">
              <span className="flex size-6 items-center justify-center rounded-full border border-border bg-surface-hover text-[10px] font-semibold tabular-nums text-muted">
                {number}
              </span>
              <p className="text-xs leading-5 text-muted">
                <span className="font-semibold text-foreground">{title}</span> · {description}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-3 border-t border-border pt-3 text-xs leading-5 text-faint">
          这些标准只用于帮助您判断故事质量，不影响继续评估岗位；是否继续完善由您决定。
        </p>
      </div>
    </details>
  );
}

function StoryMissingWork({ assessment }: { assessment: ReturnType<typeof assessStoryReadiness> }) {
  return (
    <div className="mt-5 rounded-card border border-warning-border bg-warning-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CircleAlert className="size-4 shrink-0 text-warning" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">完成这些内容后即可标记为已完善</h3>
        </div>
        <span className="text-xs font-semibold tabular-nums text-warning">
          还差 {assessment.missingChecks.length} 项
        </span>
      </div>

      <ul className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
        {assessment.missingChecks.map((check) => (
          <li key={check.id} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-warning-solid" aria-hidden="true" />
            <span>{check.label}</span>
          </li>
        ))}
      </ul>

      {assessment.pendingPrompts.length > 0 && (
        <div className="mt-4 border-t border-warning-border pt-3">
          <p className="text-xs font-semibold text-warning">Agent 正在等你补充</p>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-muted">
            {assessment.pendingPrompts.slice(0, 3).map((prompt) => (
              <li key={prompt} className="flex gap-2">
                <span className="text-warning" aria-hidden="true">•</span>
                <span>{prompt}</span>
              </li>
            ))}
          </ul>
          {assessment.pendingPrompts.length > 3 && (
            <p className="mt-2 text-xs text-faint">另有 {assessment.pendingPrompts.length - 3} 项待确认。</p>
          )}
        </div>
      )}
    </div>
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

function EmptyBank({ profileReady }: { profileReady: boolean }) {
  return (
    <div data-ui-empty-state="section" className="mt-8 py-14 text-center">
      <BookOpenCheck className="mx-auto size-8 text-icon-muted" />
      <h2 className="mt-4 text-lg font-semibold text-foreground">故事库还是空的</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
        {profileReady
          ? "从简历中已核验的经历整理 1 个 STAR+R 主故事；岗位评估后还会继续补充更贴合目标岗位的素材。"
          : "先完成上方求职画像，再根据目标岗位选择最有说服力的真实经历整理故事。"}
      </p>
      <p className="mx-auto mt-3 max-w-md text-xs leading-5 text-faint">
        使用上方流程入口交给 Agent 处理。Agent 会先生成待确认提案，不会直接覆盖本地故事库。
      </p>
    </div>
  );
}
