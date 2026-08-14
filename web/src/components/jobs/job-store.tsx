"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { localizeUserMessage, scoreTone } from "@/lib/format";

export type JobStep = { kind: "tool" | "status"; label: string; ts: number };
export type JobResult = { score: number | null; summary: string; tone: "good" | "warn" | "bad" | "muted" };
export type JobArtifact = { path: string; label: string; page?: string; available?: boolean };
export type JobProposal = { id: string; title: string; summary: string; target: string; status: "pending" | "applied" | "rejected" | "stale"; createdAt: string; updatedAt: string };
export type AgentTaskAttachmentInput = { name: string; type: string; dataUrl: string };
export type SharedRunStatus = "queued" | "running" | "waiting_input" | "waiting_approval" | "completed" | "failed" | "cancelled";

export type Job = {
  id: string;
  title: string;
  subtitle?: string;
  page?: string; // route the job was launched from / refers to
  input?: string; // the URL/posting it processed (links inbox rows to their worker)
  kind?: string;
  batchId?: string; // groups jobs fired together (e.g. "evaluate all Anthropic")
  source?: "agent" | "web";
  runStatus?: SharedRunStatus;
  instruction?: string;
  question?: string;
  status: "running" | "waiting" | "done" | "error";
  steps: JobStep[];
  text: string;
  result?: JobResult;
  artifacts?: JobArtifact[];
  proposals?: JobProposal[];
  cacheState?: "unverified";
  cost?: { tokens: number; usd?: number }; // per-run token cost (Claude result event) — local only
  startedAt: number;
  endedAt?: number;
};

export function isInvalidJob(
  job: Pick<Job, "status" | "runStatus" | "endedAt">,
) {
  return (
    job.status === "error"
    || job.runStatus === "failed"
    || job.runStatus === "cancelled"
    || (job.endedAt != null && job.status !== "done")
  );
}

type StartOpts = {
  title: string;
  subtitle?: string;
  kind: string;
  input: string;
  page?: string;
  batchId?: string;
  attachments?: AgentTaskAttachmentInput[];
  attachmentPaths?: string[];
};

export type AgentTaskHandoff = {
  id: string;
  instruction: string;
  attachmentPaths?: string[];
};

type Ctx = {
  jobs: Job[];
  jobsReady: boolean;
  startJob: (opts: StartOpts) => string | null;
  queueAgentTask: (opts: StartOpts) => AgentTaskHandoff;
  queueAgentTaskWithAttachments: (opts: StartOpts) => Promise<AgentTaskHandoff>;
  attachToAgentTask: (id: string, opts: StartOpts) => Promise<AgentTaskHandoff>;
  removeJob: (id: string) => Promise<void>;
  clearFinished: () => void;
  refreshJobs: () => void;
};

const JobsContext = createContext<Ctx | null>(null);
export function useJobs() {
  const c = useContext(JobsContext);
  if (!c) throw new Error("useJobs must be used within <JobsProvider>");
  return c;
}

const JOBS_KEY_PREFIX = "career-one:jobs:";
const EVALUATION_PREFLIGHT = "接手后第一步请运行 `node doctor.mjs --json`。若 `onboardingNeeded` 为 true，不得评估、评分、生成报告或更新求职记录；请保留当前岗位输入和附件，沿用本任务 ID 从 doctor 返回的第一个缺失项开始完成 onboarding，并用 `run wait` 记录真实等待状态。前置资料完成并经用户批准后，继续同一任务完成评估，无需重新上传或创建任务；面试故事库不作为阻塞项。";

function jobsStorageKey(workspaceId: string) {
  return `${JOBS_KEY_PREFIX}${workspaceId}`;
}

function cachedJobsForWorkspace(workspaceId: string): Job[] {
  try {
    const raw = localStorage.getItem(jobsStorageKey(workspaceId));
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((j: Job) => {
      const localized = {
        ...j,
        cacheState: "unverified" as const,
        text: localizeUserMessage(j.text || ""),
        steps: (j.steps || []).map((step) => ({ ...step, label: localizeUserMessage(step.label) })),
        artifacts: (j.artifacts ?? []).map((artifact) => ({ ...artifact, available: false })),
      };
      const persistentAgentTask = Boolean(j.runStatus) || j.id.startsWith("run-web-");
      return j.status === "running" && !persistentAgentTask
        ? { ...localized, status: "error" as const, steps: [...localized.steps, { kind: "status" as const, label: "页面重新加载，任务已中断", ts: Date.now() }] }
        : localized;
    });
  } catch {
    return [];
  }
}

