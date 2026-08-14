# 招聘渠道种子抓取器

这是面向创业公司求职者的补充发现路径：读取**公开的风险投资机构被投企业名单**，再检查各公司的 ATS 是否有开放岗位，并将结果送入与 `portals.yml` 跟踪公司相同的管道。

## 功能说明

`scan-ats-full.mjs` 通常通过遍历 Greenhouse、Lever、Ashby、Workday 等公开 ATS 目录来发现公司。`seeds/` 层增加了一个用于寻找创业公司岗位的**高信号起点**：不必等待企业出现在 ATS 目录中，而是从知名投资机构的被投企业名单出发，快速覆盖数百家 YC 或 a16z 支持的公司。

处理流程：
```
投资机构被投企业 API/页面
    ↓ seeds/vc-portfolios.mjs
SeedCompany[]
    ↓ toPortalEntry()
PortalEntry（careers_url 设置为推测的最佳 ATS URL）
    ↓ provider.detect()（与 portals.yml 中的公司使用相同流程）
ATS provider 获取岗位
    ↓ title_filter / location_filter / dedup
data/pipeline.md
```

## 用法

### 通过 `scan-ats-full.mjs`（推荐）

```bash
# 从 Y Combinator 被投企业中查找最近 7 天的岗位
node scan-ats-full.mjs --seeds yc --since 7

# 同时使用 YC 和 a16z 种子，并执行试运行预览
node scan-ats-full.mjs --seeds yc,a16z --dry-run

# 组合种子来源与常规 ATS 来源
node scan-ats-full.mjs --seeds yc --ats greenhouse,lever --since 5

# npm 快捷命令
npm run scan:seeds   # yc + a16z
npm run scan:yc      # 仅 YC
```

### 通过代码调用

```js
import { fetchYCCompanies, fetchA16zCompanies, toPortalEntry, SEED_SOURCES } from './seeds/vc-portfolios.mjs';

// 获取 YC 被投企业
const companies = await fetchYCCompanies();
console.log(companies[0]);
// → { name: 'Stripe', slug: 'stripe', url: 'https://stripe.com', source: 'yc', batch: 'W11' }

// 转换为 ATS provider.detect() 使用的 PortalEntry
const entry = toPortalEntry(companies[0]);
// → { name: 'Stripe', careers_url: 'https://job-boards.greenhouse.io/stripe', source: 'yc' }

// 使用注册表
for (const [id, source] of Object.entries(SEED_SOURCES)) {
  const companies = await source.fetch();
  console.log(`${source.label}: ${companies.length} companies`);
}
```

## 数据来源

| 来源 | URL | 格式 | 认证 |
|--------|-----|--------|------|
| Y Combinator | `https://api.ycombinator.com/v0.1/companies` | JSON API | 无 |
| a16z | `https://a16z.com/portfolio/` | 公开 HTML 页面 | 无 |

- **YC**：最多获取 3 页、每页 1000 家公司，覆盖全部公开 YC 批次。
- **a16z**：解析公开被投企业页面；页面结构变化时会安全降级。

## 安全

- 任何 URL 插值发生前，所有 slug 都会用 `SLUG_RE = /^[A-Za-z0-9._-]+$/` 验证，与 `scan-ats-full.mjs` 的保护规则一致。
- 构造出的 ATS URL 在传给 provider 前，必须经过现有 `entryOnHost()` SSRF 保护。
- 不使用认证令牌、无头浏览器或 LLM API 调用。

## 添加更多投资机构名单

1. 添加纯函数 `parseXyzPayload(payload)`；函数内部不访问网络，以便使用内联夹具测试。
2. 添加异步函数 `fetchXyzCompanies(opts?)`，调用公开端点并返回 `SeedCompany[]`。
3. 在 `SEED_SOURCES` 中注册：

```js
export const SEED_SOURCES = {
  yc: { fetch: fetchYCCompanies, label: 'Y Combinator Portfolio' },
  a16z: { fetch: fetchA16zCompanies, label: 'Andreessen Horowitz (a16z) Portfolio' },
  // 在这里添加新来源：
  sequoia: { fetch: fetchSequoiaCompanies, label: 'Sequoia Portfolio' },
};
```

4. 在 `test-all.mjs` 中为 `parseXyzPayload()` 添加测试用例。

## 参考实现

投资机构被投企业种子方案参考了 [adityachaudhary99/job-hunt](https://github.com/adityachaudhary99/job-hunt) 中的 `02-seeds/fetch_yc.py` 和 `fetch_a16z.py`；它也是 issue #1370 最初引用的配套实现。
