"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X, Settings } from "lucide-react";

type Doctor = { available: boolean; onboardingNeeded: boolean; missing: string[]; warnings: string[] };

function hasCli(): boolean {
  try {
    return !!JSON.parse(localStorage.getItem("career-one:config") || "{}").cliId;
  } catch {
    return false;
  }
}

const LABELS: Record<string, string> = {
  "cv.md": "你的简历",
  "config/profile.yml": "目标岗位、薪资和地点偏好",
  "modes/_profile.md": "个性化求职策略",
  "portals.yml": "岗位来源与搜索规则",
};

// Detect (via the core's doctor.mjs) whether setup is incomplete, and offer to
// finish it CONVERSATIONALLY — the assistant asks in plain language and writes
// the canonical files (no YAML to edit). This is the #1 adoption barrier.
export function OnboardingBanner() {
  const [d, setD] = useState<Doctor | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [cli, setCli] = useState(true); // assume until read (avoid CTA flash)

  useEffect(() => {
    setCli(hasCli());
    fetch("/api/doctor")
      .then((r) => r.json())
      .then(setD)
      .catch(() => {});
  }, []);

  if (dismissed || !d || !d.onboardingNeeded) return null;
  const items = d.missing.map((m) => LABELS[m] ?? m);
  const kickoff =
    `请帮我完成择程AI（career-one）初始化。目前还缺少：${items.join("、")}。请只针对这些内容用中文逐步提问，并在我确认后写入本地文件。已经存在的内容不要重复询问，也不要虚构任何经历。`;

  return (
    <div className="dot-bg relative mb-6 overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 via-surface/40 to-transparent p-5">
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 text-faint transition-colors hover:text-foreground"
        aria-label="关闭"
      >
        <X className="size-4" />
      </button>
      <h2 className="font-display text-xl text-landing">继续完善你的求职工作台</h2>
      <p className="mt-1.5 max-w-xl text-sm text-muted">
        择程AI还需要了解{items.join("、")}。你不需要手动编辑 YAML，只需用自然语言回答，助手会在你确认后写入本地文件。
      </p>
      {cli ? (
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("co-assistant", { detail: { message: kickoff } }))}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-200"
        >
          <Sparkles className="size-4" /> 让助手继续设置
        </button>
      ) : (
        // The assistant needs a CLI to run — without one the kickoff would silently
        // drop. Send them to connect one first.
        <Link
          href="/config"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-200"
        >
          <Settings className="size-4" /> 先连接你的 Agent
        </Link>
      )}
    </div>
  );
}
