import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import { careerOneRoot } from "@/lib/career-one";
import { atomicWriteWithBackup } from "@/lib/core/safe-write";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlatformDefinition = {
  id: string;
  name: string;
  url: string;
  description: string;
  access: string;
};

type CompanyRecommendation = {
  name: string;
  industry: string;
  lane: "ai-native" | "enterprise-ai" | "enterprise-software";
  scanQuery: string;
};

const MAINLAND_PLATFORMS: PlatformDefinition[] = [
  { id: "boss", name: "BOSS直聘", url: "https://www.zhipin.com/", description: "创业公司和互联网岗位覆盖广，适合直接与招聘者沟通。", access: "登录后浏览与沟通" },
  { id: "liepin", name: "猎聘", url: "https://www.liepin.com/", description: "中高端岗位和猎头机会较多，适合负责人及专家岗位。", access: "登录后浏览" },
  { id: "maimai", name: "脉脉", url: "https://maimai.cn/jobs", description: "结合职场关系和公司动态发现机会，适合验证团队与岗位信息。", access: "通常需要登录" },
  { id: "zhaopin", name: "智联招聘", url: "https://www.zhaopin.com/", description: "综合招聘平台，覆盖大中型企业和全国城市岗位。", access: "浏览器或客户端" },
  { id: "51job", name: "前程无忧", url: "https://www.51job.com/", description: "综合招聘平台，适合补充传统行业和大型企业岗位。", access: "浏览器或客户端" },
];

const COMPANY_CATALOG: CompanyRecommendation[] = [
  { name: "智谱AI", industry: "大模型 / Agent 平台", lane: "ai-native", scanQuery: "\"智谱AI\" 招聘 (AI产品 OR 智能体 OR 创始人办公室 OR 战略运营)" },
  { name: "月之暗面", industry: "大模型 / AI Native", lane: "ai-native", scanQuery: "\"月之暗面\" OR \"Moonshot AI\" 招聘 (产品 OR 运营 OR 战略 OR Agent)" },
  { name: "MiniMax", industry: "大模型 / 多模态 AI", lane: "ai-native", scanQuery: "\"MiniMax\" 招聘 (AI产品 OR Agent OR 商业化 OR 战略运营)" },
  { name: "阶跃星辰", industry: "大模型 / 多模态 AI", lane: "ai-native", scanQuery: "\"阶跃星辰\" 招聘 (AI产品 OR 智能体 OR 战略 OR 运营)" },
  { name: "百川智能", industry: "大模型 / 行业 AI", lane: "ai-native", scanQuery: "\"百川智能\" 招聘 (AI产品 OR 解决方案 OR 战略运营)" },
  { name: "零一万物", industry: "大模型 / AI 应用", lane: "ai-native", scanQuery: "\"零一万物\" 招聘 (AI产品 OR Agent OR 商业化 OR 运营)" },
  { name: "字节跳动 / 火山引擎", industry: "AI 平台 / 企业服务", lane: "enterprise-ai", scanQuery: "(\"字节跳动\" OR \"火山引擎\") 招聘 (AI产品 OR Agent OR 解决方案 OR 战略运营)" },
  { name: "飞书", industry: "企业协作 / AI 办公", lane: "enterprise-software", scanQuery: "\"飞书\" 招聘 (AI产品 OR 企业服务 OR 解决方案 OR 商业化)" },
  { name: "钉钉", industry: "企业协作 / AI 办公", lane: "enterprise-software", scanQuery: "\"钉钉\" 招聘 (AI产品 OR 企业AI OR 解决方案 OR 战略运营)" },
  { name: "百度智能云", industry: "云计算 / 企业 AI", lane: "enterprise-ai", scanQuery: "\"百度智能云\" 招聘 (AI产品 OR 智能体 OR 解决方案 OR 行业运营)" },
  { name: "阿里云", industry: "云计算 / 企业 AI", lane: "enterprise-ai", scanQuery: "\"阿里云\" 招聘 (AI产品 OR Agent OR 解决方案 OR 企业服务)" },
  { name: "腾讯云", industry: "云计算 / 企业 AI", lane: "enterprise-ai", scanQuery: "\"腾讯云\" 招聘 (AI产品 OR 智能体 OR 解决方案 OR 企业服务)" },
  { name: "华为云", industry: "云计算 / 企业 AI", lane: "enterprise-ai", scanQuery: "\"华为云\" 招聘 (AI产品 OR 解决方案 OR 企业AI转型)" },
  { name: "科大讯飞", industry: "AI 应用 / 行业解决方案", lane: "enterprise-ai", scanQuery: "\"科大讯飞\" 招聘 (AI产品 OR 智能体 OR 解决方案 OR 战略运营)" },
  { name: "金蝶", industry: "企业软件 / AI 转型", lane: "enterprise-software", scanQuery: "\"金蝶\" 招聘 (AI产品 OR 企业AI OR 解决方案 OR 战略运营)" },
  { name: "用友", industry: "企业软件 / AI 转型", lane: "enterprise-software", scanQuery: "\"用友\" 招聘 (AI产品 OR 企业AI OR 解决方案 OR 战略运营)" },
];

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function strings(value: unknown, max = 48): string[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const text = String(item).trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text.slice(0, 160));
    if (out.length >= max) break;
  }
  return out;
}

