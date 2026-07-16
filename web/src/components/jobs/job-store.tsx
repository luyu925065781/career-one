"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { scoreTone } from "@/lib/format";

export type JobStep = { kind: "tool" | "status"; label: string; ts: number };
export type JobResult = { score: number | null; summary: string; tone: "good" | "warn" | "bad" | "muted" };
export type JobArtifact = { path: string; label: string; page?: string };
export type JobProposal = { id: string; title: string; summary: string; target: string; status: "pending" | "applied" | "rejected" | "stale"; createdAt: string; updatedAt: string };

export type Job = {
  id: string;
  title: string;
  subtitle?: string;
  page?: string; // route the job was launched from / refers to
  input?: string; // the URL/posting it processed (links inbox rows to their worker)
  kind?: string;
  batchId?: string; // groups jobs fired together (e.g. "evaluate all Anthropic")
  source?: "agent" | "web";
  status: "running" | "waiting" | "done" | "error";
  steps: JobStep[];
  text: string;
  result?: JobResult;
  artifacts?: JobArtifact[];
  proposals?: JobProposal[];
  cost?: { tokens: number; usd?: number }; // per-run token cost (Claude result event) — local only
  startedAt: number;
  endedAt?: number;
};

type StartOpts = { title: string; subtitle?: string; kind: string; input: string; page?: string; batchId?: string };

type Ctx = {
  jobs: Job[];
  startJob: (opts: StartOpts) => string | null;
  removeJob: (id: string) => void;
  clearFinished: () => void;
  refreshJobs: () => void;
};

const JobsContext = createContext<Ctx | null>(null);
export function useJobs() {
  const c = useContext(JobsContext);
  if (!c) throw new Error("useJobs must be used within <JobsProvider>");
  return c;
}

const CONFIG_KEY = "career-one:config";
const JOBS_KEY = "career-one:jobs";

type SharedRun = {
  id: string;
  intent: string;
  title: string;
  subtitle?: string;
  source: "agent" | "web";
  input?: string;
  page?: string;
  status: "queued" | "running" | "waiting_approval" | "completed" | "failed" | "cancelled";
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
  const status: Job["status"] = run.status === "completed" ? "done" : run.status === "failed" || run.status === "cancelled" ? "error" : run.status === "waiting_approval" ? "waiting" : "running";
  const score = typeof run.score === "number" ? run.score : null;
  return {
    id: run.id,
    title: run.title,
    subtitle: run.subtitle,
    page: run.page,
    input: run.input,
    kind: run.intent,
    source: run.source,
    status,
    steps: (run.progress ?? []).map((step) => ({ kind: step.kind === "tool" ? "tool" : "status", label: step.label, ts: Date.parse(step.at) || Date.now() })),
    text: run.error || "",
    result: status === "done" ? { score, summary: run.summary ?? "", tone: score == null ? "muted" : scoreTone(String(score)) } : undefined,
    artifacts: run.artifacts ?? [],
    proposals: run.proposals ?? [],
    startedAt: Date.parse(run.createdAt) || Date.now(),
    endedAt: run.completedAt ? Date.parse(run.completedAt) : undefined,
  };
}

