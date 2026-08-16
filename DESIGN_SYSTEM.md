# 择程AI设计系统

> 版本：1.1
> Token 所有者：择程AI
> 实现证据优先级：已实现 UI 页面 > 设计规范文档 > 历史组件样式

机器可读 Token 见 [`DESIGN.md`](DESIGN.md)。本文件说明择程AI的语义规则与实现约束；两份文件共同构成产品的设计 Source of Truth。若数值冲突，以 `DESIGN.md` 为准；若组件行为和实现位置冲突，以本文件及实际代码为准。

## 1. Token 架构

择程AI的 Token 按职责组织：

1. **基础值**：品牌色阶、中性色阶、字号、间距、圆角等稳定原始值，仅在 Token 文件内使用。
2. **语义角色**：`foreground`、`muted`、`brand`、`surface`、`success` 等随主题变化的产品角色。
3. **组件 Token**：按钮、卡片、状态徽章等由语义角色组合出的可复用契约。

业务组件只能使用语义 Token 或公共组件，不得直接使用 HEX、HSL、RGB、Tailwind 调色板色阶或裸阴影等级。

## 2. 基础值

### 2.1 品牌黄色

| Token | 色值 | 用途 |
|---|---:|---|
| primary-50 | `#fffbeb` | 极浅品牌背景 |
| primary-100 | `#fef3c7` | 浅品牌背景 |
| primary-200 | `#fde68a` | 柔和强调 |
| primary-300 | `#fcd34d` | 浅黄色强调 |
| primary-400 | `#fbbf24` | Hover 渐变起点 |
| primary-500 | `#f59e0b` | 标准金黄色 |
| primary-600 | `#d97706` | Active 状态 |
| primary-700 | `#b45309` | 浅色背景上的品牌文字 |
| primary-800 | `#92400e` | 小字号品牌文字 |
| primary-900 | `#78350f` | 最深品牌文字 |

### 2.2 中性色

| Token | 色值 | 用途 |
|---|---:|---|
| gray-50 | `#f9fafb` | 页面浅背景 |
| gray-100 | `#f3f4f6` | Hover 背景 |
| gray-200 | `#e5e7eb` | 边框与分隔线 |
| gray-300 | `#d1d5db` | 禁用边框 |
| gray-400 | `#9ca3af` | 深色模式弱化文字 |
| gray-500 | `#6b7280` | 浅色模式弱化文字 |
| gray-600 | `#4b5563` | 次级正文 |
| gray-700 | `#374151` | 大号正文 |
| gray-800 | `#1f2937` | 强调正文 |
| gray-900 | `#111827` | 标题与主文字 |
| gray-950 | `#030712` | 极深背景 |

### 2.3 多色相强调色

强调色板用于图表、进度条、数据标记和小面积视觉强调。黄色保持唯一品牌主色；紫色是可选强调色，不是品牌主色。

| Token | 色值 | 典型用途 |
|---|---:|---|
| accent-yellow | `#facc15` | 品牌、当前进度、核心选中 |
| accent-orange | `#f59e0b` | 暖色强调、等待类数据标记 |
| accent-red | `#ef4444` | 红色数据标记 |
| accent-green | `#22c55e` | 绿色数据标记 |
| accent-blue | `#3b82f6` | 蓝色数据标记 |
| accent-purple | `#4d44d6` | 紫色数据标记、独立强调 |

业务组件不得用 `accent-*` 猜测状态语义。表达成功、等待、失败或信息状态时，仍使用 `success-*`、`warning-*`、`danger-*`、`info-*`；这些状态 Token 可以引用对应的基础色相。

### 2.4 语义色

| Token | 色值 |
|---|---:|
| success | `#22c55e` |
| warning | `#f59e0b` |
| error | `#ef4444` |
| info | `#3b82f6` |

语义色只表达对应状态，不得用品牌黄色替代错误、成功或信息状态。

## 3. 运行时语义 Token

### 3.1 浅色模式