function loadDocument(root: string): Record<string, unknown> {
  const file = path.join(root, "portals.yml");
  if (fs.existsSync(file)) {
    const parsed = yaml.load(fs.readFileSync(file, "utf8"));
    if (!isObj(parsed)) throw new Error("portals.yml 必须是 YAML 对象，已拒绝覆盖。");
    return parsed;
  }
  try {
    const parsed = yaml.load(fs.readFileSync(path.join(root, "templates", "portals.example.yml"), "utf8"));
    return isObj(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeDocument(root: string, doc: Record<string, unknown>): void {
  atomicWriteWithBackup(path.join(root, "portals.yml"), yaml.dump(doc, { lineWidth: 120, noRefs: true }));
}

function normalizedPlatforms(doc: Record<string, unknown>) {
  const saved = Array.isArray(doc.recruitment_platforms) ? doc.recruitment_platforms.filter(isObj) : [];
  return MAINLAND_PLATFORMS.map((platform) => {
    const current = saved.find((entry) => entry.id === platform.id || entry.name === platform.name);
    return { ...platform, enabled: current?.enabled !== false };
  });
}

function normalizedCompanies(doc: Record<string, unknown>) {
  const rows = Array.isArray(doc.tracked_companies) ? doc.tracked_companies.filter(isObj) : [];
  return rows
    .map((company) => ({
      name: String(company.name || "").trim(),
      industry: String(company.industry || "未分类").trim(),
      careersUrl: String(company.careers_url || "").trim(),
      provider: String(company.provider || "").trim(),
      scanMethod: String(company.scan_method || "").trim(),
      scanQuery: String(company.scan_query || company.search_query || "").trim(),
      enabled: company.enabled !== false,
    }))
    .filter((company) => company.name);
}

function profileText(root: string, doc: Record<string, unknown>): string {
  let profile: unknown = {};
  try {
    profile = yaml.load(fs.readFileSync(path.join(root, "config", "profile.yml"), "utf8"));
  } catch {
    /* target rules still provide enough context */
  }
  return `${JSON.stringify(doc.title_filter || {})} ${JSON.stringify(profile || {})}`.toLowerCase();
}

function recommendedCompanies(root: string, doc: Record<string, unknown>) {
  const context = profileText(root, doc);
  const wantsAiNative = /ai|agent|智能体|大模型|创业|founder|native/.test(context);
  const wantsEnterprise = /企业|转型|落地|saas|operations|解决方案|商业化/.test(context);
  const current = new Set(normalizedCompanies(doc).map((company) => company.name.toLowerCase()));
  const laneReason: Record<CompanyRecommendation["lane"], string> = {
    "ai-native": "匹配 AI Native、智能体和创始人协作方向",
    "enterprise-ai": "匹配企业 AI 转型、产品与解决方案落地方向",
    "enterprise-software": "匹配企业服务、组织协作与 AI 商业化方向",
  };
  return COMPANY_CATALOG.map((company, index) => ({
    ...company,
    reason: laneReason[company.lane],
    score:
      (wantsAiNative && company.lane === "ai-native" ? 4 : 0) +
      (wantsEnterprise && company.lane !== "ai-native" ? 3 : 0) +
      (/产品|product/.test(context) ? 1 : 0) -
      index / 100,
  }))
    .filter((company) => !current.has(company.name.toLowerCase()))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ score: _score, lane: _lane, ...company }) => company);
}

function searchQueries(doc: Record<string, unknown>) {
  const rows = Array.isArray(doc.search_queries) ? doc.search_queries.filter(isObj) : [];
  return rows
    .map((row) => ({ name: String(row.name || "").trim(), query: String(row.query || "").trim(), enabled: row.enabled !== false }))
    .filter((row) => row.name && row.query)
    .slice(0, 24);
}

