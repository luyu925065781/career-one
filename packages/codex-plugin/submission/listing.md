# 择程AI公开插件提交资料

- 插件类型：Skills only
- 名称：择程AI
- 技术标识：`career-one`
- 开发者：NumberX
- 分类：Productivity
- Logo：`logo.png`（1024×1024 PNG，派生自项目现有 `web/src/app/icon.svg`）
- 官网：https://github.com/luyu925065781/career-one
- 支持：https://github.com/luyu925065781/career-one/issues
- 隐私：https://github.com/luyu925065781/career-one/blob/develop/PRIVACY.md
- 条款：https://github.com/luyu925065781/career-one/blob/develop/TERMS.md
- 可用地区：在门户中选择 OpenAI 当前支持的国家和地区；产品界面与求职语境默认面向中国大陆用户

## 简短说明

本地优先的中文 AI 求职工作台。

## 详细说明

在本地建立简历档案、评估岗位、生成定制材料、准备面试并管理投递进度。个人数据保存在用户自己的工作区，插件不托管简历，也不替用户自动提交申请。

## Starter prompts

1. 使用 $career-one 在本地建立我的中文求职工作区。
2. 使用 $career-one 评估这个岗位，并给出是否值得投递的明确建议。
3. 使用 $career-one 查看我的求职进度并建议下一步。

审核测试见 `test-cases.json`。上传前使用最终构建产物 `career-one-codex.zip`，不直接上传源码 manifest 目录。

## 初次提交说明

这是择程AI的首次公开插件提交。插件仅包含本地 Skill 和运行时，不包含 MCP 服务，不要求测试账号或凭据。它会在用户明确选择的本地目录建立工作区；简历、画像、报告和投递记录不进入插件安装目录，也不会自动发送给项目维护者。