| 语义 Token | 基础 Token | 色值 |
|---|---|---:|
| background | warm product canvas | `#f7f6f3` |
| surface | white | `#ffffff` |
| surface-hover | gray-100 | `#f3f4f6` |
| border | gray-200 | `#e5e7eb` |
| foreground | gray-900 | `#111827` |
| muted | gray-600 | `#4b5563` |
| faint | gray-500 | `#6b7280` |
| selected-text | gray-900 | `#111827` |
| brand-text | secondary-600 | `#ca8a04` |
| action-secondary | gray-100 | `#f3f4f6` |
| action-secondary-hover | gray-200 | `#e5e7eb` |
| action-secondary-active | gray-300 | `#d1d5db` |
| action-secondary-foreground | gray-900 | `#111827` |
| outline-bg | gray-900 / 2.5% | `rgb(17 24 39 / 0.025)` |
| outline-bg-hover | gray-900 / 5% | `rgb(17 24 39 / 0.05)` |
| outline-border | gray-900 / 16% | `rgb(17 24 39 / 0.16)` |
| outline-border-hover | gray-900 / 22% | `rgb(17 24 39 / 0.22)` |

### 3.2 深色模式

| 语义 Token | 色值 |
|---|---:|
| background | `#0a0a0a` |
| surface | `#161616` |
| surface-hover | `#232323` |
| border | `#1f2937` |
| foreground | `#ffffff` |
| muted | `#9ca3af` |
| faint | `#9ca3af` |
| selected-text | `#ffffff` |
| brand-text | `#facc15` |
| action-secondary | `rgb(255 255 255 / 0.12)` |
| action-secondary-hover | `rgb(255 255 255 / 0.18)` |
| action-secondary-active | `rgb(255 255 255 / 0.24)` |
| action-secondary-foreground | `#ffffff` |
| outline-bg | `rgb(255 255 255 / 0.05)` |
| outline-bg-hover | `rgb(255 255 255 / 0.1)` |
| outline-border | `rgb(255 255 255 / 0.18)` |
| outline-border-hover | `rgb(255 255 255 / 0.26)` |

### 3.3 状态语义

每个状态必须同时具备三个角色，组件不得自行用透明度拼装一套新色阶：

| 角色 | Token 示例 | 用途 |
|---|---|---|
| 状态前景 | `success`、`warning`、`danger`、`info` | 状态文字与强调图标 |
| 状态浅底 | `success-surface`、`warning-surface`、`danger-surface`、`info-surface` | 徽章、提示条与选中状态背景 |
| 状态描边 | `success-border`、`warning-border`、`danger-border`、`info-border` | 状态容器边框 |
| 状态实色 | `success-solid`、`warning-solid`、`danger-solid`、`info-solid` | 进度条、状态点等小面积实色图形 |

浅色与深色模式分别定义这些运行时值。状态文字、浅底和描边必须作为一组切换，避免只覆盖文字导致对比度失衡。

### 3.4 大号指标强调色

大号数据不复用小字号正文色或图标色，统一使用独立的 `metric-*` Token。它们提高了色彩纯度与视觉亮感，但仅用于 24px 及以上的大号数字，普通正文、链接、徽章和图标仍使用原有语义 Token。

| Token | 浅色模式 | 深色模式 | 用途 |
|---|---:|---:|---|
| metric-brand | `#b48300` | `#facc15` | 核心数量、品牌指标 |
| metric-warning | `#ea580c` | `#fb923c` | 待处理、需要关注的指标 |
| metric-info | `#2563eb` | `#60a5fa` | 流程与面试指标 |
| metric-success | `#059669` | `#10b981` | Offer、完成与正向指标 |
| metric-danger | `#e11d48` | `#fb7185` | 失败、风险与流失指标 |
| metric-purple | `#4d44d6` | `#a5b4fc` | 非品牌的紫色大号指标 |

浅色模式下每个指标色在白色背景上的对比度不低于 3:1；卡片背景继续使用低饱和浅色，避免大面积高纯度颜色造成视觉疲劳。

