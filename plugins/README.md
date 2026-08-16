# career-one 插件

插件层用于承载**需要密钥或访问外部服务的可选集成**。零密钥、本地优先的核心刻意不包含这些能力。它沿用已经验证的 `providers/` 模式：在这里放入一个目录并声明清单，系统就会自动发现插件。

> **这里不是 Claude Code Plugin。** 本目录与 `.claude-plugin/` 中的 Claude Code 市场元数据无关；这里的插件用于扩展 career-one 本身。

## 默认关闭

只有在用户主动选择后，插件才会加载。缺少 `config/plugins.yml` 时，核心行为完全不变：不会运行插件代码，不会读取 `.env`，也不会产生其他变化。必须同时满足两个条件：

1. 在 `config/plugins.yml` 中启用插件，可从 `config/plugins.example.yml` 复制。
2. 在你自己的 `.env` 中提供插件所需密钥；每个插件会声明自己的要求。
   可运行 `node doctor.mjs` 或 `node career-one.mjs plugins list` 查看缺失项。

## 插件结构

插件是 `plugins/` 或 `plugins.local/` 下的一个目录。`plugins/` 中的插件随 career-one 分发；`plugins.local/` 保存你自己的插件，已被 Git 忽略且不会自动更新：

```
plugins/<id>/
  manifest.json     # 只解析、不执行；导入任何代码前先验证
  index.mjs         # 默认导出以钩子类型为键的对象
  _anything.mjs     # 辅助模块；下划线前缀表示永不作为插件发现
```

### manifest.json

```json
{
  "id": "wellfound",                 // 必须与目录名一致；格式为 [a-z0-9-]
  "apiVersion": 1,
  "description": "用一句话说明插件用途。",
  "hooks": ["provider"],             // 可选：provider、ingest、search、notify、export
  "requiredEnv": ["WELLFOUND_TOKEN"],// 只写环境变量名，值放入 .env
  "allowedHosts": ["api.wellfound.com"], // requiredEnv 非空时必填
  "humanInTheLoop": true             // 必须为 true
}
```

### 钩子（`index.mjs` 默认导出）

| 钩子 | 签名 | 作用 |
|------|-----------|------|
| `provider` | `{ id, detect?, fetch(entry, ctx) → Job[] }` | 需要密钥或认证的岗位来源，结构与 `providers/_types.js` 一致。`portals.yml` 中存在 `provider: <id>` 项时，通过 `scan` 运行。 |
| `ingest` | `(ctx) → Job[]` | 从邮件或招聘看板等服务拉取岗位。 |
| `search` | `(query, ctx) → Job[]` | 按查询字符串搜索岗位。 |
| `export` | `(snapshot, ctx) → {pushed}` | 将**只读**追踪快照推送到你自己的外部存储。 |
| `notify` | `(payload, ctx) → void` | 发送外部通知。 |

生产型钩子（`provider`、`ingest`、`search`）只**返回** `Job[]`，格式为 `{title, url, company, location}`。始终由引擎而不是插件通过规范写入器将结果写入 `data/pipeline.md`，因此插件无法破坏 Web 读取的数据格式。非 `provider` 钩子需要显式运行：

```bash
node career-one.mjs plugins list
node career-one.mjs plugins run gmail                       # ingest
node career-one.mjs plugins run notion search "platform"    # search
node career-one.mjs plugins run notion export [--dry-run]   # export
```

### `ctx` 对象

- `fetch(url, opts)` 是受保护的基础能力：仅允许 HTTPS，请求限制在 `allowedHosts`，并通过 `redirect:'manual'` 重新验证每一次跳转；主机名变化时会移除凭据。**所有 HTTP 请求都应经过 `ctx.fetch`**，也可以使用其上的 `fetchText` 或 `fetchJson`，以确保出口保护真正执行。直接调用全局 `fetch` 会绕过保护。内置 `apify` 插件是有意保留的例外，其客户端在代码中明确限制为单一硬编码主机。
- `env`：冻结对象，仅包含插件声明的键；`settings`：`config/plugins.yml` 中对应的非敏感配置；`log`：会遮蔽已声明密钥的日志；`dryRun`：试运行状态。

## 自有插件放入 `plugins.local/`

私有或实验性插件应放入与 `plugins/` 同级的 **`plugins.local/`**，不要放入 `plugins/`。`plugins.local/` 已被 Git 忽略且永不自动更新，系统更新不会覆盖它；同时它也不能遮蔽同 ID 的内置插件。发生 ID 冲突时，内置插件优先。

## 信任模型（请务必阅读）

career-one 使用无需构建的原生 ESM，因此引擎**无法真正隔离**插件的导入。`allowedHosts`、限定范围的 `ctx.env` 和禁止自动提交的钩子分类，可以约束**诚实实现**的插件，并让所有已加载插件都可通过 `doctor` 或 `plugins.mjs list` 查看；但它们无法构成抵御恶意代码的硬边界，恶意插件仍可能直接访问 `process.env` 或网络。请按其他开源软件的同等标准处理：

- **内置插件**（`plugins/`）与 `providers/` 一样接受代码审查。CI 会检查它们不声明核心拥有的密钥、不导入浏览器自动化或进程启动模块，并且永不自动提交申请。
- **`plugins.local/`** 以**你的信任**运行，因为它由你安装。请把第三方插件视为任何其他会在本机运行的代码。

## 不属于插件的能力

以下能力不属于插件层，它们代表不同的产品方向：

- 项目方运营的**中心化基础设施**，例如托管岗位聚合、共享匹配服务、代理或 Workers。这些属于**独立、可选的服务**，相关讨论见 [career-one 的后续方向（#904）](https://github.com/luyu925065781/career-one/discussions/904)，不属于开放核心。
- **自动提交或盲目海投**。career-one 是决策辅助工具，不是群发机器人。它只为**你**起草申请，由你审阅并提交。任何钩子都不能提交申请，且 `humanInTheLoop: true` 是强制要求；核心和插件都遵守该规则。

完整边界见 `.github/CONTRIBUTING.md` 中的“Scope”章节。
