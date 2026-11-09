# feishu-pm

项目级飞书变更推送插件，面向客户和团队。它监控本地 `main` 分支，发现新提交后自动截图并推送到飞书，帮助客户了解最近更新了什么。

它只发送消息，不接收命令，也不能操控 OpenCode。开发者自己用的飞书控制 bot 是独立的全局插件 `feishu-bridge`，两者必须使用**不同的飞书应用**。

## 工作方式

```text
main 新提交
  → 每 20 秒检查一次 refs/heads/main
  → 复用或启动 dev server
  → Playwright 截取配置页面
  → 发送提交摘要 + 截图到指定 chat / open_id
```

- 首次启动只记录当前 HEAD 作为基线，不补发历史提交。
- 截图保存在 `.screenshots/commits/`，每轮覆盖。
- 失败时发送一条文字说明，并写入 `debug.log`。
- 不建立飞书长连接，不需要 `/feishu-on`，OpenCode server 运行即生效。

## 安装

```powershell
npm install --prefix .opencode/plugins/feishu-pm
bun run browser:install
```

## 配置

复制 `.env.example` 为 `.env` 并填写。`.env` 已被 git 忽略。

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `FEISHU_APP_ID` | 是 | 客户应用的 App ID |
| `FEISHU_APP_SECRET` | 是 | 客户应用的 App Secret |
| `FEISHU_NOTIFY_CHAT_ID` | 二选一 | 群或私聊的 chat_id，优先使用 |
| `FEISHU_NOTIFY_OPEN_ID` | 二选一 | 私聊用户的 open_id |
| `FEISHU_PM_ENABLED` | 否 | 设为 `0` 关闭推送 |
| `FEISHU_SCREENSHOT_PAGES` | 否 | 截图页面，默认 `/`、`/docs`、`/login` |
| `FEISHU_SCREENSHOT_BASE` | 否 | 开发或预览地址，默认 `http://localhost:3000` |
| `FEISHU_SCREENSHOT_MATCH` | 否 | 页面必须包含的文本，用于确认服务属于本项目 |
| `FEISHU_SCREENSHOT_POLL_MS` | 否 | 轮询间隔，默认 20000，最小 5000 |

### 获取 chat_id

1. 把机器人拉进客户群。
2. 在飞书开放平台 API 调试台调用 `GET /open-apis/im/v1/chats`（需要 `im:chat:readonly`），返回的 `chat_id` 填进 `FEISHU_NOTIFY_CHAT_ID`。
3. 私聊测试时，也可以先填 `FEISHU_NOTIFY_OPEN_ID`，在收到消息后从日志或开放平台读取 open_id。

## 飞书应用权限

客户应用只需要发送能力：

| 权限 | 用途 |
| --- | --- |
| `im:message:send_as_bot` | 发送文本和图片消息 |
| `im:resource` | 上传截图 |

不需要 `im.message.receive_v1`、卡片回调或权限审批。这样即使凭证泄露，也无法通过机器人驱动 OpenCode。

## 运行条件

- 依赖 OpenCode server 常驻；服务停止后不再推送。
- 需要 Node.js 与 `bun`，以及 Playwright 的 Chromium。
- dev server 处理：`FEISHU_SCREENSHOT_BASE` 可访问时复用；否则尝试相邻端口；最后自动启动 `next dev`，截完关闭。
- `next dev` 同一项目只允许一个实例，已有实例在别的端口时请指向它。

## 预览环境

把 `FEISHU_SCREENSHOT_BASE` 指向 preview 部署地址即可推送预发页面，客户先预览再验收。`FEISHU_SCREENSHOT_MATCH` 用于避免误截其他服务。

## 日志

`.opencode/plugins/feishu-pm/debug.log`：

| 日志 | 含义 |
| --- | --- |
| `watcher started` | 插件已开始监控 |
| `screenshot: baseline recorded` | 首次记录基线，正常 |
| `screenshot: sent` | 推送成功 |
| `screenshot: no feishu target` | 发送目标缺失 |
| `screenshot: FAILED` | 截图或发送失败 |
| `dev server 启动失败` | 已有 `next dev` 实例或端口冲突 |
| `missing FEISHU_APP_ID / FEISHU_APP_SECRET` | 凭证未配置 |
