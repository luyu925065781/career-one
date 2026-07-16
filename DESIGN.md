---
version: alpha
name: 数字超体设计系统
description: 数字超体公司旗下 AI Native 产品共用的视觉身份与设计 Token；择程AI是当前参考实现。
colors:
  primary: "#FACC15"
  on-primary: "#111827"
  primary-hover: "#FBBF24"
  primary-active: "#D97706"
  primary-container: "#FEF3C7"
  on-primary-container: "#111827"
  primary-50: "#FFFBEB"
  primary-100: "#FEF3C7"
  primary-200: "#FDE68A"
  primary-300: "#FCD34D"
  primary-400: "#FBBF24"
  primary-500: "#F59E0B"
  primary-600: "#D97706"
  primary-700: "#B45309"
  primary-800: "#92400E"
  primary-900: "#78350F"
  secondary: "#FDE047"
  on-secondary: "#111827"
  background: "#F7F6F3"
  on-background: "#111827"
  surface: "#FFFFFF"
  surface-container-low: "#F9FAFB"
  surface-container: "#F3F4F6"
  surface-container-high: "#E5E7EB"
  surface-container-highest: "#D1D5DB"
  surface-hover: "#F3F4F6"
  on-surface: "#111827"
  on-surface-variant: "#4B5563"
  muted: "#4B5563"
  faint: "#6B7280"
  outline: "#E5E7EB"
  outline-strong: "#D1D5DB"
  gray-50: "#F9FAFB"
  gray-100: "#F3F4F6"
  gray-200: "#E5E7EB"
  gray-300: "#D1D5DB"
  gray-400: "#9CA3AF"
  gray-500: "#6B7280"
  gray-600: "#4B5563"
  gray-700: "#374151"
  gray-800: "#1F2937"
  gray-900: "#111827"
  gray-950: "#030712"
  success: "#22C55E"
  success-text: "#15803D"
  warning: "#F59E0B"
  warning-text: "#B45309"
  error: "#EF4444"
  error-text: "#B91C1C"
  info: "#3B82F6"
  info-text: "#1D4ED8"
  dark-background: "#0A0A0A"
  dark-on-background: "#FFFFFF"
  dark-surface: "#161616"
  dark-surface-hover: "#232323"
  dark-outline: "#262626"
  dark-on-surface: "#FFFFFF"
  dark-on-surface-variant: "#9CA3AF"
  dark-primary: "#FACC15"
  dark-on-primary: "#111827"
  dark-success: "#4ADE80"
  dark-warning: "#FBBF24"
  dark-error: "#F87171"
  dark-info: "#60A5FA"
typography:
  display-lg:
    fontFamily: SF Pro Display / Source Han Sans SC
    fontSize: 64px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: 0em
  display-md:
    fontFamily: SF Pro Display / Source Han Sans SC
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: 0em
  headline-lg:
    fontFamily: SF Pro Display / Source Han Sans SC
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: 0em
  headline-md:
    fontFamily: SF Pro Display / Source Han Sans SC
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0em
  headline-sm:
    fontFamily: SF Pro Display / Source Han Sans SC
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0em
  title-lg:
    fontFamily: SF Pro Text / Source Han Sans SC
    fontSize: 20px
    fontWeight: 600
    lineHeight: 28px
    letterSpacing: 0em
  body-lg:
    fontFamily: SF Pro Text / Source Han Sans SC
    fontSize: 18px
    fontWeight: 400
    lineHeight: 28px
    letterSpacing: 0em
  body-md:
    fontFamily: SF Pro Text / Source Han Sans SC
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: SF Pro Text / Source Han Sans SC
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0em
  label-md:
    fontFamily: SF Pro Text / Source Han Sans SC
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0em
  label-sm:
    fontFamily: SF Pro Text / Source Han Sans SC
    fontSize: 12px
    fontWeight: 600
    lineHeight: 16px
    letterSpacing: 0em
  code-md:
    fontFamily: ui-monospace
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0em
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 12px
  card: 16px
  panel: 24px
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 40px
  4xl: 48px
  5xl: 64px
  6xl: 80px
  mobile-margin: 16px
  desktop-gutter: 24px
  content-max: 1280px
  touch-target: 44px