## 4. 品牌渐变

择程AI主操作使用以下品牌渐变：

```css
--gradient-primary: linear-gradient(135deg, #facc15 0%, #fde047 100%);
--gradient-primary-hover: linear-gradient(135deg, #fbbf24 0%, #facc15 100%);
--gradient-primary-active: linear-gradient(135deg, #d97706 0%, #eab308 100%);
```

- 主按钮、品牌标识、选中开关可使用主渐变。
- 激活导航使用浅黄色背景和深色文字，不使用棕橙文字。
- 正文、标签、表格文字不得使用渐变。
- 小字号品牌链接在浅色模式使用 `primary-800`，满足可读性要求。

## 5. 文字层级

| 层级 | 字号建议 | 字重 | 颜色 |
|---|---:|---:|---|
| H1 | 36–48px | 700 | foreground |
| H2 | 30–36px | 700 | foreground |
| H3 | 24–30px | 600 | foreground |
| 大号正文 | 18px | 400 | gray-700 |
| 标准正文 | 16px | 400 | gray-700 |
| 小号正文 | 14px | 400 | muted |
| 微型文字 | 12px | 400 | faint |

择程AI采用现代系统无衬线字体，不内嵌品牌字体文件：Apple 平台优先 `-apple-system`、`BlinkMacSystemFont`、`PingFang SC`，Windows 优先 `Segoe UI`、`Microsoft YaHei`，其他平台回退到 `system-ui`、`sans-serif`。

## 6. 间距与圆角

- 基础间距单位：4px。
- 常用间距：4、8、12、16、24、32、40、48、64、80px。
- 输入框、下拉框和紧凑表单控件圆角：8px。
- 卡片圆角：12–24px。
- 所有文本按钮、图标按钮和按钮式链接统一使用胶囊形：`9999px`。
- 披露行或整行可点击容器不属于动作按钮，继续使用卡片圆角并显式标记容器形状。
- 移动端交互目标最小尺寸：44×44px。

语义圆角必须优先使用：

| Token | 值 | 用途 |
|---|---:|---|
| button | `9999px` | 文本按钮、图标按钮、按钮式链接 |
| control | `8px` | 输入框、下拉框、紧凑表单控件 |
| card | `16px` | 独立卡片与重复项 |
| panel | `24px` | 大型聚合面板与模态容器 |

### 6.1 阴影层级

层级主要由背景、描边和间距建立。确需脱离画布时，只使用下列语义阴影：

| Token | 用途 |
|---|---|
| raised | 轻微抬升的卡片或可点击统计块 |
| floating | 固定悬浮控件、托盘 |
| overlay | 模态框、对话框 |

业务组件不得直接使用 `shadow-sm`、`shadow-lg` 或 `shadow-2xl`。主页面、侧栏和普通列表不使用阴影。

## 7. 交互状态

- Hover：150–200ms，使用 hover 渐变或 gray-100 背景。
- Active：使用 active 渐变，不改变布局尺寸。
- 按钮、链接等非表单交互控件的 Focus visible：2px 品牌黄色轮廓，2px offset。
- 输入框、搜索框、文本域和下拉框聚焦时禁止阴影、光晕和发光轮廓；仅通过边框颜色变化显示焦点。
- Disabled：降低透明度，保持文字可辨识，禁止交互。
- 所有非原生控件必须提供 ARIA 状态和键盘操作。
- 只有整张卡片本身可点击或可触发操作时，卡片容器才允许显示 Hover；仅在卡片内部放置按钮或链接的静态容器不得响应 Hover，避免与内部控件争夺层级。
- 第三优先级描边按钮以 `surface` 为静止背景，并使用中性描边；hover/active 仅提高中性背景与边框强度，始终保持黑白中性，不使用品牌色。
- 选中标签、状态徽章和分段控件不属于空心按钮，可使用持续的状态背景。

### 7.1 按钮层级