export async function GET() {
  const root = careerOneRoot();
  try {
    const doc = loadDocument(root);
    const title = isObj(doc.title_filter) ? doc.title_filter : {};
    const location = isObj(doc.location_filter) ? doc.location_filter : {};
    const content = isObj(doc.content_filter) ? doc.content_filter : {};
    const byTitle = isObj(content.by_title_keyword) ? content.by_title_keyword : {};
    const boards = Array.isArray(doc.job_boards) ? doc.job_boards.filter(isObj) : [];
    return Response.json({
      configured: fs.existsSync(path.join(root, "portals.yml")),
      platforms: normalizedPlatforms(doc),
      companies: normalizedCompanies(doc),
      recommendations: recommendedCompanies(root, doc),
      rules: {
        positive: strings(title.positive),
        negative: strings(title.negative),
        allow: strings(location.allow),
        block: strings(location.block),
        alwaysAllow: strings(location.always_allow),
        queries: searchQueries(doc),
        contentFilterGroups: Object.keys(byTitle).length,
        automatedBoards: boards.map((board) => ({
          name: String(board.name || "").trim(),
          provider: String(board.provider || "").trim(),
          enabled: board.enabled !== false,
        })).filter((board) => board.name),
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取 portals.yml 失败" }, { status: 409 });
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }

  const root = careerOneRoot();
  let doc: Record<string, unknown>;
  try {
    doc = loadDocument(root);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "portals.yml 无法解析" }, { status: 409 });
  }

  const action = typeof body.action === "string" ? body.action : "seed-rules";

  if (action === "save-platforms") {
    const choices = Array.isArray(body.platforms) ? body.platforms.filter(isObj) : [];
    const enabled = new Map(choices.map((choice) => [String(choice.id || ""), choice.enabled !== false]));
    doc.recruitment_platforms = MAINLAND_PLATFORMS.map((platform) => ({
      id: platform.id,
      name: platform.name,
      url: platform.url,
      access: "browser",
      enabled: enabled.get(platform.id) ?? true,
      notes: platform.access,
    }));
  } else if (action === "add-company") {
    if (!isObj(body.company)) return Response.json({ error: "company required" }, { status: 400 });
    const name = String(body.company.name || "").trim().slice(0, 80);
    const industry = String(body.company.industry || "未分类").trim().slice(0, 80);
    const careersUrl = String(body.company.careersUrl || "").trim();
    const scanQuery = String(body.company.scanQuery || "").trim().slice(0, 500);
    if (!name) return Response.json({ error: "公司名称不能为空" }, { status: 400 });
    if (careersUrl && !/^https:\/\/[^\s]+$/i.test(careersUrl)) return Response.json({ error: "招聘官网必须是 https URL" }, { status: 400 });
    const companies = Array.isArray(doc.tracked_companies) ? doc.tracked_companies.filter(isObj) : [];
    if (companies.some((company) => String(company.name || "").trim().toLowerCase() === name.toLowerCase())) {
      return Response.json({ error: "该公司已经在目标列表中" }, { status: 409 });
    }
    doc.tracked_companies = [
      ...companies,
      {
        name,
        industry,
        ...(careersUrl ? { careers_url: careersUrl } : {}),
        ...(careersUrl
          ? { provider: "official-careers", scan_method: "public" }
          : { scan_method: "websearch", scan_query: scanQuery || `\"${name}\" 招聘 (AI产品 OR 智能体 OR 战略运营 OR 解决方案)` }),
        enabled: true,
      },
    ];
  } else if (action === "remove-company") {
    const name = String(body.name || "").trim().toLowerCase();
    if (!name) return Response.json({ error: "公司名称不能为空" }, { status: 400 });
    const companies = Array.isArray(doc.tracked_companies) ? doc.tracked_companies.filter(isObj) : [];
    doc.tracked_companies = companies.filter((company) => String(company.name || "").trim().toLowerCase() !== name);
  } else if (action === "toggle-company") {
    const name = String(body.name || "").trim().toLowerCase();
    const companies = Array.isArray(doc.tracked_companies) ? doc.tracked_companies.filter(isObj) : [];
    doc.tracked_companies = companies.map((company) =>
      String(company.name || "").trim().toLowerCase() === name ? { ...company, enabled: body.enabled !== false } : company,
    );
  } else if (action === "save-rules") {
    if (!isObj(body.rules)) return Response.json({ error: "rules required" }, { status: 400 });
    const positive = strings(body.rules.positive);
    if (positive.length === 0) return Response.json({ error: "至少保留一个目标岗位关键词" }, { status: 400 });
    const title = isObj(doc.title_filter) ? { ...doc.title_filter } : {};
    title.positive = positive;
    title.negative = strings(body.rules.negative);
    doc.title_filter = title;
    const location = isObj(doc.location_filter) ? { ...doc.location_filter } : {};
    location.allow = strings(body.rules.allow);
    location.block = strings(body.rules.block);
    location.always_allow = strings(body.rules.alwaysAllow);
    doc.location_filter = location;
    const queries = Array.isArray(body.rules.queries) ? body.rules.queries.filter(isObj) : [];
    doc.search_queries = queries.map((query) => ({
      name: String(query.name || "").trim().slice(0, 100),
      query: String(query.query || "").trim().slice(0, 800),
      enabled: query.enabled !== false,
    })).filter((query) => query.name && query.query).slice(0, 24);
  } else {
    // Back-compatible onboarding path used by setProfile/setPortals actions.
    const roles = strings(body.roles, 24);
    if (roles.length === 0) return Response.json({ error: "no roles" }, { status: 400 });
    const title = isObj(doc.title_filter) ? { ...doc.title_filter } : {};
    title.positive = roles;
    doc.title_filter = title;
    if (Array.isArray(body.location) && body.location.length) {
      const location = isObj(doc.location_filter) ? { ...doc.location_filter } : {};
      location.allow = strings(body.location);
      doc.location_filter = location;
    }
  }

  try {
    writeDocument(root, doc);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "write failed" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
