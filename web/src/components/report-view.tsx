import { FileText, ExternalLink, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Application } from "@/lib/career-one";
import { Badge } from "@/components/ui/badge";
import {
  scoreTone,
  scoreNum,
  legitimacyTone,
  legitimacyLabel,
  parseReport,
  reportSectionPreview,
} from "@/lib/format";
import { StatusSelect } from "@/components/status-select";
import { CompanyLogo } from "@/components/company-logo";
import { ScoreMethodology } from "@/components/score-methodology";
import { GeneratePdfButton } from "@/components/generate-pdf-button";
import { ApplyButton } from "@/components/apply-button";
import { DeleteFromTracker } from "@/components/delete-from-tracker";
import { ReportBackButton } from "@/components/pipeline-view";

// Progressive disclosure of the report. The core writes prose blocks
// "## F) Verdict (lead)", "## A) Role Summary", "## B) Match with CV", then
// C–G + machine artifacts (Machine Summary YAML, Application Answers, submit
// log). A mainstream user deciding "should I apply?" needs the verdict + fit;
// the rest is depth-on-demand. We lead with the verdict as a callout, render A–G
// as consistent drawers, hide the internal Machine Summary on Web, and strip the
// bare "F)" author-letters from headings (native <details>, no client JS — this
// stays a server component).

type Section = { heading: string; letter: string | null; content: string };

const HEADING_LABELS: Record<string, string> = {
  "岗位概览": "岗位预览",
  "role summary": "岗位预览",
  "面试开场话术": "打招呼话术",
  "建议向猎头追问": "向招聘方追问",
  "建议向招聘者追问": "向招聘方追问",
  "建议向招聘方追问": "向招聘方追问",
  "必须追问": "向招聘方追问",
  "沟通后的分流规则": "沟通后分流规则",
  "能力缺口与补强": "能力与缺口补强",
  "能力差距与弥补策略": "能力与缺口补强",
  "application answers": "申请回答",
  submitted: "已提交内容",
  "submit log": "提交记录",
};

function cleanHeading(h: string): string {
  const stripped = h
    .replace(/^\s*(?:Block\s+)?[A-G][).:）】]\s*/i, "")
    .replace(/\s*\((?:lead|verdict)\)\s*$/i, "")
    .trim();
  if (!stripped) return h.trim();
  return HEADING_LABELS[stripped.toLowerCase()] ?? stripped;
}

// The Machine Summary is an internal interchange block. Keep it in the source
// report for local Agent workflows, but do not expose it in the job-seeker UI.
function isWebHiddenSection(heading: string): boolean {
  return /machine summary/i.test(heading);
}

// Submission artifacts remain available as collapsed supporting records.
function isMachine(heading: string): boolean {
  return /submitted|submit[-\s]?log/i.test(heading);
}

function splitSections(body: string): { intro: string; sections: Section[] } {
  const intro: string[] = [];
  const sections: Section[] = [];
  let cur: { heading: string; letter: string | null; lines: string[] } | null = null;
  for (const line of body.split("\n")) {
    const h = line.match(/^##\s+(.*)$/);
    if (h) {
      if (cur) sections.push({ heading: cur.heading, letter: cur.letter, content: cur.lines.join("\n").trim() });
      const heading = h[1].trim();
      const letter = heading.match(/^(?:Block\s+)?([A-G])[).:）】\s]/i)?.[1]?.toUpperCase() ?? null;
      cur = { heading, letter, lines: [] };
    } else if (cur) {
      cur.lines.push(line);
    } else {
      intro.push(line);
    }
  }
  if (cur) sections.push({ heading: cur.heading, letter: cur.letter, content: cur.lines.join("\n").trim() });
  return { intro: intro.join("\n").trim(), sections };
}