function parseVerdict(text: string): JobResult {
  const m = text.match(/VERDICT:\s*([\d.]+)\s*\/\s*5\s*[—:|-]+\s*(.+)/i);
  if (m) {
    const score = parseFloat(m[1]);
    return { score, summary: m[2].trim().replace(/\s+/g, " ").slice(0, 90), tone: scoreTone(`${score}`) };
  }
  const s = text.match(/\b([0-5](?:\.\d)?)\s*\/\s*5\b/);
  if (s) {
    const score = parseFloat(s[1]);
    return { score, summary: "", tone: scoreTone(`${score}`) };
  }
  return { score: null, summary: "", tone: "muted" };
}

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const seq = useRef(0);
  const loaded = useRef(false);

  const refreshJobs = useCallback(() => {
    fetch("/api/agent-runs", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        const shared = Array.isArray(payload.runs) ? (payload.runs as SharedRun[]).map(sharedRunToJob) : [];
        setJobs((current) => {
          const local = new Map(current.map((job) => [job.id, job]));
          const sharedIds = new Set(shared.map((job) => job.id));
          const merged = shared.map((job) => {
            const existing = local.get(job.id);
            if (!existing) return job;
            const localFinishedBeforeSync = (existing.status === "done" || existing.status === "error") && (job.status === "running" || job.status === "waiting");
            return {
              ...job,
              status: localFinishedBeforeSync ? existing.status : job.status,
              text: existing.text || job.text,
              result: existing.result || job.result,
              cost: existing.cost,
              batchId: existing.batchId,
              artifacts: job.artifacts?.length ? job.artifacts : existing.artifacts,
              steps: job.steps.length ? job.steps : existing.steps,
            };
          });
          const notRegisteredYet = current.filter((job) => (
            !sharedIds.has(job.id)
            && (!job.source || job.status === "running" || job.status === "waiting")
          ));
          return [...notRegisteredYet, ...merged].sort((a, b) => b.startedAt - a.startedAt).slice(0, 100);
        });
      })
      .catch(() => {
        // Web remains usable if an older workspace does not have the shared protocol yet.
      });
  }, []);

  // restore history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(JOBS_KEY);
      const arr = raw ? JSON.parse(raw) : null;
      if (Array.isArray(arr)) {
        // anything left "running" from a previous session is stale → mark interrupted
        setJobs(arr.map((j: Job) => (j.status === "running" ? { ...j, status: "error", steps: [...(j.steps || []), { kind: "status", label: "Interrupted (page reloaded)", ts: Date.now() }] } : j)));
      }
    } catch {
      /* ignore */
    }
    loaded.current = true;
    refreshJobs();
    const poll = window.setInterval(refreshJobs, 3_000);
    return () => window.clearInterval(poll);
  }, [refreshJobs]);

  // persist
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(JOBS_KEY, JSON.stringify(jobs.slice(0, 40)));
    } catch {
      /* quota */
    }
  }, [jobs]);

  const patch = useCallback((id: string, fn: (j: Job) => Job) => {
    setJobs((js) => js.map((j) => (j.id === id ? fn(j) : j)));
  }, []);

  const startJob = useCallback(
    (opts: StartOpts): string | null => {
      let cliId: string | null = null;
      try {
        const raw = localStorage.getItem(CONFIG_KEY);
        cliId = raw ? JSON.parse(raw).cliId || null : null;
      } catch {
        cliId = null;
      }
      const id = `job-${Date.now()}-${seq.current++}`;
      const job: Job = {
        id,
        title: opts.title,
        subtitle: opts.subtitle,
        page: opts.page,
        input: opts.input,
        kind: opts.kind,
        batchId: opts.batchId,
        source: "web",
        status: "running",
        steps: [{ kind: "status", label: "正在启动…", ts: Date.now() }],
        text: "",
        startedAt: Date.now(),
      };
      setJobs((js) => [job, ...js]);

      const registration = fetch("/api/agent-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          id,
          intent: opts.kind,
          title: opts.title,
          subtitle: opts.subtitle,
          source: "web",
          input: opts.input,
          page: opts.page,
        }),
      }).then((response) => response.ok).catch(() => false);

      if (!cliId) {
        patch(id, (j) => ({ ...j, status: "error", endedAt: Date.now(), steps: [...j.steps, { kind: "status", label: "尚未配置 Agent CLI，请打开设置", ts: Date.now() }] }));
        registration.then(() => fetch("/api/agent-runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "fail", id, error: "尚未配置 Agent CLI，请打开设置" }),
        }).catch(() => {}));
        return id;
      }

      (async () => {
        let text = "";
        let verdictLine = ""; // latched separately so the 8000-char tail can't drop it
        let doneTokens = 0; // per-run token cost, forwarded on the done event (#6)
        let doneCostUsd: number | null = null;
        let doneArtifacts: JobArtifact[] = [];
        const steps: JobStep[] = [];
        const finish = (status: "done" | "error", lastLabel?: string) => {
          const result = status === "done" ? parseVerdict(verdictLine || text) : undefined;
          const cost = status === "done" && doneTokens > 0 ? { tokens: doneTokens, usd: doneCostUsd ?? undefined } : undefined;
          patch(id, (j) => ({
            ...j,
            status,
            result,
            cost,
            artifacts: doneArtifacts,
            endedAt: Date.now(),
            steps: lastLabel ? [...j.steps, { kind: "status", label: lastLabel, ts: Date.now() }] : j.steps,
          }));
          fetch("/api/agent-runs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(status === "done"
              ? { action: "complete", id, summary: result?.summary || lastLabel || "任务已完成", score: result?.score, page: doneArtifacts[0]?.page || opts.page, artifacts: doneArtifacts }
              : { action: "fail", id, error: lastLabel || "任务执行失败" }),
          }).then(() => refreshJobs()).catch(() => {});
          // persist a readable log file so the CLI/assistant can read past runs
          if (status === "done") {
            fetch("/api/runs/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id, title: opts.title, subtitle: opts.subtitle, page: opts.page, input: opts.input, result, cost, steps, output: text }),
            }).catch(() => {});
            // Tell server-snapshot surfaces (Today, pipeline) to refetch — the
            // worker just wrote a real tracker row / report they don't yet see.
            if (typeof window !== "undefined" && (opts.kind === "evaluate" || opts.kind === "pdf")) {
              window.dispatchEvent(new CustomEvent("co-job-done", { detail: { kind: opts.kind, input: opts.input } }));
            }
          }
        };

        try {
          await registration;
          const res = await fetch("/api/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: opts.kind, input: opts.input, cliId }),
          });
          if (!res.ok || !res.body) {
            const e = await res.json().catch(() => ({}));
            finish("error", e.error || "Failed to start");
            return;
          }
          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let buf = "";
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            let nl: number;
            while ((nl = buf.indexOf("\n")) !== -1) {
              const line = buf.slice(0, nl).trim();
              buf = buf.slice(nl + 1);
              if (!line) continue;
              try {
                const ev = JSON.parse(line);
                if (ev.type === "tool") {
                  steps.push({ kind: "tool", label: ev.name, ts: Date.now() });
                  patch(id, (j) => ({ ...j, steps: [...j.steps, { kind: "tool", label: ev.name, ts: Date.now() }] }));
                  fetch("/api/agent-runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "progress", id, progress: ev.name }) }).catch(() => {});
                } else if (ev.type === "status") {
                  steps.push({ kind: "status", label: ev.label, ts: Date.now() });
                  patch(id, (j) => ({ ...j, steps: [...j.steps, { kind: "status", label: ev.label, ts: Date.now() }] }));
                  fetch("/api/agent-runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "progress", id, progress: ev.label }) }).catch(() => {});
                } else if (ev.type === "text") {
                  const full = text + ev.text;
                  const vm = full.match(/VERDICT:[^\n]*/i);
                  if (vm) verdictLine = vm[0];
                  text = full.slice(-8000);
                  patch(id, (j) => ({ ...j, text }));
                } else if (ev.type === "done") {
                  // finish happens on stream-close; capture the per-run cost it carries
                  if (typeof ev.tokens === "number") doneTokens = ev.tokens;
                  if (typeof ev.costUsd === "number") doneCostUsd = ev.costUsd;
                  if (Array.isArray(ev.artifacts)) doneArtifacts = ev.artifacts;
                } else if (ev.type === "error") {
                  finish("error", ev.msg || "Error");
                  return;
                }
              } catch {
                /* skip */
              }
            }
          }
          finish("done", "Done");
        } catch {
          finish("error", "Connection error");
        }
      })();

      return id;
    },
    [patch, refreshJobs],
  );

  const removeJob = useCallback((id: string) => {
    setJobs((js) => js.filter((j) => j.id !== id));
    fetch("/api/agent-runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "archive", id }) }).catch(() => {});
  }, []);
  const clearFinished = useCallback(() => {
    const finished = jobs.filter((job) => job.status === "done" || job.status === "error");
    setJobs((js) => js.filter((j) => j.status === "running" || j.status === "waiting"));
    for (const job of finished) {
      fetch("/api/agent-runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "archive", id: job.id }) }).catch(() => {});
    }
  }, [jobs]);

  return <JobsContext.Provider value={{ jobs, startJob, removeJob, clearFinished, refreshJobs }}>{children}</JobsContext.Provider>;
}
