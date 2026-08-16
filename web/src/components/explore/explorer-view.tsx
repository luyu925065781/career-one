"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Check, Copy, ExternalLink, ImageUp, Search, ShieldCheck, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatJobSearchKeywords, selectTargetRoleTags, type ExploreFilters } from "@/lib/explore";
import { AgentTaskHandoffDialog } from "@/components/generate-pdf-button";
import {
  buildQueuedTaskInstruction,
  isInvalidJob,
  type AgentTaskHandoff,
  useJobs,
} from "@/components/jobs/job-store";

const PageIcon = Search;

const SOURCES = [
  { name: "BOSS直聘", href: "https://www.zhipin.com/" },
  { name: "猎聘", href: "https://www.liepin.com/" },
  { name: "智联招聘", href: "https://www.zhaopin.com/" },
  { name: "脉脉", href: "https://maimai.cn/" },
] as const;

const MAX_TARGET_ROLE_TAGS = 5;

export function ExplorerView({
  hasCv,
  filters,
  seededFrom,
}: {
  hasCv: boolean;
  filters: ExploreFilters;
  seededFrom: string[];
}) {
  return (
    <div className="page-shell py-8">
      <header className="mb-7">
        <div className="flex items-center gap-2.5">
          <PageIcon className="size-6 shrink-0 text-icon-brand" aria-hidden="true" />
          <h1 className="page-title">发现岗位</h1>
        </div>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted">
          你自己在招聘网站找到感兴趣的岗位，再把招聘截图或完整 JD 交给 Agent。择程AI不爬取招聘网站，岗位评估由你自己的 Agent 完成。
        </p>
      </header>

      {!hasCv && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-warning-border bg-warning-surface px-4 py-3 text-sm text-warning">
          <span>开始评估前，请先创建一份 cv.md，让 Agent 有真实经历可以匹配。</span>
          <Link href="/cv" className="font-semibold underline underline-offset-2">先去创建简历</Link>
        </div>
      )}

      <SearchKeywordsCard filters={filters} seededFrom={seededFrom} />

      <section aria-label="手动找岗步骤">
        <Card corner="tr" className="p-6 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-icon-brand">
              <Search className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-text">第一步，找岗位</p>
              <h2 className="mt-1 font-display text-2xl text-landing">在招聘网站找到岗位</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                根据你的目标和偏好，在熟悉的平台或公司官网浏览职位详情。
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2" aria-label="招聘网站入口">
            {SOURCES.map((source) => (
              <a
                key={source.name}
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "tertiary" })}
              >
                {source.name}
                <ExternalLink className="size-3.5 text-icon-muted" aria-hidden="true" />
              </a>
            ))}
          </div>
        </Card>
      </section>

      <Card corner="bl" elevated className="mt-4 p-6 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
            <Bot className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-text">第二步 · 交给 Agent</p>
            <h2 className="mt-1 font-display text-2xl text-landing">把岗位信息交给 Agent，开始评估</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              把招聘截图或完整 JD 交给你的 Agent。Web 会把截图保存到当前本地工作区，不启动 CLI、不抓取招聘网站，也不会上传到外部服务。
            </p>
          </div>
        </div>
        <ScreenshotEvaluate />
        <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-faint">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-icon-success" aria-hidden="true" />
          <span>评估报告会写入本地求职进度；是否投递始终由你决定。</span>
        </div>
      </Card>

      <ol className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="手动找岗流程">
        {[
          ["01", "找到岗位", "在平台或公司官网查看真实职位"],
          ["02", "查看评估", "把截图交给 Agent，根据报告决定下一步"],
        ].map(([number, title, description], index) => (
          <li key={number} className="relative rounded-card border border-border bg-surface/40 p-4">
            {index < 1 && <span className="absolute right-[-0.75rem] top-1/2 hidden h-px w-3 bg-border sm:block" aria-hidden="true" />}
            <span className={cn("text-xs font-semibold tabular-nums", index === 0 ? "text-brand-text" : "text-faint")}>{number}</span>
            <h3 className="mt-2 text-sm font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

const MAX_SCREENSHOTS = 3;
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;

type ScreenshotAsset = { id: string; name: string; type: string; dataUrl: string };

function readScreenshotAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("读取截图失败"));
    reader.readAsDataURL(file);
  });
}