components:
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.on-background}"
    typography: "{typography.body-md}"
  page-dark:
    backgroundColor: "{colors.dark-background}"
    textColor: "{colors.dark-on-background}"
    typography: "{typography.body-md}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 8px 12px
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
  button-primary-dark:
    backgroundColor: "{colors.dark-primary}"
    textColor: "{colors.dark-on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
  button-outline:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 8px 12px
    height: 40px
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 44px
  card-standard:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.xl}"
  card-subtle:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.card}"
    padding: "{spacing.lg}"
  card-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-on-surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.xl}"
  nav-item-selected:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  list-item-hover:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  metadata:
    textColor: "{colors.faint}"
    typography: "{typography.body-sm}"
  divider:
    backgroundColor: "{colors.outline}"
    height: 1px
  input-focus-border:
    backgroundColor: "{colors.outline-strong}"
    height: 1px
  status-success:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.success-text}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.md}"
  status-warning:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.warning-text}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.md}"
  status-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.error-text}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.md}"
  status-info:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.info-text}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.md}"
---

# 数字超体设计系统

## Overview

数字超体公司的视觉语言服务于 AI Native 产品、智能体工作台和高频生产力工具。它应当让用户感到**清晰、可靠、敏捷且具有人格温度**：像一位安静但反应迅速的专业合作者，而不是一张炫技的科技海报。

品牌通过三组视觉信号建立识别：代表认知与行动的明亮黄色、提供长期阅读舒适度的暖白画布，以及承载信息密度的炭黑文字。界面以内容和工作流为中心，装饰必须服从任务。择程AI是这套公司级设计系统的当前参考实现。

## Colors

颜色体系采用“**认知之光 + 暖白画布 + 高对比中性色**”。

- **Primary / 认知黄（#FACC15）：** 只用于品牌标记、最重要的主操作、当前进度和关键选中状态。黄色表面始终搭配 `on-primary` 深色文字，不使用白色小字。
- **Secondary / 明亮黄（#FDE047）：** 用于主渐变的亮端和柔和强调，不独立承担第二套品牌主题。
- **Background / 暖白（#F7F6F3）：** 页面基础画布，比纯白更适合长时间使用。
- **Surface / 白色（#FFFFFF）：** 工具面板、输入区和需要明确分组的内容表面。
- **On Surface / 炭黑（#111827）：** 标题、正文和关键数据的默认颜色。
- **Muted / 石墨灰（#4B5563）：** 次级正文、说明和辅助信息；更弱的元数据使用 `faint`。
- **Semantic colors：** 成功、警告、错误和信息必须分别使用 `success`、`warning`、`error`、`info`，不得全部染成品牌黄色。
- **Dark mode：** 使用近黑画布和中性深灰表面，品牌黄色保持不变；不使用深蓝或紫色替代黑色底层。

品牌渐变是 Primary 的状态表达，不是页面装饰：

```css
--gradient-primary: linear-gradient(135deg, #facc15 0%, #fde047 100%);
--gradient-primary-hover: linear-gradient(135deg, #fbbf24 0%, #facc15 100%);
--gradient-primary-active: linear-gradient(135deg, #d97706 0%, #eab308 100%);
```

## Typography

字体采用统一的现代无衬线语言，不使用衬线展示字体。

- **英文 / SF Pro 风格：** 公司级英文视觉以 SF Pro Display 和 SF Pro Text 的比例、字重与字面气质为基准。标题使用 Display 风格，正文与控件使用 Text 风格；非 Apple 平台使用接近的系统无衬线字体回退，不分发 Apple 专有字体文件。
- **中文 / 思源黑体：** 公司级中文视觉以思源黑体（Source Han Sans SC）的结构和字重为基准，用于标题、正文、按钮、表单、导航、标签、表格和数字。
- **具体产品 / 系统自带字体：** 择程AI等具体产品不额外下载或内嵌品牌字体，使用当前操作系统的 UI 字体。Apple 平台优先 SF Pro 与苹方，Windows 优先 Segoe UI 与微软雅黑，其他平台使用 `system-ui` 及本地无衬线回退。
- **ui-monospace：** 用于命令、文件路径、代码、任务 ID 和机器状态。

不随视口宽度缩放字号。所有字距保持 `0`，长文本依靠换行、容器约束和层级调整解决，不使用负字距挤压内容。

## Layout

布局以高频工作流为中心，而不是营销页面构图。

- 使用 4px 基础单位；主要间距为 8、12、16、24、32、40、48、64、80px。
- 桌面内容最大宽度为 1280px，常规 gutter 为 24px；移动端页面边距为 16px。
- 仪表盘、列表和表格允许紧凑，但必须通过标题、分隔线和对齐建立清晰扫描路径。
- 固定格式组件必须定义稳定宽高、网格轨道或 `aspect-ratio`，动态状态不得造成布局跳动。
- 页面区块使用全宽带状或无框布局。卡片只用于独立重复项、真正需要边界的工具、模态框和聚合面板；禁止卡片套卡片。
- 移动端交互目标最小为 44×44px，所有文字必须在容器内完整显示。

