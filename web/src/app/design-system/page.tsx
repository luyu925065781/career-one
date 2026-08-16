import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import * as yaml from "js-yaml";
import {
  DesignSystemShowcase,
  type DesignDocument,
  type DesignPrinciple,
} from "@/components/design-system-showcase";
import { careerOneRoot } from "@/lib/career-one";

export const metadata: Metadata = {
  title: "UI 规范｜择程AI",
  description: "由 DESIGN.md 实时生成的择程AI设计系统组件规范页。",
};

export const dynamic = "force-dynamic";

function extractPrinciples(markdown: string): DesignPrinciple[] {
  const section = markdown.match(/## Do's and Don'ts\n([\s\S]*?)(?:\n## |$)/)?.[1] ?? "";

  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => {
      const match = line.match(/^- \*\*Do\*\* (.*?)；\*\*Don't\*\* (.*?)。?$/);
      if (!match) return null;
      return { do: match[1], dont: match[2] };
    })
    .filter((item): item is DesignPrinciple => item !== null);
}

function readDesignDocument(): { document: DesignDocument; principles: DesignPrinciple[] } {
  const root = careerOneRoot();
  const systemPath = path.join(root, "system", "docs", "DESIGN.md");
  const designPath = fs.existsSync(systemPath)
    ? systemPath
    : path.join(root, "docs", "DESIGN.md");
  const source = fs.readFileSync(designPath, "utf8");
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatter) {
    throw new Error("DESIGN.md 缺少有效的 YAML frontmatter");
  }

  const document = yaml.load(frontmatter[1]) as DesignDocument;
  if (!document?.colors || !document?.typography || !document?.spacing || !document?.rounded || !document?.elevation) {
    throw new Error("DESIGN.md 缺少颜色、字体、间距、圆角或阴影 Token");
  }

  return {
    document,
    principles: extractPrinciples(frontmatter[2]),
  };
}

export default function DesignSystemPage() {
  const { document, principles } = readDesignDocument();
  return <DesignSystemShowcase document={document} principles={principles} />;
}