export function ScreenshotEvaluate({ page = "/cn-diagnose" }: { page?: string }) {
  const { jobs, queueAgentTaskWithAttachments, attachToAgentTask } = useJobs();
  const [screenshots, setScreenshots] = useState<ScreenshotAsset[]>([]);
  const [error, setError] = useState("");
  const [handoff, setHandoff] = useState<AgentTaskHandoff | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const queuingRef = useRef(false);
  const screenshotKey = screenshots.map((screenshot) => screenshot.name).join(" | ");
  const taskOpts = useMemo(() => ({
    title: `评估 · 招聘截图${screenshots.length > 0 ? `（${screenshots.length} 张）` : ""}`,
    subtitle: "等待用户自己的 Agent 处理",
    kind: "evaluate",
    input: `screenshot:${screenshotKey}`,
    page,
    attachments: screenshots,
  }), [page, screenshotKey, screenshots]);
  const job = useMemo(
    () => jobs
      .filter((item) => item.kind === "evaluate" && item.input === taskOpts.input)
      .sort((a, b) => b.startedAt - a.startedAt)[0],
    [jobs, taskOpts.input],
  );

  const addScreenshotFiles = useCallback(async (selected: File[]) => {
    if (!selected.length) return;
    const remaining = MAX_SCREENSHOTS - screenshots.length;
    if (remaining <= 0) {
      setError(`最多上传 ${MAX_SCREENSHOTS} 张招聘截图`);
      return;
    }
    const invalidType = selected.find((file) => !["image/png", "image/jpeg", "image/webp"].includes(file.type));
    if (invalidType) {
      setError("仅支持 PNG、JPG 和 WebP 图片");
      return;
    }
    const oversized = selected.find((file) => file.size > MAX_SCREENSHOT_BYTES);
    if (oversized) {
      setError("单张截图不能超过 8 MB");
      return;
    }
    if (selected.length > remaining) {
      setError(`最多上传 ${MAX_SCREENSHOTS} 张，当前还可以添加 ${remaining} 张`);
      return;
    }
    const startedAt = Date.now();
    const next = await Promise.all(selected.map(async (file, index) => ({
      id: `${startedAt}-${index}-${file.name}`,
      name: file.name || `招聘截图-${screenshots.length + index + 1}`,
      type: file.type,
      dataUrl: await readScreenshotAsDataUrl(file),
    })));
    setScreenshots((current) => [...current, ...next].slice(0, MAX_SCREENSHOTS));
    setError("");
  }, [screenshots.length]);

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const imageFiles = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      if (!imageFiles.length) return;
      event.preventDefault();
      void addScreenshotFiles(imageFiles);
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addScreenshotFiles]);

  function showExistingHandoff() {
    if (!job) return;
    const attachmentPaths = job.artifacts
      ?.map((artifact) => artifact.path)
      .filter((artifactPath) => artifactPath.startsWith("data/task-attachments/"));
    setHandoff({
      id: job.id,
      instruction: buildQueuedTaskInstruction({ ...taskOpts, attachmentPaths }, job.id),
      attachmentPaths,
    });
    setHandoffOpen(true);
  }

  async function beginHandoff() {
    if (!screenshots.length || queuingRef.current) return;
    queuingRef.current = true;
    setIsSaving(true);
    setError("");
    try {
      const existingAttachmentPaths = job?.artifacts
        ?.map((artifact) => artifact.path)
        .filter((artifactPath) => artifactPath.startsWith("data/task-attachments/")) ?? [];
      if (job && existingAttachmentPaths.length > 0) {
        showExistingHandoff();
        return;
      }
      const next = job && (
        job.runStatus === "queued"
        || job.runStatus === "waiting_input"
        || job.runStatus === "waiting_approval"
        || job.status === "running"
        || isInvalidJob(job)
      )
        ? await attachToAgentTask(job.id, taskOpts)
        : await queueAgentTaskWithAttachments(taskOpts);
      setHandoff(next);
      setHandoffOpen(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存招聘截图失败");
    } finally {
      setIsSaving(false);
      queuingRef.current = false;
    }
  }

  return (
    <div className="mt-5 rounded-card border border-brand/20 bg-surface/55 p-4 sm:p-5" aria-label="招聘截图评估">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ImageUp className="size-4 text-icon-brand" aria-hidden="true" />
            招聘截图评估
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">上传或粘贴截图后，将保存到当前本地工作区并随任务交给 Agent；不会上传到外部服务。</p>
        </div>
        {screenshots.length > 0 && <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-text">已选 {screenshots.length} 张</span>}
      </div>

      <label className={cn(
        "mt-4 flex min-h-28 flex-col items-center justify-center rounded-card border border-dashed border-outline-border bg-background/45 p-4 text-center transition-colors",
        screenshots.length < MAX_SCREENSHOTS ? "cursor-pointer hover:border-outline-border-hover hover:bg-surface-hover" : "cursor-not-allowed opacity-60",
      )}>
        <UploadCloud className="size-5 text-icon-brand" aria-hidden="true" />
        <span className="mt-2 text-sm font-medium text-foreground">{screenshots.length < MAX_SCREENSHOTS ? "上传或粘贴招聘截图" : "已选择 3 张截图"}</span>
        <span className="mt-1 text-xs text-faint">⌘V / Ctrl+V · PNG / JPG / WebP · 最多 3 张 · 单张不超过 8 MB</span>
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          disabled={screenshots.length >= MAX_SCREENSHOTS}
          className="hidden"
          onChange={(event) => {
            void addScreenshotFiles(Array.from(event.target.files ?? []));
            event.currentTarget.value = "";
          }}
        />
      </label>

      {screenshots.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2" aria-label={`已选择 ${screenshots.length} 张招聘截图`}>
          {screenshots.map((screenshot, index) => (
            <div key={screenshot.id} className="group relative overflow-hidden rounded-lg border border-border bg-background">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={screenshot.dataUrl} alt={`招聘截图 ${index + 1}：${screenshot.name}`} className="aspect-[4/3] w-full object-contain" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-background/90 px-1.5 py-1 text-[10px] text-muted backdrop-blur-sm">
                <span className="min-w-0 truncate">{index + 1}. {screenshot.name}</span>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setScreenshots((current) => current.filter((item) => item.id !== screenshot.id))} className="shrink-0 text-icon-muted" aria-label={`移除招聘截图 ${index + 1}`}>
                  <X className="size-3" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          ref={triggerRef}
          type="button"
          disabled={!screenshots.length || isSaving}
          onClick={() => void beginHandoff()}
          aria-haspopup="dialog"
          aria-expanded={handoffOpen}
        >
          <Bot className="size-4" aria-hidden="true" />
          {isSaving ? "正在保存到本地…" : job?.artifacts?.some((artifact) => artifact.path.startsWith("data/task-attachments/")) ? "查看 Agent 指令" : "保存并交给 Agent 评估"}
        </Button>
        <span className="text-xs leading-5 text-faint">本地保存位置：data/task-attachments/&lt;任务ID&gt;/；评估报告会保留截图和路径。</span>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <AgentTaskHandoffDialog
        handoff={handoff}
        open={handoffOpen}
        onClose={() => setHandoffOpen(false)}
        returnFocusRef={triggerRef}
      />
    </div>
  );
}

export function SearchKeywordsCard({ filters, seededFrom }: { filters: ExploreFilters; seededFrom: string[] }) {
  const targetRoleValues = selectTargetRoleTags(filters.positive, MAX_TARGET_ROLE_TAGS);
  const locationValues = Array.from(new Set([...filters.alwaysAllow, ...filters.allow]));
  return (
    <Card className="mt-6 p-6 sm:p-7" aria-labelledby="search-keywords-title">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-text">岗位筛选标签</p>
        <h2 id="search-keywords-title" className="mt-1 font-display text-2xl text-landing">复制已确认的搜索标签</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          {seededFrom.length > 0
            ? `已根据 ${seededFrom.join(" + ")} 整理。可直接复制到招聘网站或公司职位搜索框。`
            : "暂时没有已确认的搜索标签；完善画像后，Agent 可以继续补充。"}
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <SearchTagGroup label="目标岗位" values={targetRoleValues} />
        <SearchTagGroup label="排除关键词" values={filters.negative} tone="negative" />
      </div>

      <div className="mt-5">
        <SearchTagGroup label="优先地点" values={locationValues} />
      </div>

    </Card>
  );
}

export function CopyTagValuesButton({ label, values }: { label: string; values: string[] }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (values.length === 0) return;
    try {
      await navigator.clipboard.writeText(formatJobSearchKeywords(values));
      setCopied(true);
    } catch {
      setCopied(false);
    }
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Button
      type="button"
      variant="tertiary"
      size="sm"
      onClick={() => void copy()}
      disabled={values.length === 0}
      className="shrink-0"
      aria-label={`复制${label}`}
      title={`复制${label}，可粘贴到招聘平台搜索`}
    >
      {copied ? <Check className="size-3.5 text-icon-success" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      {copied ? "已复制" : "复制"}
    </Button>
  );
}

function SearchTagGroup({
  label,
  values,
  tone = "positive",
}: {
  label: string;
  values: string[];
  tone?: "positive" | "negative";
}) {
  return (
    <section aria-label={label}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <CopyTagValuesButton label={label} values={values} />
      </div>
      <div className="mt-2 flex min-h-10 flex-wrap content-center gap-2 rounded-card border border-border bg-surface/40 p-2.5">
        {values.length > 0 ? values.map((value) => (
          <span
            key={value}
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
              tone === "positive"
                ? "border-brand/35 bg-brand-soft text-brand-text"
                : "border-border bg-surface-hover text-muted",
            )}
          >
            {value}
          </span>
        )) : <span className="px-1 text-xs text-faint">暂无已确认标签</span>}
      </div>
    </section>
  );
}
