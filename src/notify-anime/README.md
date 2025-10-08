本目录包含用于通知动漫的 RSS 列表和相关 schema。

为了让 VSCode 对 `rss-list.json` 提供语法提示和校验，仓库已包含：

- `rss-list.schema.json`：JSON Schema（draft-07），定义每个 RSS 条目的字段和校验规则。
- `.vscode/settings.json`：将上面的 schema 关联到 `src/notify-anime/rss-list.json`，打开该文件时 VSCode 会自动应用校验和补全。

如果你修改了 schema 或移动了文件，请确保 `.vscode/settings.json` 中的 `fileMatch` 路径或 `url` 被正确更新。
