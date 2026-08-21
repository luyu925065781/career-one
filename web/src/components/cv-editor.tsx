"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, Bot, Check, Loader2, PencilLine, RotateCcw, UserRound, X } from "lucide-react";
import { AgentTaskHandoffDialog } from "@/components/generate-pdf-button";
import {
  buildQueuedTaskInstruction,
  type AgentTaskHandoff,
  useJobs,
} from "@/components/jobs/job-store";
import type { InterviewStory } from "@/lib/career-one";
import { cn } from "@/lib/cn";
import { PRIMARY_NAV_ITEMS } from "@/lib/nav-items";
import { parseStoryBank, serializeStoryMarkdown } from "@/lib/story-bank.mjs";
import { Button, buttonVariants } from "@/components/ui/button";

const STORY_ACTION_CLASS = cn(buttonVariants({ variant: "tertiary", size: "sm" }), "group");
const PageIcon = PRIMARY_NAV_ITEMS.cv.icon;
const JourneyCvIcon = PRIMARY_NAV_ITEMS.cv.icon;
const JourneyProfileIcon = UserRound;
const JourneyStoryIcon = PRIMARY_NAV_ITEMS.interviewStories.icon;
const JourneyDiagnosisIcon = PRIMARY_NAV_ITEMS.jobDiagnosis.icon;

