# 批量处理

通过无头工作进程并行处理多个岗位。每个工作进程会独立运行完整评估管道，包括 A-F 报告、PDF 和追踪记录。不同 CLI 对应的正确命令见 `AGENTS.md` 中的“Headless / Batch Mode”表格。

## 快速开始

1. 将岗位添加到 `batch-input.tsv`，字段以制表符分隔：`id`、`url`、`source`、`notes`。

   ```tsv
   id	url	source	notes
   1	https://jobs.example.com/role-a	LinkedIn	
   2	https://greenhouse.io/company/role-b	Greenhouse	priority
   ```

2. 先执行试运行，预览即将处理的内容：

   ```bash
   ./batch/batch-runner.sh --dry-run
   ```

3. 运行批处理：

   ```bash
   ./batch/batch-runner.sh
   ```

4. 处理结果会自动合并到 `data/applications.md`；已处理岗位会从 `data/pipeline.md` 收件箱中移出；运行结束时由 `verify-pipeline.mjs` 检查完整性。

## 参数

| 参数 | 默认值 | 说明 |
|------|---------|-------------|
| `--parallel N` | `1` | 并发无头工作进程数量 |
| `--dry-run` | 关闭 | 只预览待处理岗位，不实际处理 |
| `--retry-failed` | 关闭 | 仅重试状态为 `failed` 的岗位 |
| `--cli NAME` | `codex` | 工作进程使用的 CLI：`codex` 或 `claude` |
| `--resume-paused` | 关闭 | 恢复因会话或速率限制而暂停的岗位 |
| `--start-from N` | `0` | 跳过 ID 小于 N 的岗位 |
| `--limit N` | `0` | 本次最多处理的岗位数；`0` 表示不限制 |
| `--max-retries N` | `2` | 放弃前对每个岗位的最大重试次数 |
| `--rate-limit-sleep N` | `300` | 工作进程临时触发速率限制后的等待秒数；设为 `0` 时立即暂停批处理 |

## 目录结构

```
batch/
  batch-runner.sh          # 编排脚本
  batch-prompt.md          # 发送给每个工作进程的提示词模板
  batch-input.tsv          # 输入岗位（由你创建）
  batch-state.tsv          # 处理状态（自动管理、支持续跑）
  logs/                    # 每个岗位的工作进程日志（{report_num}-{id}.log）
  tracker-additions/       # 工作进程生成的 TSV 记录
    merged/                # 已合并到 applications.md 的 TSV
```

## 工作原理

1. `batch-runner.sh` 读取 `batch-input.tsv` 和 `batch-state.tsv`，确定需要处理的岗位。
2. 对每个待处理岗位分配报告编号，并使用 `batch-prompt.md` 作为系统提示词启动无头工作进程；`{{URL}}`、`{{REPORT_NUM}}` 等占位符会被替换。
3. 每个工作进程评估岗位，将报告写入 `reports/`、PDF 写入 `output/`，并在 `tracker-additions/` 中生成一条追踪 TSV。
4. 全部工作进程结束后，批处理器依次调用 `merge-tracker.mjs` 将 TSV 合并到 `data/applications.md`，调用 `reconcile-pipeline.mjs` 从 `data/pipeline.md` 收件箱移出已处理岗位，再由 `verify-pipeline.mjs` 检查完整性。

## 合并追踪记录

工作进程会为每个岗位在 `batch/tracker-additions/` 中写入一份 TSV。合并脚本（`npm run merge`）负责：

- 按公司与岗位的模糊匹配结果及报告编号去重。
- 转换列顺序：TSV 中状态在评分前，`applications.md` 中评分在状态前。
- 重新评估得分高于现有记录时，原地更新该记录。
- 将处理完成的 TSV 移到 `tracker-additions/merged/`。

如果需要在批处理之外执行合并，可手动运行 `npm run merge`。

## 对账岗位管道

批处理模式从 `batch-input.tsv` 读取岗位，而 `data/pipeline.md` 收件箱是另一份独立列表。如果不做对账，已由批处理评估的岗位仍会留在管道的 `Pendientes` 区域，并在下次扫描或运行 `/career-one pipeline` 时再次出现，造成重复报告。

`reconcile-pipeline.mjs`（通过 `npm run reconcile` 运行）用于消除这一差异。追踪记录合并后，凡是在 `batch-state.tsv` 中状态为 `completed` 或 `skipped`、且 URL 仍位于管道 `Pendientes` 区域的岗位，都会连同报告链接和评分移到 `Procesadas`；磁盘上没有报告文件的记录会保留原位。该操作具备幂等性，每次批处理后运行或手动运行都安全。

## 断点续跑

`batch-state.tsv` 记录每个岗位的状态：`pending`、`processing`、`completed`、`failed`、`skipped`、`rate_limited`、`paused_rate_limit`。批处理被中断后，再次运行 `batch-runner.sh` 会从上次位置继续，并自动跳过已完成岗位。`rate_limited` 是运行器等待重试时使用的未完成状态，因此被中断的限速任务会在下次正常运行时重新进入候选队列。

`paused_rate_limit` 的含义不同：某个工作进程触发了会话、用量或速率限制，运行器因此停止调度新岗位并保留重试次数。限制解除后，需要显式恢复这些记录：

```bash
./batch/batch-runner.sh --resume-paused
```

基于 PID 的锁文件 `batch-runner.pid` 用于防止多个批处理同时运行。如果上次运行崩溃，过期锁会被自动识别并移除。

## 前置条件

- 你使用的 CLI 已加入 `PATH`；具体命令见 `AGENTS.md` 中的“Headless / Batch Mode”表格。
- Node.js >= 20.9，推荐 Node.js 22 LTS 或更新的 LTS 版本；已安装 Playwright Chromium，可运行 `npm run doctor` 检查。
- `batch-input.tsv` 中至少包含一个岗位。