- `primary`：第一优先级。每个任务区域最多一个，使用品牌渐变，承载当前区域最重要的动作。
- `secondary`：第二优先级。使用无描边的中性实底；浅色模式依次使用 gray-100 / gray-200 / gray-300 表达静止、hover 和 active，深色模式映射为逐级增强的白色透明表面。
- `tertiary`：第三优先级。使用 `surface` 白底和中性描边；hover/active 只增强中性背景与描边，不使用品牌填充，不使用阴影。
- `ghost`：用于比第三优先级更弱的熟悉或辅助操作，静止态不显示容器。
- 链接和原生按钮必须复用 `web/src/components/ui/button.tsx` 的同一 variant；页面只可覆盖尺寸，不得覆盖胶囊形状或重新拼装一套副按钮颜色。
- `outline` 不作为独立 variant；白底描边职责统一由 `tertiary` 承担。

## 8. 图标语义 Token

图标必须使用下列语义 Token，不得直接使用 HEX、HSL、Tailwind 调色板色阶或正文文字色：

| Token | 浅色模式 | 深色模式 | 用途 |
|---|---:|---:|---|
| icon-default | `#374151` | `#d1d5db` | 普通功能图标 |
| icon-muted | `#6b7280` | `#9ca3af` | 搜索、展开、文件等辅助图标 |
| icon-brand | `#ca8a04` | `#facc15` | 品牌入口、加载中、关键能力图标 |
| icon-success | `#15803d` | `#4ade80` | 成功、完成、已连接 |
| icon-warning | `#b45309` | `#fbbf24` | 警告、需要确认、部分完成 |
| icon-danger | `#b91c1c` | `#f87171` | 错误、失败、危险操作 |
| icon-info | `#1d4ed8` | `#60a5fa` | 信息、问题、说明 |
| icon-on-brand | `#111827` | `#111827` | 黄色按钮或品牌表面上的图标 |

- 图标默认继承 `currentColor`，但组件必须通过上述语义类明确角色。
- 主导航页面的一级标题图标必须复用 `PRIMARY_NAV_ITEMS` 中对应路由的图标，不得在页面内另选相似图标。从主导航下沉到业务页的入口必须复用 `CONTEXTUAL_NAV_ITEMS`，由父工作流提供入口，不在桌面与移动主菜单中重复展示。标题图标使用 `icon-brand`，作为装饰信息时设置 `aria-hidden="true"`；看板的动态 Hero 在“看板 · 日期”标识中使用同一图标。
- 功能成熟度只用于 `isFeatureEnabled()` 控制可用性，不生成或展示“新”“内测”“开发”等标签。
- 页面标题图标与 `h1` 必须放在同一 `items-center` 行，不得使用 `mt-*` 手工调整垂直位置；说明文字按图标宽度与间距对齐到标题文字。
- 一级工作流页面标题统一使用 `page-title`：`30px / 36px`、展示字体、紧凑字距和 `landing` 前景色。看板动态 Hero 与岗位、报告、任务等实体详情标题保留各自的内容层级，不套用该样式。
- 第三方公司 Logo、招聘平台 Logo 和内容图片保留其原始品牌色。
- `web/src/app/icon.svg` 等无法读取运行时 CSS 变量的静态图标，使用本文件对应 Token 的固定导出值；修改 Token 时必须同步更新。
- 状态图标颜色必须与状态语义一致，不得统一染成品牌黄色。

## 9. 可访问性

- 正文对比度至少 4.5:1。
- 大号文字与图形对象至少 3:1。
- 黄色表面默认搭配 `#111827` 或 `#1c1505`，不使用白色小字。
- 状态不能仅靠颜色区分，需同时提供文字或图标。

## 10. 实现位置

- CSS 与 Tailwind 语义 Token：`web/src/app/globals.css`
- 品牌标识：`web/src/components/co-mark.tsx`
- 浏览器图标：`web/src/app/icon.svg`
- 通用组件：`web/src/components/ui/`

新增页面或组件必须先复用这些 Token；若确需新增 Token，应先更新本文件和 `globals.css`，再编写组件。
