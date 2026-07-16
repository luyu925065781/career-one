# 择程AI设计系统

> 版本：1.0
> 上游：数字超体公司设计系统
> 实现证据优先级：已实现 UI 页面 > 设计规范文档 > 历史组件样式

公司级、跨 Agent 的机器可读设计规范见 [`DESIGN.md`](DESIGN.md)。本文件是该规范在择程AI中的产品级语义映射与实现说明；若基础 Token 冲突，以 `DESIGN.md` 为准，若择程AI组件行为和实现位置冲突，以本文件及实际代码为准。

## 1. Token 分层

设计 Token 分为两层：

1. **数字超体基础 Token**：可供公司旗下产品复用的原始色阶、字体、间距、圆角和语义色。
2. **择程AI语义 Token**：将基础 Token 映射为 `foreground`、`muted`、`brand`、`surface` 等产品角色。

组件只能使用语义 Token。不得在业务组件中硬编码新的品牌色或中性色。

## 2. 数字超体基础 Token

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

### 2.3 语义色

| Token | 色值 |
|---|---:|
| success | `#22c55e` |
| warning | `#f59e0b` |
| error | `#ef4444` |
| info | `#3b82f6` |

语义色只表达对应状态，不得用品牌黄色替代错误、成功或信息状态。

## 3. 择程AI语义映射

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

## 4. 品牌渐变

已实现的数字超体 UI 规范页面是渐变的主要证据源：

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

数字超体公司级字体规范：英文采用 SF Pro 风格，中文采用思源黑体。择程AI作为具体产品使用系统自带 UI 字体，不内嵌品牌字体文件：Apple 平台优先 `-apple-system`、`BlinkMacSystemFont`、`PingFang SC`，Windows 优先 `Segoe UI`、`Microsoft YaHei`，其他平台回退到 `system-ui`、`sans-serif`。

## 6. 间距与圆角

- 基础间距单位：4px。
- 常用间距：4、8、12、16、24、32、40、48、64、80px。
- 默认按钮与输入框圆角：8px。
- 卡片圆角：12–24px。
- 胶囊按钮：`9999px`。
- 移动端交互目标最小尺寸：44×44px。

## 7. 交互状态

- Hover：150–200ms，使用 hover 渐变或 gray-100 背景。
- Active：使用 active 渐变，不改变布局尺寸。
- 按钮、链接等非表单交互控件的 Focus visible：2px 品牌黄色轮廓，2px offset。
- 输入框、搜索框、文本域和下拉框聚焦时禁止阴影、光晕和发光轮廓；仅通过边框颜色变化显示焦点。
- Disabled：降低透明度，保持文字可辨识，禁止交互。
- 所有非原生控件必须提供 ARIA 状态和键盘操作。
- 空心按钮使用半透明中性色背景：浅色模式叠加半透明黑色，深色模式叠加半透明白色；hover/active 仅提高背景与边框的不透明度，始终保持黑白中性，不使用品牌色。
- 选中标签、状态徽章和分段控件不属于空心按钮，可使用持续的状态背景。

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