type SharedRun = {
  id: string;
  intent: string;
  title: string;
  subtitle?: string;
  source: "agent" | "web";
  input?: string;
  page?: string;
  instruction?: string;
  question?: string;
  status: SharedRunStatus;
  progress?: { kind?: string; label: string; at: string }[];
  summary?: string;
  score?: number;
  error?: string;
  artifacts?: JobArtifact[];
  proposals?: JobProposal[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

function sharedRunToJob(run: SharedRun): Job {
  const status: Job["status"] = run.status === "completed"
    ? "done"
    : run.status === "failed" || run.status === "cancelled"
      ? "error"
      : run.status === "queued" || run.status === "waiting_input" || run.status === "waiting_approval"
        ? "waiting"
        : "running";
  const score = typeof run.score === "number" ? run.score : null;
  return {
    id: run.id,
    title: run.title,
    subtitle: run.subtitle,
    page: run.page,
    input: run.input,
    kind: run.intent,
    source: run.source,
    runStatus: run.status,
    instruction: run.instruction,
    question: run.question,
    status,
    steps: (run.progress ?? []).map((step) => ({ kind: step.kind === "tool" ? "tool" : "status", label: localizeUserMessage(step.label), ts: Date.parse(step.at) || Date.now() })),
    text: localizeUserMessage(run.error || ""),
    result: status === "done" ? { score, summary: run.summary ?? "", tone: score == null ? "muted" : scoreTone(String(score)) } : undefined,
    artifacts: run.artifacts ?? [],
    proposals: run.proposals ?? [],
    startedAt: Date.parse(run.createdAt) || Date.now(),
    endedAt: run.completedAt ? Date.parse(run.completedAt) : undefined,
  };
}

export function buildQueuedTaskInstruction(opts: StartOpts, id: string): string {
  const continuation = `已有待办任务 ID：${id}。`;
  if (opts.kind === "pdf") {
    const reportNumber = /^\d+$/.test(opts.input) ? opts.input.padStart(3, "0") : opts.input;
    return `${continuation} 请使用择程AI继续为岗位评估报告 #${reportNumber} 生成定制简历 PDF，完成后给我查看链接。请继续这个任务，不要创建新任务。`;
  }
  if (opts.kind === "cv") {
    return `${continuation} 请使用择程AI帮我创建 cv.md。请先让我选择上传或粘贴现有简历、提供公开职业资料，或通过逐步访谈从零建立；只使用允许的本地事实来源和当前对话中由我直接确认的信息，先给出事实摘要并把不确定内容标为“待确认”。不得虚构经历、指标、技能或个人贡献；完成后先创建针对 cv.md 的待确认提案，等我确认后再保存。请继续这个任务，不要创建新任务。`;
  }
  if (opts.kind === "story-bank") {
    return `${continuation} 请使用择程AI先确认 config/profile.yml 和 modes/_profile.md 已存在；画像缺失时不要生成面试故事，应先提醒我完成一次性求职画像。画像已准备后，再基于 cv.md、求职画像和允许的本地事实来源，优先整理 1 个与目标岗位最相关的 STAR+Reflection 主故事；已有充分且已确认的素材时，可以一并建议后续候选故事，但不要把凑数量当成完成条件。不得虚构经历、指标或个人贡献；先给出事实摘要和候选故事结构，再创建针对 interview-prep/story-bank.md 的待确认提案，等我确认后再保存。请继续这个任务，不要创建新任务。`;
  }
  if (opts.kind === "story") {
    const storyId = opts.input.trim().toUpperCase();
    return `${continuation} 请使用择程AI继续优化面试故事 ${storyId}，并以达到“已完善”标准为目标。只处理 interview-prep/story-bank.md 中这一条故事，基于允许的本地事实来源完成 STAR+Reflection，不得虚构经历、指标或个人贡献。请先充分利用已经确认的事实进行排序、归纳和结构化表达，不要主动增加非必要的“待确认”项；关键事实确实缺失、导致完善标准无法满足时，先用最少的问题向我追问，不要把问题清单直接当成优化结果。没有必要待确认项后，提案中的状态直接写为“已完善”，但仍须等我确认提案后才能保存；只有我明确选择跳过关键问题时，才保留“待完善”。先给我查看修改摘要和完整草稿，等我确认后再保存。请继续这个任务，不要创建新任务。`;
  }
  if (opts.kind === "discovery-setup") {
    return `${continuation} 请使用择程AI为我生成第一版岗位搜索条件。先读取 cv.md；如果 interview-prep/story-bank.md 存在，也读取其中已经确认的事实。只使用允许的本地事实来源，提炼目标岗位、相邻岗位、排除关键词和地区规则；不得把未出现的信息当作用户偏好，不得虚构技能、经历或求职红线。排除关键词和地区偏好只能作为建议，信息不足时标为“待确认”并用最少的问题向我确认。先给出事实摘要和完整的搜索条件草稿；我确认内容后，再创建针对 portals.yml 的待确认提案，等我确认后再保存。请继续这个任务，不要创建新任务。`;
  }
  if (opts.kind === "discover") {
    return `${continuation} 请使用择程AI根据以下目标搜索公开岗位：“${opts.input.trim()}”。请按 modes/scan.md 执行 Agent 搜索和岗位活性验证，将通过验证且符合条件的新岗位加入 data/pipeline.md，并同步更新 data/scan-history.tsv。完成后告诉我搜索范围、新增岗位数量和下一步建议。请继续这个任务，不要创建新任务。`;
  }
  if (opts.kind === "evaluate") {
    const screenshotInput = opts.input.trim();
    if (screenshotInput.startsWith("screenshot:")) {
      const screenshotNames = screenshotInput.slice("screenshot:".length).trim();
      const attachmentPaths = opts.attachmentPaths?.filter((value) => value.startsWith("data/task-attachments/")) ?? [];
      const stored = attachmentPaths.length > 0
        ? ` 截图已保存在当前工作区：${attachmentPaths.join("、")}。请直接读取这些本地文件；生成报告时在报告头加入“**Screenshots:** ${attachmentPaths.join(" | ")}”，让 Web 报告展示原始岗位截图。`
        : "";
      return `${continuation} ${EVALUATION_PREFLIGHT}请使用择程AI评估本次招聘截图${screenshotNames ? `（记录名：${screenshotNames}）` : ""}。${stored}只使用截图中可见的岗位事实和允许的本地事实来源，不得虚构候选人经历或岗位要求；先提取岗位信息并标出截图无法确认的内容。如果截图中包含可访问链接，再用真实浏览器验证；没有链接时请明确标注无法验证。生成岗位匹配评估报告并更新求职记录后，告诉我得分、关键依据和是否建议投递。请继续这个任务，不要创建新任务。`;
    }
    return `${continuation} ${EVALUATION_PREFLIGHT}请使用择程AI评估这个岗位：${screenshotInput}。请先用真实浏览器确认岗位有效性，再根据 cv.md、config/profile.yml、modes/_profile.md 和允许的本地事实来源完成岗位匹配评估；不得虚构候选人经历。生成评估报告并更新求职记录后，告诉我得分、关键依据和是否建议投递。请继续这个任务，不要创建新任务。`;
  }
  if (opts.kind === "profile") {
    return `${continuation} 请使用择程AI帮我补全本地求职画像。目前需要处理：${opts.input.trim()}。先读取 cv.md、article-digest.md、config/profile.yml、modes/_profile.md、writing-samples/ 和 interview-prep/ 中允许使用的事实，已有且明确的内容直接预填，不要重复询问。在第一条回复中一次性列出所有仍需用户确认的项目，并按编号包含：1. 姓名和联系方式；2. 所在城市、时区；3. 目标岗位与职级；4. 地点、工作方式与迁居意愿；5. 目标薪资范围与最低接受值；6. 核心优势与代表成果；7. 动力来源、理想工作方式与求职红线；8. 公开项目、文章、案例或作品集。不得从记忆或其他项目猜测个人事实，不得拆分为多轮逐项追问；允许用户一次回答全部项目，没有回答的项目保留为“待确认”。收到这一次回答后，直接整理 config/profile.yml 和 modes/_profile.md 的完整候选稿并创建待确认提案；提案经用户明确批准前不得写入目标文件。请继续这个任务，不要创建新任务。`;
  }
  if (opts.kind === "portals") {
    return `${continuation} 请使用择程AI帮我配置岗位来源。目前需要处理：${opts.input.trim()}。请基于我已确认的目标岗位和地区，通过中文对话确认搜索关键词、排除关键词、优先渠道与目标公司；不得从记忆或其他项目猜测个人偏好。先展示拟写入内容并创建针对 portals.yml 的待确认提案，等我确认后再保存；已经存在的配置不要覆盖或重复询问。请继续这个任务，不要创建新任务。`;
  }
  if (opts.kind === "fix-portal") {
    return `${continuation} 请使用择程AI检查并修复“${opts.input.trim()}”的公开招聘来源配置。请先验证公司官方招聘入口，再给出修改摘要，等我确认后更新 portals.yml。请继续这个任务，不要创建新任务。`;
  }
  return `${continuation} 请使用择程AI继续处理“${opts.title}”，完成后给我查看结果。请继续这个任务，不要创建新任务。`;
}

export function buildExistingTaskInstruction(
  job: Pick<Job, "id" | "instruction" | "title" | "subtitle" | "kind" | "input" | "page" | "batchId">,
): string | null {
  const persisted = job.instruction?.trim();
  if (persisted) return persisted;
  if (!job.kind?.trim() || !job.input?.trim()) return null;
  return buildQueuedTaskInstruction({
    title: job.title,
    subtitle: job.subtitle,
    kind: job.kind,
    input: job.input,
    page: job.page,
    batchId: job.batchId,
  }, job.id);
}

export function buildWaitingInputInstruction(
  job: Pick<Job, "id" | "question">,
  answer?: string,
): string {
  const question = job.question?.trim() || "请补充 Agent 当前需要的信息。";
  const normalizedAnswer = answer?.trim().slice(0, 1_000);
  const response = normalizedAnswer ? `我的回答：${normalizedAnswer}。` : "";
  return `已有待办任务 ID：${job.id}。Agent 正在等待我回答：${question} ${response}请继续这个任务，不要创建新任务。`;
}

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsReady, setJobsReady] = useState(false);
  const seq = useRef(0);
  const loaded = useRef(false);
  const localJobsRef = useRef<Job[]>([]);
  const sharedProtocolLoaded = useRef(false);
  const storageKeyRef = useRef<string | null>(null);

  const refreshJobs = useCallback(() => {
    const syncStartedAt = Date.now();
    fetch("/api/agent-runs", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId : "";
        if (!workspaceId) throw new Error("当前工作区身份不可用");

        const storageKey = jobsStorageKey(workspaceId);
        const workspaceChanged = storageKeyRef.current !== storageKey;
        storageKeyRef.current = storageKey;
        const cached = cachedJobsForWorkspace(workspaceId);
        localJobsRef.current = cached;

        if (!response.ok) throw new Error(payload.error || "Agent 任务加载失败");
        return { payload, cached, workspaceChanged };
      })
      .then(({ payload, cached, workspaceChanged }) => {
        const shared = Array.isArray(payload.runs) ? (payload.runs as SharedRun[]).map(sharedRunToJob) : [];
        sharedProtocolLoaded.current = true;
        setJobs((current) => {
          const base = workspaceChanged ? cached : current;
          const local = new Map(base.map((job) => [job.id, job]));
          const sharedIds = new Set(shared.map((job) => job.id));
          const merged = shared.map((job) => {
            const existing = local.get(job.id);
            if (!existing) return job;
            return {
              ...job,
              text: existing.text || job.text,
              result: existing.result || job.result,
              cost: existing.cost,
              batchId: existing.batchId,
              artifacts: job.artifacts?.length ? job.artifacts : existing.artifacts,
              steps: job.steps.length ? job.steps : existing.steps,
            };
          });
          // The shared registry is authoritative for durable Agent work. Keep
          // only tasks created after this sync began as a short-lived optimistic
          // bridge while their queue request is still being persisted.
          const optimistic = base.filter((job) => (
            !sharedIds.has(job.id) && job.startedAt >= syncStartedAt
          ));
          return [...optimistic, ...merged].sort((a, b) => b.startedAt - a.startedAt).slice(0, 100);
        });
      })
      .catch(() => {
        // Web remains usable if an older workspace does not have the shared
        // protocol yet. Once it has responded successfully, do not resurrect
        // browser-local tasks when a later poll briefly fails.
        if (!sharedProtocolLoaded.current) setJobs(localJobsRef.current);
      })
      .finally(() => setJobsReady(true));
  }, []);

  // Resolve the server workspace before restoring browser history. localStorage
  // is scoped only by origin, so a bare localhost cache can belong to another
  // isolated CAREER_ONE_ROOT even when the port is unchanged.
  useEffect(() => {
    loaded.current = true;
    refreshJobs();
    const poll = window.setInterval(refreshJobs, 3_000);
    return () => window.clearInterval(poll);
  }, [refreshJobs]);

  // persist
  useEffect(() => {
    if (!loaded.current || !jobsReady) return;
    const storageKey = storageKeyRef.current;
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(jobs.slice(0, 40)));
    } catch {
      /* quota */
    }
  }, [jobs]);

  const patch = useCallback((id: string, fn: (j: Job) => Job) => {
    setJobs((js) => js.map((j) => (j.id === id ? fn(j) : j)));
  }, []);

  const queueAgentTaskRequest = useCallback(
    (opts: StartOpts): { handoff: AgentTaskHandoff; persisted: Promise<AgentTaskHandoff> } => {
      const id = `run-web-${opts.kind}-${Date.now()}-${seq.current++}`;
      const instruction = buildQueuedTaskInstruction(opts, id);
      const job: Job = {
        id,
        title: opts.title,
        subtitle: opts.subtitle,
        page: opts.page,
        input: opts.input,
        kind: opts.kind,
        batchId: opts.batchId,
        source: "web",
        runStatus: "queued",
        instruction,
        status: "waiting",
        steps: [{ kind: "status", label: "已加入 Agent 待办", ts: Date.now() }],
        text: "",
        startedAt: Date.now(),
      };
      setJobs((current) => [job, ...current]);

      const persisted = fetch("/api/agent-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "queue",
          id,
          intent: opts.kind,
          title: opts.title,
          subtitle: opts.subtitle,
          source: "web",
          input: opts.input,
          page: opts.page,
          instruction,
          attachments: opts.attachments,
        }),
      })
        .then(async (response) => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || "加入 Agent 待办失败");
          if (typeof payload.id === "string" && payload.id !== id) {
            setJobs((current) => current.filter((item) => item.id !== id));
          }
          refreshJobs();
          return {
            id: typeof payload.id === "string" ? payload.id : id,
            instruction: typeof payload.instruction === "string" ? payload.instruction : instruction,
            attachmentPaths: Array.isArray(payload.attachmentPaths) ? payload.attachmentPaths : undefined,
          };
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : "加入 Agent 待办失败";
          patch(id, (current) => ({
            ...current,
            runStatus: "failed",
            status: "error",
            text: message,
            endedAt: Date.now(),
            steps: [...current.steps, { kind: "status", label: message, ts: Date.now() }],
          }));
          throw error;
        });

      return { handoff: { id, instruction }, persisted };
    },
    [patch, refreshJobs],
  );

  const queueAgentTask = useCallback(
    (opts: StartOpts): AgentTaskHandoff => {
      const request = queueAgentTaskRequest(opts);
      void request.persisted.catch(() => {});
      return request.handoff;
    },
    [queueAgentTaskRequest],
  );

  const queueAgentTaskWithAttachments = useCallback(
    async (opts: StartOpts): Promise<AgentTaskHandoff> => queueAgentTaskRequest(opts).persisted,
    [queueAgentTaskRequest],
  );

  const attachToAgentTask = useCallback(async (id: string, opts: StartOpts): Promise<AgentTaskHandoff> => {
    const instruction = buildQueuedTaskInstruction(opts, id);
    const response = await fetch("/api/agent-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "attach", id, instruction, attachments: opts.attachments }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "保存招聘截图失败");
    refreshJobs();
    return {
      id,
      instruction: typeof payload.instruction === "string" ? payload.instruction : instruction,
      attachmentPaths: Array.isArray(payload.attachmentPaths) ? payload.attachmentPaths : undefined,
    };
  }, [refreshJobs]);

  // Backward-compatible alias for legacy UI callers. Web never starts an Agent
  // process; every task is persisted as a handoff for the user's Agent product.
  const startJob = useCallback(
    (opts: StartOpts): string => queueAgentTask(opts).id,
    [queueAgentTask],
  );

  const removeJob = useCallback(async (id: string) => {
    const response = await fetch("/api/agent-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive", id }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "删除任务失败");
    setJobs((js) => js.filter((j) => j.id !== id));
  }, []);
  const clearFinished = useCallback(() => {
    const finished = jobs.filter((job) => job.status === "done" || isInvalidJob(job));
    setJobs((js) => js.filter((job) => job.status !== "done" && !isInvalidJob(job)));
    for (const job of finished) {
      fetch("/api/agent-runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "archive", id: job.id }) }).catch(() => {});
    }
  }, [jobs]);

  return <JobsContext.Provider value={{ jobs, jobsReady, startJob, queueAgentTask, queueAgentTaskWithAttachments, attachToAgentTask, removeJob, clearFinished, refreshJobs }}>{children}</JobsContext.Provider>;
}
