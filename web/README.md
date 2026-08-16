# 择程AI Web 工作台

这是 career-one 的**实验性、可选 Web 界面**。它以本地优先方式读取和展示 CLI 使用的同一组文件，包括 `data/pipeline.md`、`data/applications.md`、`reports/` 和 `config/`；没有平行引擎、独立数据库或远程服务器。不启动 Web 时，现有 CLI 工作流不会发生任何变化。

> **当前仍在内测。** 部分体验可能尚未完善。欢迎在 [Discussion #1142](https://github.com/luyu925065781/career-one/discussions/1142) 反馈；路线图背景见 [Discussion #156](https://github.com/luyu925065781/career-one/discussions/156)。

## 快速开始

需要 Node.js 20+。

```bash
npm ci --prefix web
npm run dev:web
```

打开 http://localhost:3301。应用会读取其所在 career-one 检出目录，也就是 `web/` 的上级目录；你现有的简历、岗位管道和报告会原样显示。

## 当前功能

- **求职进度**：以可排序、可筛选表格展示追踪记录；状态修改通过核心脚本写回。
- **发现岗位**：提供免费的反向 ATS 扫描并明确显示数据覆盖范围，也支持使用你自己的 CLI 或密钥进行 AI 辅助发现。
- **辅助投递**：协助预填表单，但继承核心的硬性规则：**绝不替你提交**，最终按钮始终由你点击。
- **今日待办、数据分析、简历和设置**：覆盖行动队列、转化漏斗、带预览的简历编辑和配置管理。

## 安全边界

- **本地优先**：Web 应用完全在你的电脑上运行，不依赖项目方云服务或账号；简历和数据保存在你自己的文件中。
- **绝不自动提交**：投递流程只起草和预填内容，提交始终是用户操作。
- **增量能力**：Web 与核心打包、CI 和发布自动化相互隔离；不使用 Web 时，CLI 行为完全不变。

## 开发

```bash
npm run dev:web                  # 在 3301 端口启动开发服务
npm run typecheck --prefix web   # 类型检查
npm run build --prefix web       # 生产构建
```

如需让应用读取另一个 career-one 目录，可在 `web/.env.local` 中设置 `CAREER_ONE_ROOT=/path/to/checkout`；这适合使用示例数据进行测试。
