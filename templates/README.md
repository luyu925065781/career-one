# 模板

这里存放 career-one 脚本和模式使用的系统层模板。运行 `npm run update` 时，这些文件会自动更新；用户自定义内容应写入用户层文件，具体边界见 `DATA_CONTRACT.md`。

## 文件

| 文件 | 使用方 | 用途 |
|------|---------|---------|
| `cv-template.html` | `generate-pdf.mjs` | 用于生成 ATS 优化 CV PDF 的 HTML/CSS 模板 |
| `resume-template.html` | `generate-pdf.mjs`（通过 `--template`） | `cv-template.html` 的 Resume 版本，布局和占位符相同；区别是 `<title>` 使用“Resume”而非“CV”、省略 Certifications 章节，并面向美国及行业市场的 1–2 页格式。详见下文。 |
| `cv-template.tex` | `generate-latex.mjs` | 用于生成 ATS 优化 CV PDF 的 LaTeX/Overleaf 模板 |
| `portals.example.yml` | 首次设置 | 招聘渠道扫描配置示例；复制为 `portals.yml` 后启用 |
| `states.yml` | `verify-pipeline.mjs`、`normalize-statuses.mjs`、`merge-tracker.mjs` | 规范投递状态及其别名 |

### cv-template.html

这是由 Playwright 渲染为 PDF 的 HTML 模板。它使用 `{{NAME}}`、`{{SUMMARY_TEXT}}`、`{{EXPERIENCE}}` 等占位符，PDF 管道会在生成时填充内容。

**设计：** 标题使用 Space Grotesk，正文使用 DM Sans；采用对 ATS 友好的单栏布局，字体从 `fonts/` 本地加载。

**自定义：** 可编辑此文件调整颜色、间距或章节顺序。占位符说明见 `batch/batch-prompt.md` 中的“Template placeholders”章节。

### resume-template.html

这是 `cv-template.html` 面向美国及行业岗位申请的 Resume 版本，与 CV 模板的主要差异包括：

- **标题**使用“Resume”而不是“CV”。
- **不包含 Certifications 章节**，Resume 更关注近期且相关的经历。
- **按 1–2 页设计**，省略学术型章节。

除此之外，它使用相同的 `{{NAME}}`、`{{SUMMARY_TEXT}}` 等占位符，并与现有 PDF 管道完全兼容。

**保持同步：** 更新 `cv-template.html` 时，应把对应改动同步到 `resume-template.html`，同时保留上述差异。

### cv-template.tex

这是用于生成 Overleaf 兼容 CV 的 LaTeX 模板，基于 [sb2nov/resume](https://github.com/sb2nov/resume) 格式。它使用 `{{NAME}}`、`{{EXPERIENCE}}`、`{{PROJECTS}}` 等占位符，LaTeX 管道会在生成时填充内容。

**设计：** 使用标准 CTAN 包 `fontawesome5`、`enumitem`、`hyperref`、`titlesec` 构建对 ATS 友好的单栏布局。不依赖自定义字体或外部资源，可直接上传到 Overleaf。

**用法：**
```bash
# 验证并编译 .tex → .pdf（要求 pdflatex 已加入 PATH）
node generate-latex.mjs output/cv-name-company-date.tex

# 也可以指定自定义输出路径
node generate-latex.mjs output/cv-name-company-date.tex output/custom-name.pdf
```

**前置条件：** Windows 可通过 [MiKTeX](https://miktex.org/) 安装 `pdflatex`，Linux/macOS 可使用 TeX Live。首次编译可能会自动安装缺失的 LaTeX 包；也可以直接把 `.tex` 文件上传到 [Overleaf](https://www.overleaf.com)，无需本地安装。

**自定义：** 可编辑此文件调整页边距、章节顺序或格式命令。占位符说明见 `modes/latex.md` 的“Template Placeholders”章节。

### portals.example.yml

预配置的招聘渠道扫描器，包含 45 家以上跟踪公司和搜索查询，以及岗位名称过滤器、公司招聘页 URL、Greenhouse API 端点和 WebSearch 查询。

**启用方式：** 将文件复制到项目根目录并命名为 `portals.yml`，再根据目标岗位调整 `title_filter.positive` 关键词；可按需增删公司。

### states.yml

定义 9 个规范投递状态及其常见别名：`Evaluated`、`Applied`、`Responded`、`Interview`、`Offer`、`Hired`、`Rejected`、`Discarded`、`SKIP`。所有管道脚本都以此文件验证状态。

**不要重命名这些状态。** 仪表盘和所有脚本都依赖这些精确 ID。如果遇到应映射到现有状态的新写法，可以添加别名。