export function CvEditor() {
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [exists, setExists] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nextStepVisible, setNextStepVisible] = useState(false);

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
        setNextStepVisible(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-shell py-8">
      <div data-ui-page-header>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <PageIcon className="size-6 shrink-0 text-icon-brand" aria-hidden="true" />
            <h1 className="page-title">简历编辑器</h1>
          </div>
          <p className="mt-1 w-full pl-9 text-sm text-muted">
            编辑 <code className="text-foreground">cv.md</code> 并实时预览。
            {!exists && loaded && (
              <span className="ml-1 text-faint">当前还没有 cv.md，可先在 Agent 中创建，或直接在下方手动编辑。</span>
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={save}
          disabled={saving || !dirty}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
          {saved ? "已保存" : "保存"}
        </Button>
      </div>

      {nextStepVisible && (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-brand-text"
        >
          <span>简历已保存，可以继续完善求职画像。</span>
          <Link href="/profile" className={cn(buttonVariants({ variant: "tertiary", size: "sm" }), "min-h-11")}>
            继续完善求职画像 <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      {!exists && loaded && <CvAgentOnboarding />}
      {!loaded ? (
        <div className="mt-6 text-sm text-muted">正在加载…</div>
      ) : (
        <>
          {!exists && (
            <div className="mt-6 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-faint">或直接手动编辑 cv.md</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          )}
          <MarkdownWorkspace
            className={exists ? "mt-6" : "mt-4"}
            content={content}
            onChange={(value) => {
              setContent(value);
              setDirty(true);
            }}
            placeholder="# 姓名\n\n## 个人简介\n..."
          />
        </>
      )}
    </div>
  );
}

type JourneyHandoffStage = "profile-current" | "story-current" | "story-complete";

const JOURNEY_HANDOFF_CONTENT = {
  "profile-current": {
    progress: 1,
    eyebrow: "简历已完成",
    title: "简历已准备好，下一步一次确认求职画像",
    description: "先确认目标岗位、地点、薪资和边界；未回答项可以保留待确认，不会拆成多轮追问。",
    completedTitle: "智能编辑简历",
    nextTitle: "完善求职画像",
    nextStatus: "下一步",
    CompletedIcon: JourneyCvIcon,
    NextIcon: JourneyProfileIcon,
  },
  "story-current": {
    progress: 2,
    eyebrow: "画像已准备",
    title: "画像已确认，下一步整理第一个面试故事",
    description: "根据目标岗位优先选择最有说服力的真实经历，先建立 1 个 STAR+R 主故事即可。",
    completedTitle: "完善求职画像",
    nextTitle: "整理面试故事库",
    nextStatus: "当前建议",
    CompletedIcon: JourneyProfileIcon,
    NextIcon: JourneyStoryIcon,
  },
  "story-complete": {
    progress: 3,
    eyebrow: "故事库已建立",
    title: "已有面试故事，可以直接评估岗位",
    description: "故事数量和完善状态不影响后续流程；拿到招聘截图或完整 JD 后即可评估，再按目标岗位持续补充和打磨。",
    completedTitle: "整理面试故事库",
    nextTitle: "岗位评估",
    nextStatus: "下一步",
    CompletedIcon: JourneyStoryIcon,
    NextIcon: JourneyDiagnosisIcon,
  },
} satisfies Record<JourneyHandoffStage, {
  progress: number;
  eyebrow: string;
  title: string;
  description: string;
  completedTitle: string;
  nextTitle: string;
  nextStatus: string;
  CompletedIcon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  NextIcon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}>;

export function JourneyHandoffCard({ stage }: {
  stage: JourneyHandoffStage;
}) {
  const content = JOURNEY_HANDOFF_CONTENT[stage];
  const { CompletedIcon, NextIcon } = content;
  const titleId = `journey-handoff-${stage}`;

  return (
    <section
      data-journey-handoff={stage}
      data-ui-card="solid"
      role="region"
      aria-labelledby={titleId}
      className="mt-6 overflow-hidden"
    >
      <div className="px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            新用户教程 · {content.eyebrow}
          </p>
          <h2 id={titleId} className="mt-1.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {content.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            {content.description}
          </p>
        </div>
      </div>

      <div className="grid gap-5 border-t border-border px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <ol className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center" aria-label="当前流程接力">
          <li className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-surface text-success">
              <Check className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-success">已完成</p>
              <div className="mt-1 flex items-center gap-2">
                <CompletedIcon className="size-4 shrink-0 text-icon-success" aria-hidden="true" />
                <span className="truncate text-sm font-semibold text-foreground">{content.completedTitle}</span>
              </div>
            </div>
          </li>

          <ArrowRight className="ml-5 size-4 rotate-90 text-icon-muted sm:ml-0 sm:rotate-0" aria-hidden="true" />

          <li className="flex min-w-0 items-center gap-3 rounded-card bg-surface-hover px-4 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold tabular-nums text-brand-text">
              {stage === "story-complete" ? (
                <ArrowRight className="size-4" aria-hidden="true" />
              ) : (
                content.progress + 1
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-text">{content.nextStatus}</p>
              <div className="mt-1 flex items-center gap-2">
                <NextIcon className="size-4 shrink-0 text-icon-brand" aria-hidden="true" />
                <span className="truncate text-sm font-semibold text-foreground">{content.nextTitle}</span>
              </div>
            </div>
          </li>
        </ol>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          {stage === "profile-current" ? (
            <Link href="/profile" className={cn(buttonVariants({ variant: "primary" }), "min-h-11 px-5 py-2")}>
              完善求职画像 <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : stage === "story-complete" ? (
            <Link href="/cn-diagnose" className={cn(buttonVariants({ variant: "primary" }), "min-h-11 px-5 py-2")}>
              岗位评估 <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <CreateStoryBankAction />
          )}
          <p className="max-w-sm text-xs leading-5 text-faint lg:text-right">
            Web 只保存 Agent 待办；内容由你确认后才会写入本地文件。
          </p>
        </div>
      </div>
    </section>
  );
}

function CvAgentOnboarding() {
  const paths = [
    ["01", "上传或粘贴现有简历", "Agent 提取事实并整理成清晰的 Markdown 简历。"],
    ["02", "提供公开职业资料", "Agent 先汇总可验证信息，再请你逐项核对。"],
    ["03", "通过逐步访谈从零建立", "Agent 围绕经历、能力与目标岗位逐步提问。"],
  ];

  return (
    <section
      data-cv-agent-onboarding
      role="region"
      aria-labelledby="cv-agent-onboarding-title"
      className="mt-7 overflow-hidden rounded-panel border border-brand/25 bg-brand-soft/40 shadow-raised"
    >
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] lg:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
              <Bot className="size-5" aria-hidden="true" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent-text">
              推荐 · Agent 原生建档
            </p>
          </div>
          <h2 id="cv-agent-onboarding-title" className="mt-5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            先和你的 Agent 完成第一版简历
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">
            Agent 会通过现有简历、公开职业资料或逐步访谈整理事实，先让你核对，再把完整草稿保存为
            {" "}<code className="font-mono text-foreground">cv.md</code>。
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <CreateCvWithAgentAction />
            <p className="max-w-md text-xs leading-5 text-faint">
              Web 工作台只保存待办和交接指令，不会在这里启动模型。
            </p>
          </div>
        </div>

        <ol className="grid gap-3" aria-label="使用 Agent 创建简历的方式">
          {paths.map(([number, title, description]) => (
            <li
              key={number}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-card border border-border/80 bg-surface/75 p-4"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-accent-text">
                {number}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function CreateCvWithAgentAction() {
  const taskOpts = useMemo(() => ({
    title: "创建第一版个人简历",
    subtitle: "等待用户自己的 Agent 引导建档",
    kind: "cv",
    input: "cv.md",
    page: "/cv",
  }), []);
  return (
    <QueuedAgentTaskAction
      taskOpts={taskOpts}
      labels={{
        idle: "在 Agent 中创建简历",
        running: "Agent 正在创建",
        waitingApproval: "查看待确认简历",
        done: "查看创建结果",
      }}
    />
  );
}

export function CreateStoryBankAction() {
  const taskOpts = useMemo(() => ({
    title: "按求职画像整理面试故事库",
    subtitle: "等待用户自己的 Agent 处理",
    kind: "story-bank",
    input: "cv.md",
    page: "/interview",
  }), []);
  return (
    <QueuedAgentTaskAction
      taskOpts={taskOpts}
      labels={{
        idle: "用 Agent 整理故事库",
        running: "Agent 正在整理",
        waitingApproval: "查看待确认提案",
        done: "查看整理结果",
      }}
    />
  );
}

function QueuedAgentTaskAction({
  taskOpts,
  labels,
}: {
  taskOpts: {
    title: string;
    subtitle: string;
    kind: string;
    input: string;
    page: string;
  };
  labels: {
    idle: string;
    running: string;
    waitingApproval: string;
    done: string;
  };
}) {
  const { jobs, queueAgentTask } = useJobs();
  const job = useMemo(
    () => jobs
      .filter((item) => item.kind === taskOpts.kind && item.input === taskOpts.input)
      .sort((a, b) => b.startedAt - a.startedAt)[0],
    [jobs, taskOpts],
  );
  const [handoff, setHandoff] = useState<AgentTaskHandoff | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const queuingRef = useRef(false);

  function showExistingHandoff() {
    if (!job) return;
    setHandoff({
      id: job.id,
      instruction: buildQueuedTaskInstruction(taskOpts, job.id),
    });
    setHandoffOpen(true);
  }

  function beginAgentHandoff() {
    if (queuingRef.current) return;
    if (
      job?.runStatus === "queued"
      || job?.runStatus === "waiting_approval"
      || job?.status === "running"
      || job?.status === "error"
    ) {
      showExistingHandoff();
      return;
    }
    queuingRef.current = true;
    const next = queueAgentTask(taskOpts);
    setHandoff(next);
    setHandoffOpen(true);
    window.setTimeout(() => {
      queuingRef.current = false;
    }, 500);
  }

  if (job?.runStatus === "waiting_approval" || job?.status === "done") {
    return (
      <Link
        href={`/jobs/${job.id}`}
        className={cn(buttonVariants({ variant: "tertiary" }), "min-h-11 px-5 py-2")}
      >
        <Bot className="size-4 text-icon-brand" aria-hidden="true" />
        {job.runStatus === "waiting_approval" ? labels.waitingApproval : labels.done}
      </Link>
    );
  }

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        size="lg"
        onClick={job?.runStatus === "queued" || job?.status === "running" || job?.status === "error"
          ? showExistingHandoff
          : beginAgentHandoff}
        aria-haspopup="dialog"
        aria-expanded={handoffOpen}
      >
        {job?.status === "running" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : job?.status === "error" ? (
          <RotateCcw className="size-4" aria-hidden="true" />
        ) : (
          <Bot className="size-4" aria-hidden="true" />
        )}
        {job?.runStatus === "queued"
          ? "等待 Agent 处理"
          : job?.status === "running"
            ? labels.running
            : job?.status === "error"
              ? "回到 Agent 重试"
              : labels.idle}
      </Button>
      <AgentTaskHandoffDialog
        handoff={handoff}
        open={handoffOpen}
        onClose={() => setHandoffOpen(false)}
        returnFocusRef={triggerRef}
      />
    </>
  );
}

/**
 * Per-story maintenance entry points. Every write carries an immutable story
 * ID; the server merges that one block into the user-owned story bank.
 */
export function StoryActions({ story }: { story: InterviewStory }) {
  const router = useRouter();
  const { jobs, queueAgentTask } = useJobs();
  const job = useMemo(
    () => jobs
      .filter((item) => item.kind === "story" && item.input === story.id)
      .sort((a, b) => b.startedAt - a.startedAt)[0],
    [jobs, story.id],
  );
  const taskOpts = useMemo(() => ({
    title: `优化面试故事 · ${story.id} ${story.title}`,
    subtitle: "等待用户自己的 Agent 处理",
    kind: "story",
    input: story.id,
    page: "/interview",
  }), [story.id, story.title]);
  const [handoff, setHandoff] = useState<AgentTaskHandoff | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [baseHash, setBaseHash] = useState("");
  const [error, setError] = useState("");
  const agentTriggerRef = useRef<HTMLButtonElement>(null);
  const queuingRef = useRef(false);
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

  function showExistingHandoff() {
    if (!job) return;
    setHandoff({
      id: job.id,
      instruction: buildQueuedTaskInstruction(taskOpts, job.id),
    });
    setHandoffOpen(true);
  }

  function beginAgentHandoff() {
    if (queuingRef.current) return;
    if (
      job?.runStatus === "queued"
      || job?.runStatus === "waiting_approval"
      || job?.status === "running"
      || job?.status === "error"
    ) {
      showExistingHandoff();
      return;
    }
    queuingRef.current = true;
    const next = queueAgentTask(taskOpts);
    setHandoff(next);
    setHandoffOpen(true);
    window.setTimeout(() => {
      queuingRef.current = false;
    }, 500);
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {job?.runStatus === "waiting_approval" ? (
          <Link href={`/jobs/${job.id}`} className={STORY_ACTION_CLASS}>
            <Bot className="size-3.5 text-icon-brand" aria-hidden="true" />
            等待确认
          </Link>
        ) : job?.status === "running" ? (
          <Link href={`/jobs/${job.id}`} className={STORY_ACTION_CLASS}>
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Agent 正在优化…
          </Link>
        ) : (
          <Button
            ref={agentTriggerRef}
            type="button"
            variant="tertiary"
            size="sm"
            onClick={job?.runStatus === "queued" || job?.status === "error" ? showExistingHandoff : beginAgentHandoff}
            aria-haspopup="dialog"
            aria-expanded={handoffOpen}
            className="group"
            title="由你的 Codex、WorkBuddy 或其他 Agent 优化这条面试故事"
          >
            {job?.status === "error" ? (
              <RotateCcw className="size-3.5 text-icon-muted transition-colors group-hover:text-icon-brand" aria-hidden="true" />
            ) : (
              <Bot className="size-3.5 text-icon-muted transition-colors group-hover:text-icon-brand" aria-hidden="true" />
            )}
            {job?.runStatus === "queued"
              ? "等待 Agent 处理"
              : job?.status === "error"
                ? "回到 Agent 重试"
                : "在 Agent 中优化"}
          </Button>
        )}
        <Button
          type="button"
          variant="tertiary"
          size="sm"
          onClick={openManualEditor}
          className="group"
        >
          <PencilLine className="size-3.5 text-icon-muted transition-colors group-hover:text-icon-brand" />
          手动维护
        </Button>
      </div>

      <AgentTaskHandoffDialog
        handoff={handoff}
        open={handoffOpen}
        onClose={() => setHandoffOpen(false)}
        returnFocusRef={agentTriggerRef}
      />

      {manualOpen && (
        <div
          data-ui-dialog-backdrop
          className="z-[60]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setManualOpen(false);
          }}
        >
          <section
            data-ui-dialog="standard"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`story-editor-title-${story.id}`}
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden"
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setManualOpen(false)}
                disabled={saving}
                className="text-muted"
                aria-label="关闭手动编辑"
              >
                <X className="size-5" />
              </Button>
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
              <Button
                type="button"
                size="lg"
                onClick={saveStory}
                disabled={!loaded || !dirty || saving || !baseHash}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
                {saving ? "正在保存" : saved ? "已保存" : "确认并保存"}
              </Button>
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
        data-ui-control
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
