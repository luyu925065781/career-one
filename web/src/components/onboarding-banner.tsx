"use client";

import { useMemo, useRef, useState } from "react";
import { Bot, CircleCheck, UserRound } from "lucide-react";
import { AgentTaskHandoffDialog } from "@/components/generate-pdf-button";
import {
  buildQueuedTaskInstruction,
  type AgentTaskHandoff,
  useJobs,
} from "@/components/jobs/job-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type SetupAction = {
  id: "profile";
  title: string;
  description: string;
  cta: string;
  complete: boolean;
  icon: typeof UserRound;
};

const PROFILE_LABELS: Record<string, string> = {
  "config/profile.yml": "目标岗位、地点和薪资边界",
  "modes/_profile.md": "个性化求职策略",
};

// The profile is the explicit second onboarding step, immediately after the CV.
// The Dashboard passes the server-side doctor result in directly, so this checklist
// never flashes in after hydration. Web only persists a specific Agent handoff;
// it never starts a model itself.
export function ProfileSetupChecklist({ missing }: { missing: string[] }) {
  const profileMissing = missing.filter((file) => file in PROFILE_LABELS);

  const actions = useMemo<SetupAction[]>(() => [
    {
      id: "profile",
      title: "完善求职画像",
      description: "一次确认完整画像：岗位、地点、薪资、优势、动力与红线",
      cta: "在 Agent 中完善画像",
      complete: profileMissing.length === 0,
      icon: UserRound,
    },
  ], [profileMissing]);
  const completedCount = actions.filter((action) => action.complete).length;

  return (
    <section
      id="profile-setup"
      data-profile-setup
      aria-labelledby="profile-setup-title"
      className="scroll-mt-6 rounded-card border border-brand/25 bg-brand-soft/30 p-4 md:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-text">第二步 · 求职画像</p>
          <h3 id="profile-setup-title" className="mt-1 text-base font-semibold text-foreground">
            一次确认完整画像
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            简历事实准备好后，先确认岗位、地点、薪资和边界，再按目标整理面试故事。
          </p>
        </div>
        <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold tabular-nums text-brand-text ring-1 ring-inset ring-brand/20">
          {completedCount} / {actions.length}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {actions.map((action) => {
          const ActionIcon = action.icon;
          return (
            <article key={action.id} data-ui-card="solid" className="p-4">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-full border",
                    action.complete
                      ? "border-success-border bg-success-surface text-success"
                      : "border-brand/30 bg-brand-soft text-icon-brand",
                  )}
                >
                  {action.complete
                    ? <CircleCheck className="size-4.5" aria-hidden="true" />
                    : <ActionIcon className="size-4.5" aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{action.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{action.description}</p>
                </div>
              </div>

              {action.complete ? (
                <p className="mt-3 text-xs font-semibold text-success">已准备</p>
              ) : (
                <ProfileAgentAction
                  missing={profileMissing}
                  page="/"
                  label={action.cta}
                  variant="secondary"
                  className="mt-3 w-full sm:w-auto"
                />
              )}
            </article>
          );
        })}
      </div>

      <p className="mt-3 text-xs leading-5 text-faint">
        Web 只保存待办和交接指令；你的 Agent 会先给出草稿，得到确认后才写入本地文件。
      </p>
    </section>
  );
}

export function ProfileAgentAction({
  missing,
  page = "/profile",
  label = "在 Agent 中更新画像",
  variant = "primary",
  className,
}: {
  missing: string[];
  page?: "/" | "/profile";
  label?: string;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const { jobs, queueAgentTask } = useJobs();
  const [handoff, setHandoff] = useState<AgentTaskHandoff | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const queuingRef = useRef(false);
  const profileMissing = missing.filter((file) => file in PROFILE_LABELS);
  const input = profileMissing.length > 0
    ? profileMissing.map((file) => PROFILE_LABELS[file]).join("、")
    : "更新已确认的求职画像";
  const taskOpts = useMemo(() => ({
    title: profileMissing.length > 0 ? "完善求职画像" : "更新求职画像",
    subtitle: "等待用户自己的 Agent 处理",
    kind: "profile",
    input,
    page,
  }), [input, page, profileMissing.length]);
  const job = useMemo(
    () => jobs
      .filter((item) => item.kind === taskOpts.kind && item.input === taskOpts.input)
      .sort((a, b) => b.startedAt - a.startedAt)[0],
    [jobs, taskOpts],
  );
  const reusable = Boolean(job && (
    job.runStatus === "queued"
    || job.runStatus === "waiting_approval"
    || job.status === "running"
    || job.status === "error"
  ));

  function showHandoff() {
    if (queuingRef.current) return;
    triggerRef.current?.focus();
    if (job && reusable) {
      setHandoff({
        id: job.id,
        instruction: buildQueuedTaskInstruction(taskOpts, job.id),
      });
      setHandoffOpen(true);
      return;
    }

    queuingRef.current = true;
    setHandoff(queueAgentTask(taskOpts));
    setHandoffOpen(true);
    window.setTimeout(() => {
      queuingRef.current = false;
    }, 500);
  }

  const currentLabel = job?.runStatus === "waiting_approval"
    ? "查看待确认画像"
    : job?.runStatus === "queued"
      ? "查看 Agent 指令"
      : job?.status === "running"
        ? "查看处理进度"
        : job?.status === "error"
          ? "回到 Agent 重试"
          : label;

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant={variant}
        size="sm"
        onClick={showHandoff}
        aria-haspopup="dialog"
        aria-expanded={handoffOpen}
        className={className}
      >
        <Bot className="size-4" aria-hidden="true" />
        {currentLabel}
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