function normalizeNestedHeadings(content: string): string {
  return content
    .replace(/^###\s+(?:能力缺口与补强|能力差距(?:\s*\([^)]*\))?\s*(?:与弥补策略)?|能力与缺口补强)\s*$/gm, "### 能力与缺口补强")
    .replace(/^###\s+沟通后的分流规则\s*$/gm, "### 沟通后分流规则")
    .replace(/^###\s+(?:必须追问|建议向猎头追问|建议向招聘者追问|建议向招聘方追问)\s*$/gm, "### 向招聘方追问");
}

function insertSubsectionBefore(content: string, title: string, subsectionContent: string): string {
  const normalized = normalizeNestedHeadings(content);
  if (!subsectionContent.trim() || new RegExp(`^###\\s+${title}\\s*$`, "m").test(normalized)) return normalized;

  const subsection = `### ${title}\n\n${subsectionContent.trim()}`;
  const gapHeading = normalized.match(/^###\s+能力与缺口补强\s*$/m);
  if (gapHeading?.index !== undefined) {
    return `${normalized.slice(0, gapHeading.index).trimEnd()}\n\n${subsection}\n\n${normalized.slice(gapHeading.index)}`.trim();
  }
  return `${normalized.trim()}\n\n${subsection}`.trim();
}

function moveSectionAfter(
  sections: Section[],
  movingPredicate: (section: Section) => boolean,
  anchorPredicate: (section: Section) => boolean,
): void {
  const movingIndex = sections.findIndex(movingPredicate);
  if (movingIndex < 0) return;

  const [movingSection] = sections.splice(movingIndex, 1);
  const anchorIndex = sections.findIndex(anchorPredicate);
  sections.splice(anchorIndex >= 0 ? anchorIndex + 1 : sections.length, 0, movingSection);
}

function arrangeReportSections(sections: Section[]): Section[] {
  const working = sections.map((section) => ({ ...section, content: normalizeNestedHeadings(section.content) }));
  const bExists = working.some((section) => section.letter === "B" || /简历.*匹配/.test(cleanHeading(section.heading)));
  const gExists = working.some((section) => section.letter === "G" || /职位真实性/.test(cleanHeading(section.heading)));
  const consumed = new Set<number>();

  const take = (pattern: RegExp, enabled = true): Section | null => {
    if (!enabled) return null;
    const index = working.findIndex((section, sectionIndex) => !consumed.has(sectionIndex) && pattern.test(cleanHeading(section.heading)));
    if (index < 0) return null;
    consumed.add(index);
    return working[index];
  };

  const radar = take(/^匹配雷达$/, bExists);
  const positiveSignals = take(/^正向信号$/, bExists);
  const standaloneGap = take(/^(?:能力与缺口补强|能力缺口与补强|能力差距.*)$/, bExists);
  const risks = take(/^剩余风险$/, gExists);
  const greeting = take(/^打招呼话术$/);
  const questions = take(/^向招聘方追问$/);
  const positioning = take(/^你在这个岗位里的最佳表达$/);
  const decisionRules = take(/^沟通后分流规则$/);

  const arranged = working.filter((_, index) => !consumed.has(index));
  const bIndex = arranged.findIndex((section) => section.letter === "B" || /简历.*匹配/.test(cleanHeading(section.heading)));
  if (bIndex >= 0) {
    let content = normalizeNestedHeadings(arranged[bIndex].content);
    if (radar) content = insertSubsectionBefore(content, "匹配雷达", radar.content);
    const positiveSignalsContent = positiveSignals?.content ?? "";
    if (positiveSignals) content = insertSubsectionBefore(content, "正向信号", positiveSignalsContent);
    if (standaloneGap) {
      if (/^###\s+能力与缺口补强\s*$/m.test(content)) {
        content = `${content.trim()}\n\n${standaloneGap.content.trim()}`;
      } else {
        content = `${content.trim()}\n\n### 能力与缺口补强\n\n${standaloneGap.content.trim()}`;
      }
    }
    arranged[bIndex] = { ...arranged[bIndex], content };
  }

  let gIndex = arranged.findIndex((section) => section.letter === "G" || /职位真实性/.test(cleanHeading(section.heading)));
  if (gIndex >= 0 && risks && !/^###\s+剩余风险\s*$/m.test(arranged[gIndex].content)) {
    arranged[gIndex] = {
      ...arranged[gIndex],
      content: `${arranged[gIndex].content.trim()}\n\n### 剩余风险\n\n${risks.content.trim()}`,
    };
  }

  moveSectionAfter(
    arranged,
    (section) => section.letter === "G" || /职位真实性|posting legitimacy/i.test(cleanHeading(section.heading)),
    (section) => section.letter === "D" || /薪酬竞争力与市场需求|comp and demand/i.test(cleanHeading(section.heading)),
  );
  gIndex = arranged.findIndex((section) => section.letter === "G" || /职位真实性|posting legitimacy/i.test(cleanHeading(section.heading)));

  const deferredSections: Section[] = [];
  for (const letter of ["E", "F"]) {
    const deferredIndex = arranged.findIndex((section) => section.letter === letter);
    if (deferredIndex >= 0) deferredSections.push(...arranged.splice(deferredIndex, 1));
  }

  const followups = [greeting, questions, positioning, decisionRules]
    .filter((section): section is Section => section !== null)
    .map((section) => ({ ...section, heading: cleanHeading(section.heading) }));
  if (followups.length > 0) arranged.splice(gIndex >= 0 ? gIndex + 1 : arranged.length, 0, ...followups);

  const decisionIndex = arranged.findIndex((section) => /^沟通后分流规则$/.test(cleanHeading(section.heading)));
  const deferredInsertIndex = decisionIndex >= 0
    ? decisionIndex + 1
    : gIndex >= 0
      ? gIndex + 1 + followups.length
      : arranged.length;
  arranged.splice(deferredInsertIndex, 0, ...deferredSections);

  return arranged;
}

export function ReportView({
  id,
  app,
  report,
  canDelete = false,
}: {
  id: string;
  app: Application | null;
  report: string | null;
  /** kept in the props contract (the page passes it) but no longer surfaced —
   *  the raw .md filename is a dev artifact, not header content. */
  file?: string | null;
  canDelete?: boolean;
}) {
  const meta = report ? parseReport(report) : null;
  const field = (label: string) => meta?.fields.find((f) => f.label === label)?.value;
  const score = app?.score || field("Score");
  const date = app?.date || field("Date");
  const archetype = field("Archetype");
  const url = field("URL");

  return (
    <div className="page-shell py-8">
      <ReportBackButton />

      <header className="mt-5">
        <div className="flex min-h-8 items-center gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-faint">#{id}</p>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <CompanyLogo name={app?.company ?? meta?.title ?? `报告 #${id}`} size={40} />
          <h1 className="font-display text-3xl tracking-tight text-landing">
            {app?.company ?? meta?.title ?? `报告 #${id}`}
          </h1>
        </div>
        {app?.role && <p className="mt-1 text-muted">{app.role}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {score && <Badge tone={scoreTone(score)}>{score}</Badge>}
          {/* Verdict-first: the score's apply/don't-apply call (4.0 is the line,
              per the public methodology) as a <2s-scannable chip. */}
          {(() => {
            const n = scoreNum(score ?? "");
            if (Number.isNaN(n)) return null;
            return n >= 4.0 ? <Badge tone="good">建议投递</Badge> : <Badge tone="muted">低于投递线</Badge>;
          })()}
          {meta?.legitimacy && <Badge tone={legitimacyTone(meta.legitimacy)}>{legitimacyLabel(meta.legitimacy)}</Badge>}
          {app && <StatusSelect n={id} current={app.status} />}
          <GeneratePdfButton n={id} company={app?.company ?? meta?.title ?? id} pdfReady={(app?.pdf ?? "").includes("✅")} />
          <ApplyButton n={id} url={url && url.startsWith("http") ? url : undefined} company={app?.company ?? meta?.title ?? id} pdfReady={(app?.pdf ?? "").includes("✅")} />
        </div>

        {app && canDelete && (
          <div className="mt-3">
            <DeleteFromTracker n={id} />
          </div>
        )}

        {(archetype || date || (url && url.startsWith("http"))) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            {archetype && <span className="max-w-full truncate">{archetype}</span>}
            {date && <span className="tabular-nums text-faint">{date}</span>}
            {url && url.startsWith("http") && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1 text-brand hover:underline max-sm:min-h-[44px]"
              >
                查看岗位 <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        )}
      </header>

      {report ? (
        <>
          {(() => {
            const { intro, sections } = splitSections(meta?.body ?? report);
            // Tolerant fallback: unrecognized layout → render the whole body as
            // before, so an old/odd report never loses content.
            if (sections.length === 0) {
              return (
                <article className="report-prose mt-8">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{meta?.body ?? report}</ReactMarkdown>
                </article>
              );
            }
            // Verdict leads as a highlighted callout with no competing heading —
            // it's THE answer. A–G use consistent drawers with a 1-line preview;
            // internal machine summaries are hidden on Web; submission records
            // remain available as secondary drawers.
            const verdict = sections.find((s) => /verdict|结论|最终建议/i.test(s.heading));
            const rest = sections.filter((s) => s !== verdict);
            const visibleRest = rest.filter((s) => !isWebHiddenSection(s.heading));
            const machine = visibleRest.filter((s) => isMachine(s.heading));
            const mainSections = arrangeReportSections(visibleRest.filter((s) => !isMachine(s.heading)));
            const anyAB = mainSections.some((s) => s.letter === "A" || s.letter === "B");
            return (
              <div className="mt-8">
                {intro && (
                  <article className="report-prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{intro}</ReactMarkdown>
                  </article>
                )}

                {verdict && (
                  <div className="rounded-2xl border border-border bg-surface/30 px-5 py-4">
                    <p className="mb-2 text-lg font-bold text-foreground">结论</p>
                    <article className="report-prose [&_p]:font-medium [&_p]:text-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{verdict.content}</ReactMarkdown>
                    </article>
                  </div>
                )}

                {mainSections.map((s, i) => {
                  const expanded = !anyAB && i === 0;
                  if (expanded) {
                    return (
                      <article key={i} className="report-prose mt-6">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{`## ${i + 1}. ${cleanHeading(s.heading)}\n\n${s.content}`}</ReactMarkdown>
                      </article>
                    );
                  }
                  const teaser = reportSectionPreview(s.content);
                  return (
                    <details key={i} className="group mt-3 overflow-hidden rounded-xl border border-border bg-surface/30">
                      <summary className="flex min-h-[44px] min-w-0 cursor-pointer list-none items-center gap-2 px-4 py-3 transition-colors hover:bg-surface-hover">
                        <span className="shrink-0 whitespace-nowrap text-sm font-medium">
                          <span className="tabular-nums">{i + 1}、</span>
                          {cleanHeading(s.heading)}
                        </span>
                        {teaser && (
                          <span className="hidden min-w-0 flex-1 truncate text-xs text-faint sm:block">{teaser}</span>
                        )}
                        <ChevronDown className="ml-auto size-4 shrink-0 text-icon-muted transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="report-prose border-t border-border px-4 py-3">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.content}</ReactMarkdown>
                      </div>
                    </details>
                  );
                })}

                {machine.length > 0 && (
                  <div className="mt-6">
                    {machine.map((s, i) => (
                      <details key={i} className="group mt-2 overflow-hidden rounded-xl border border-border/60 bg-surface/20">
                        <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 px-4 py-3 font-mono text-xs text-muted transition-colors hover:bg-surface-hover">
                          {cleanHeading(s.heading)}
                          <ChevronDown className="ml-auto size-4 shrink-0 text-icon-muted transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="report-prose border-t border-border/60 px-4 py-3 opacity-80">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.content}</ReactMarkdown>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          <div className="mt-10 flex items-center gap-3 text-[11px] tracking-[0.14em] text-faint">
            <span className="h-px flex-1 bg-border" />
            评估规则-面向求职者
            <span className="h-px flex-1 bg-border" />
          </div>
          <ScoreMethodology />
        </>
      ) : (
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/30 p-5 text-sm text-muted">
          <FileText className="size-5 shrink-0 text-icon-muted" />
          在 <code className="text-foreground">reports/</code> 中未找到 #{id} 的报告文件。
        </div>
      )}
    </div>
  );
}
