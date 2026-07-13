"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  ImageUp,
  Loader2,
  MessageSquareText,
  Radar,
  Save,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { instrumentSerif } from "@/lib/fonts";

type DiagnoseResult = {
  company: string;
  role: string;
  location: string;
  salary: string;
  score: number;
  verdict: string;
  scoreNote: string;
  positiveSignals: string[];
  risks: string[];
  questions: string[];
  openingMessage: string;
  positioning: string[];
  meters: { label: string; value: number; tone?: "risk" | "good" }[];
  decisionRules: { label: string; body: string }[];
  nextActions: string[];
  confidence: "low" | "medium" | "high";
};

type ApiResponse = {
  ok?: boolean;
  result?: DiagnoseResult;
  files?: { htmlRel?: string; htmlAbs?: string; htmlUrl?: string; screenshotRels?: string[] };
  warnings?: string[];
  error?: string;
};

type Engine = "quick" | "codex";
type InputMode = "jd" | "screenshots";
type ScreenshotInput = { id: string; name: string; dataUrl: string };

const MAX_SCREENSHOTS = 3;
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;

function scoreTone(score: number): string {
  if (score >= 4.2) return "text-emerald-500";
  if (score >= 3.8) return "text-brand";
  if (score >= 3.2) return "text-amber-500";
  return "text-red-500";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function BulletList({ items, tone }: { items: string[]; tone: "good" | "risk" | "question" }) {
  const Icon = tone === "good" ? CheckCircle2 : tone === "risk" ? AlertTriangle : MessageSquareText;
  const color = tone === "good" ? "text-icon-success" : tone === "risk" ? "text-icon-danger" : "text-icon-info";
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div key={item} className="flex gap-3 rounded-lg border border-border bg-surface/60 p-3 text-sm leading-6 text-muted">
          <Icon className={cn("mt-1 size-4 shrink-0", color)} />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function ResultPanel({ response }: { response: ApiResponse | null }) {
  const result = response?.result;
  if (!result) {
    return (
      <Card elevated className="flex min-h-[520px] flex-col justify-between border-dashed bg-surface/30">
        <div>
          <div className="mb-5 inline-flex size-12 items-center justify-center rounded-xl border border-border bg-surface">
            <Radar className="size-5 text-icon-brand" />
          </div>
          <h2 className={`${instrumentSerif.className} text-4xl text-landing`}>等待诊断输入</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
            生成后这里会出现评分、正向信号、剩余风险、追问问题、BOSS 打招呼话术和本地 HTML 报告链接。
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface/70 p-4 text-xs leading-6 text-faint">
          第一版会保存报告到 <code className="font-mono text-brand-text">markets/china-mainland/output/</code>。规则分析即时可用；Codex 深度分析会在检测到本机 CLI 时尝试运行。
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card elevated corner="br" className="bg-surface/70">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap gap-2 text-xs font-semibold text-faint">
              <span>{result.company}</span>
              <span>·</span>
              <span>{result.location}</span>
              <span>·</span>
              <span>{result.salary}</span>
              <span>·</span>
              <span>confidence {result.confidence}</span>
            </div>
            <h2 className={`${instrumentSerif.className} max-w-2xl text-4xl leading-tight text-landing`}>{result.role}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{result.scoreNote}</p>
          </div>
          <div className="shrink-0 rounded-2xl border border-border bg-background p-5 text-center">
            <div className={cn("text-6xl font-semibold tabular-nums", scoreTone(result.score))}>{result.score.toFixed(1)}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-faint">/ 5</div>
            <div className="mt-3 text-sm font-semibold text-foreground">{result.verdict}</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-surface/55">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold"><BrainCircuit className="size-4 text-icon-brand" /> 匹配雷达</h3>
          <div className="grid gap-4">
            {result.meters.map((m) => (
              <div key={m.label}>
                <div className="mb-2 flex justify-between text-xs font-semibold text-muted">
                  <span>{m.label}</span>
                  <span>{m.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
                  <div
                    className={cn("h-full rounded-full", m.tone === "risk" ? "bg-red-500" : "bg-gradient-to-r from-brand to-emerald-500")}
                    style={{ width: `${m.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-surface/55">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold"><Save className="size-4 text-icon-brand" /> 报告文件</h3>
          <div className="space-y-3 text-sm leading-7 text-muted">
            <p>HTML 报告已写入本地输出目录。</p>
            {response.files?.htmlUrl && (
              <a className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-hover" href={response.files.htmlUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                打开报告页面
              </a>
            )}
            {response.files?.htmlRel && <p className="break-all font-mono text-xs text-faint">{response.files.htmlRel}</p>}
            {response.warnings?.length ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                {response.warnings.map((w) => <div key={w}>{w}</div>)}
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="bg-surface/55"><h3 className="mb-4 text-base font-semibold">正向信号</h3><BulletList items={result.positiveSignals} tone="good" /></Card>
        <Card className="bg-surface/55"><h3 className="mb-4 text-base font-semibold">剩余风险</h3><BulletList items={result.risks} tone="risk" /></Card>
      </div>

      <Card className="bg-surface/55"><h3 className="mb-4 text-base font-semibold">必须追问</h3><BulletList items={result.questions} tone="question" /></Card>

      <Card className="bg-surface/55">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">BOSS 首轮沟通话术</h3>
          <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(result.openingMessage)}>
            <Copy className="size-3.5" />
            复制
          </Button>
        </div>
        <pre className="whitespace-pre-wrap rounded-xl border border-border bg-pre-bg p-4 text-sm leading-7 text-foreground">{result.openingMessage}</pre>
      </Card>
    </div>
  );
}

export function CnDiagnoseView() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jdText, setJdText] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("jd");
  const [screenshots, setScreenshots] = useState<ScreenshotInput[]>([]);
  const [loading, setLoading] = useState<Engine | null>(null);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState("");
  const jdTabRef = useRef<HTMLButtonElement>(null);
  const screenshotsTabRef = useRef<HTMLButtonElement>(null);

  const canRun = useMemo(
    () => inputMode === "jd" ? Boolean(jdText.trim()) : screenshots.length > 0,
    [inputMode, jdText, screenshots.length],
  );

  function selectInputMode(nextMode: InputMode, moveFocus = false) {
    setInputMode(nextMode);
    setError("");
    if (moveFocus) {
      requestAnimationFrame(() => {
        (nextMode === "jd" ? jdTabRef : screenshotsTabRef).current?.focus();
      });
    }
  }

  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, currentMode: InputMode) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextMode = event.key === "Home"
      ? "jd"
      : event.key === "End"
        ? "screenshots"
        : currentMode === "jd" ? "screenshots" : "jd";
    selectInputMode(nextMode, true);
  }

  async function onFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const remaining = MAX_SCREENSHOTS - screenshots.length;
    if (remaining <= 0) {
      setError(`最多上传 ${MAX_SCREENSHOTS} 张岗位截图`);
      return;
    }

    const selected = Array.from(fileList);
    const invalidType = selected.find((file) => !["image/png", "image/jpeg", "image/webp"].includes(file.type));
    if (invalidType) {
      setError("仅支持 PNG、JPG 和 WebP 图片");
      return;
    }
    const oversized = selected.find((file) => file.size > MAX_SCREENSHOT_BYTES);
    if (oversized) {
      setError(`单张截图不能超过 ${MAX_SCREENSHOT_BYTES / 1024 / 1024} MB`);
      return;
    }
    if (selected.length > remaining) {
      setError(`最多上传 ${MAX_SCREENSHOTS} 张，当前还可以添加 ${remaining} 张`);
      return;
    }

    const startedAt = Date.now();
    const next = await Promise.all(selected.map(async (file, index) => ({
      id: `${startedAt}-${index}-${file.name}`,
      name: file.name,
      dataUrl: await readFileAsDataUrl(file),
    })));
    setScreenshots((current) => [...current, ...next].slice(0, MAX_SCREENSHOTS));
    setError("");
  }

  function removeScreenshot(id: string) {
    setScreenshots((current) => current.filter((screenshot) => screenshot.id !== id));
    setError("");
  }

  async function run(engine: Engine) {
    if (!canRun) return;
    if (inputMode === "screenshots" && engine === "quick") {
      setError("岗位截图需要 Agent 视觉分析，请使用 Codex 深度");
      return;
    }
    setLoading(engine);
    setError("");
    try {
      const res = await fetch("/api/cn-diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engine,
          inputMode,
          company,
          role,
          jdText: inputMode === "jd" ? jdText : undefined,
          screenshotNames: inputMode === "screenshots" ? screenshots.map((screenshot) => screenshot.name) : undefined,
          screenshotDataUrls: inputMode === "screenshots" ? screenshots.map((screenshot) => screenshot.dataUrl) : undefined,
        }),
      });
      const json = (await res.json()) as ApiResponse;
      if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
      setResponse(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "诊断失败");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_70%_20%,rgba(221,118,39,.18),transparent_35%),radial-gradient(circle_at_40%_80%,rgba(16,185,129,.14),transparent_32%)] lg:block" />
          <div className="relative max-w-4xl">
            <h1 className={`${instrumentSerif.className} text-5xl leading-none text-landing sm:text-6xl`}>岗位诊断</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
              填写岗位描述 JD，或上传岗位截图，生成岗位诊断、沟通话术和本地 HTML 报告。适合先筛机会，再决定是否写入求职进度。
            </p>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
          <section className="grid gap-4">
            <Card elevated className="bg-surface/70">
              <div role="tablist" aria-label="岗位输入方式" className="grid grid-cols-2 rounded-xl border border-border bg-background p-1">
                <button
                  ref={jdTabRef}
                  type="button"
                  role="tab"
                  id="job-input-tab-jd"
                  aria-selected={inputMode === "jd"}
                  aria-controls="job-input-panel-jd"
                  tabIndex={inputMode === "jd" ? 0 : -1}
                  onClick={() => selectInputMode("jd")}
                  onKeyDown={(event) => onTabKeyDown(event, "jd")}
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
                    inputMode === "jd" ? "bg-brand-soft text-brand-text" : "text-muted hover:bg-surface-hover hover:text-foreground",
                  )}
                >
                  <FileText className={cn("size-4", inputMode === "jd" ? "text-icon-brand" : "text-icon-muted")} />
                  岗位描述 JD
                </button>
                <button
                  ref={screenshotsTabRef}
                  type="button"
                  role="tab"
                  id="job-input-tab-screenshots"
                  aria-selected={inputMode === "screenshots"}
                  aria-controls="job-input-panel-screenshots"
                  tabIndex={inputMode === "screenshots" ? 0 : -1}
                  onClick={() => selectInputMode("screenshots")}
                  onKeyDown={(event) => onTabKeyDown(event, "screenshots")}
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
                    inputMode === "screenshots" ? "bg-brand-soft text-brand-text" : "text-muted hover:bg-surface-hover hover:text-foreground",
                  )}
                >
                  <ImageUp className={cn("size-4", inputMode === "screenshots" ? "text-icon-brand" : "text-icon-muted")} />
                  岗位截图
                  {screenshots.length > 0 && <span className="rounded-full bg-surface px-1.5 py-0.5 text-[11px] tabular-nums text-muted">{screenshots.length}</span>}
                </button>
              </div>

              <div className="mt-5">
                {inputMode === "jd" ? (
                  <div role="tabpanel" id="job-input-panel-jd" aria-labelledby="job-input-tab-jd">
                    <label className="grid gap-1.5 text-sm font-medium text-foreground">
                      岗位描述 JD
                      <textarea
                        value={jdText}
                        onChange={(e) => setJdText(e.target.value)}
                        className="min-h-[300px] w-full resize-y rounded-xl border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-brand"
                        placeholder="粘贴完整的岗位描述，建议包含岗位职责、任职要求、薪资和工作地点…"
                      />
                    </label>
                  </div>
                ) : (
                  <div role="tabpanel" id="job-input-panel-screenshots" aria-labelledby="job-input-tab-screenshots" className="grid gap-4">
                    <label className={cn(
                      "flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background p-5 text-center transition-colors",
                      screenshots.length < MAX_SCREENSHOTS ? "cursor-pointer hover:bg-surface-hover" : "cursor-not-allowed opacity-60",
                    )}>
                      <UploadCloud className="mb-2 size-6 text-icon-brand" />
                      <span className="text-sm font-medium text-foreground">
                        {screenshots.length < MAX_SCREENSHOTS ? "上传岗位截图" : "已上传 3 张截图"}
                      </span>
                      <span className="mt-1 text-xs text-faint">PNG / JPG / WebP · 最多 3 张 · 单张不超过 8 MB</span>
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp"
                        disabled={screenshots.length >= MAX_SCREENSHOTS}
                        className="hidden"
                        onChange={(event) => {
                          void onFiles(event.target.files);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>

                    {screenshots.length > 0 && (
                      <div className="grid grid-cols-3 gap-2" aria-label={`已上传 ${screenshots.length} 张岗位截图`}>
                        {screenshots.map((screenshot, index) => (
                          <div key={screenshot.id} className="group relative overflow-hidden rounded-xl border border-border bg-background">
                            <img src={screenshot.dataUrl} alt={`岗位截图 ${index + 1}：${screenshot.name}`} className="aspect-[4/3] w-full object-contain" />
                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-background/90 px-2 py-1.5 text-[11px] text-muted backdrop-blur-sm">
                              <span className="min-w-0 truncate">{index + 1}. {screenshot.name}</span>
                              <button
                                type="button"
                                onClick={() => removeScreenshot(screenshot.id)}
                                className="grid size-6 shrink-0 place-items-center rounded-md text-icon-muted hover:bg-surface-hover hover:text-icon-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                                aria-label={`移除岗位截图 ${index + 1}`}
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs leading-5 text-faint">Agent 会按顺序读取并合并这些截图中的同一份岗位信息；请勿混入不同岗位。</p>
                  </div>
                )}

                <div className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium text-foreground">
                    公司（选填）
                    <input value={company} onChange={(e) => setCompany(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand" placeholder="例如：公司名称" />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-foreground">
                    岗位（选填）
                    <input value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand" placeholder="例如：AI 产品经理" />
                  </label>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button disabled={!canRun || !!loading || inputMode === "screenshots"} onClick={() => run("quick")} className="min-h-12">
                {loading === "quick" ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />}
                规则诊断
              </Button>
              <Button disabled={!canRun || !!loading} variant="secondary" onClick={() => run("codex")} className="min-h-12">
                {loading === "codex" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Codex 深度
              </Button>
            </div>
            {inputMode === "screenshots" && !error && <p className="text-center text-xs leading-5 text-faint">截图需要 Agent 视觉分析，因此仅支持 Codex 深度。</p>}
            {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">{error}</div>}
          </section>

          <section>
            <ResultPanel response={response} />
          </section>
        </div>
      </div>
    </div>
  );
}
