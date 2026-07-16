# 正式版、内测版与开发版

择程AI采用三条显式发布通道，避免尚未完成的功能混入正式用户环境。

| 通道 | 版本示例 | 用途 | 功能范围 |
|---|---|---|---|
| `stable` | `1.2.0` | 正式用户 | 仅 `stable` 功能 |
| `beta` | `1.2.0-beta.1` | 邀请内测 | `stable` + `beta` |
| `development` | `1.2.0-dev.1` | 本地开发 | 除 `hidden` 外全部 |

## 分支规则

- `main`：始终保持可发布，稳定版只能从这里发布。
- `develop`：日常集成与开发版工作台。
- `codex/*`：独立任务分支，合并到 `develop` 后再统一验证。
- 稳定发布：`develop` 验证完成后合并到 `main`，准备无后缀 SemVer，再创建 GitHub Release。

建议用两个 Git worktree 完全隔离运行环境：

```bash
git worktree add ../career-one-stable main
git worktree add ../career-one-dev develop
```

正式版默认使用 `3000` 端口，开发版可使用 `3101`：

```bash
cd ../career-one-stable && npm run dev:web
cd ../career-one-dev && PORT=3101 npm run dev:web
```

## 功能分级

根目录 `release.config.json` 是唯一可编辑的功能发布清单。`web/release.config.json` 是由 `release.mjs` 同步并校验的构建镜像，不要手工修改。每个功能只能处于：

- `stable`：正式可用。
- `beta`：仅内测版和开发版可用。
- `development`：仅开发版可用。
- `hidden`：任何通道都不可用。

Web 侧栏、直接访问页面、API 路由和助手导航都会读取同一份清单。不要在组件里另写环境判断。

## 版本命令

查看状态：

```bash
npm run release:status
```

准备开发版：

```bash
npm run release:prepare -- --channel development --version 1.2.0-dev.1
```

准备内测版：

```bash
npm run release:prepare -- --channel beta --version 1.2.0-beta.1
```

准备正式版（只能在 `main`）：

```bash
npm run release:prepare -- --channel stable --version 1.2.0
```

发布前校验：

```bash
npm run release:verify -- --channel stable
```

`.release-please-manifest.json` 记录已经发布的版本，不跟随每次开发版编号变化。

## 发布检查单

1. 在 `develop` 跑根目录测试、Web 测试、类型检查和生产构建。
2. 将准备公开的功能从 `beta` 或 `development` 提升到 `stable`。
3. 合并到 `main`，执行 `release:prepare` 和 `release:verify`。
4. 从 `main` 手动触发 `Release` 工作流，选择通道并确认发布。
5. 正式用户的更新器只跟随最新稳定 Release；开发环境跟随 `develop`。

用户层文件（`cv.md`、个人配置、投递记录、报告和面试故事）不参与版本发布，也不应复制到公开测试夹具。
