# 示例

这些参考文件展示了 career-one 的数据格式和约定。运行时不会读取它们；它们的作用是在你创建自己的文件前，提供可对照的结构。

## 文件

| 文件 | 展示内容 |
|------|----------|
| `cv-example.md` | `cv.md` 的组织方式，包括章节、指标格式，以及虚构 AI 工程师 Alex Chen 的成果证明写法 |
| `resume-example.md` | `cv-example.md` 的 Resume 版本，内容相同，但面向美国及行业岗位使用“Resume”命名；可用于比较 1–2 页定向 Resume 与较长学术 CV 的结构差异 |
| `article-digest-example.md` | `article-digest.md` 的写法，包括核心指标、架构摘要和每个项目的关键决策 |
| `sample-report.md` | 评估管道生成的 A-F 报告格式，包含从岗位摘要到面试计划的六个模块 |
| `ats-normalization-test.md` | `generate-pdf.mjs` 的 Unicode 规范化回归夹具，列出问题码位及其 ASCII 安全替代字符 |
| `dual-track-engineer-instructor/` | 同时具有工程师和讲师两个主要职业原型的完整画像示例，包含 `cv.md`、`profile.yml`，以及双轨模式的使用说明 |

## 使用方式

这些文件仅供只读参考。要设置你自己的 career-one 工作区：

1. 运行 `npm run doctor` 检查前置条件。
2. 编写 `cv.md` 时参考 `cv-example.md`；面向美国及行业市场时，也可以参考 `resume-example.md`。
3. 参考 `article-digest-example.md` 编写可选的 `article-digest.md`，以提升评估质量。
4. 如果你的职业经历横跨两个清晰的职业原型，请查看 `dual-track-engineer-instructor/` 目录。
