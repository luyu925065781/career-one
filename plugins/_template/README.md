# {{NAME}}：career-one 插件

这是一个面向 [career-one](https://github.com/luyu925065781/career-one) 的社区插件。

## 功能

TODO：用一段话说明插件功能。

## 安装

```bash
# 插件进入 career-one 注册表后：
node career-one.mjs plugins add {{NAME}}

# 进入注册表前，可从仓库的固定提交直接安装：
node career-one.mjs plugins add <your-github-user>/career-one-plugin-{{NAME}} --sha <40-hex-commit>
```

随后启用插件并明确授权：

```bash
node career-one.mjs plugins enable {{NAME}}            # 显示能力卡片
node career-one.mjs plugins enable {{NAME}} --confirm  # 授予权限
```

## 配置

- 密钥写入你自己的 `.env`；变量名在 `manifest.json` 的 `requiredEnv` 中声明。
- 非敏感选项写入 `config/plugins.yml` 的 `plugins.{{NAME}}` 下。

## 申请进入批准列表

向 career-one 提交注册表 PR，具体要求见 [docs/PLUGINS.md](https://github.com/luyu925065781/career-one/blob/main/docs/PLUGINS.md)。

## 许可证

MIT