## Elevation & Depth

层级主要由**色调、边框和内容密度**建立，阴影只作为辅助。

- 页面画布使用 `background`，主要工作表面使用 `surface`，悬停和次级层使用 `surface-hover` 或容器色阶。
- 普通卡片使用 1px `outline` 边框；高优先级工具可以使用低透明度、宽扩散的中性阴影。
- Hover 可以轻微抬升 1px，但不能改变组件尺寸或推动相邻内容。
- 品牌光效只允许出现在短暂的关键反馈中。禁止大面积发光、渐变光球、bokeh 和纯装饰性背景效果。
- Liquid glass 仅限小型悬浮控制，不用于主要内容容器或大面积页面结构。

## Shapes

形状语言是**克制、精确、略带柔和**。

- 按钮和输入框默认 8px 圆角。
- 状态块和紧凑工具可使用 4px；较大的独立卡片使用 16px；大型聚合面板最多 24px。
- 只有状态胶囊、筛选 Chip、头像和明确的圆形图标按钮可以使用 `full` 圆角。
- 不要把所有按钮做成胶囊，也不要用带文字的圆角矩形替代已有通用图标。
- 图标优先使用 Lucide，保持一致的线宽、圆角端点和稳定容器尺寸。

## Components

### Buttons

- 每个主要任务区域只设置一个清晰的 Primary 操作。Primary 使用黄色渐变与深色文字。
- Outline 按钮保持中性黑白，不使用黄色边框；Hover 只提高背景和边框的不透明度。
- 熟悉的工具操作优先使用图标按钮，并为不熟悉的图标提供 Tooltip。
- Disabled 状态降低透明度但保持文字可辨识；Loading 状态必须保持原尺寸，并明确当前阶段。

### Inputs and selection

- 输入框使用白色或深色表面、1px 中性边框和 8px 圆角。
- 输入框 Focus 禁止阴影、光晕或发光环，只改变边框颜色；按钮和链接继续保留 2px 可见焦点轮廓。
- 二元设置使用开关或复选框，模式切换使用 Segmented Control，视图切换使用 Tabs，选项集合使用菜单。
- 选中标签和状态徽章可以使用持续的浅色状态背景，但必须同时有文字或图标说明状态。

### Cards, lists and tables

- Card 是有明确边界的工作容器，不是默认页面装饰。避免 Card 内再放 Card。
- 重复数据优先使用列表或表格，列宽、操作区和状态区应保持稳定。
- 高信息密度界面使用较小标题和紧凑行高；Hero 字号只用于真正的首页或品牌场景。
- 报告、简历和长内容使用无框正文排版，通过标题层级、分隔线和留白组织信息。

### Icons and status

- 图标必须按角色使用 `icon-default`、`icon-muted`、`icon-brand`、`icon-success`、`icon-warning`、`icon-danger`、`icon-info` 的实现映射。
- 第三方 Logo 和内容图片保留原始品牌色，不强制染成黄色。
- 状态不能只依赖颜色表达；必须同时提供文字、图标或结构信号。

### Motion and feedback

- Hover、Active 和状态切换使用 100–200ms 的简短过渡。
- 长任务必须显示当前阶段、已耗时和可恢复状态，不使用无限转圈作为唯一反馈。
- 遵守 `prefers-reduced-motion`；关闭动效后仍需保留完整状态信息。

## Do's and Don'ts

- **Do** 使用机器可读 Token 和语义类；**Don't** 在业务组件中硬编码新的品牌色或中性色。
- **Do** 把黄色留给品牌和关键操作；**Don't** 把所有图标、标签、边框和状态统一染黄。
- **Do** 用 SF Pro 风格和思源黑体建立统一的无衬线层级；**Don't** 在产品标题、统计数字或操作界面中混入衬线展示字体。
- **Do** 保持一个视图一个主要动作；**Don't** 并列多个同权重的主色按钮。
- **Do** 使用中性表面、边框和留白建立层级；**Don't** 依赖大面积阴影、渐变背景或装饰性光球。
- **Do** 保证正文至少 4.5:1、图形和大字至少 3:1 的对比度；**Don't** 在黄色表面使用白色小字。
- **Do** 为移动端提供至少 44×44px 的操作目标；**Don't** 让文字、图标或加载状态改变固定组件尺寸。
- **Do** 复用现有 UI 组件和语义 Token；**Don't** 在单个页面发明独立视觉体系。
