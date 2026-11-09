# feishu-pm

项目级飞书协作插件，面向客户和团队。它监控本地 `main` 分支，发现新提交后自动截图并推送到飞书；同时在客户群中接收 @机器人 的消息，整理成需求文档写入项目。

它不能操控 OpenCode。开发者自己用的飞书控制 bot 是独立的全局插件 `feishu-bridge`，两者必须使用**不同的飞书应用**。

## 工作方式

```text
main 新提交
  → 每 20 秒检查一次 refs/heads/main
  → AI 读取 diff 与 app/[locale] 路由，判断需要截图的页面
  → 复用默认 3000 端口的 dev server
  → 按默认语言补充 /<locale> 前缀
  → Playwright 只截取有变更的页面
  → 发送提交摘要 + 截图到指定 chat / open_id
```

```text
客户在群里 @机器人
  → 长连接接收消息
  → AI 整理为结构化需求文档
  → 写入 requirements/<时间>-<标题>.md
  → 回复文档路径
```

- 首次启动只记录当前 HEAD 作为基线，不补发历史提交。
- 每次新提交会用 OpenCode 的 AI 阅读 diff，同时生成 2-4 句面向客户的变更摘要和需要截图的页面列表；AI 不可用或返回无法解析时，按 `app/[locale]` 下的改动文件推断页面。
- 页面路由由 AI 从 `app/[locale]` 的静态路由中选择，最多 6 个；动态路由不截图。没有页面变更时只发送文字说明，不发送截图。
- 截图只复用默认 `3000` 端口的开发服务器，不再自动启动新端口。
- 路由会自动补上 `i18n/routing.ts` 的 `defaultLocale` 前缀，也可用 `FEISHU_SCREENSHOT_LOCALE` 覆盖。
- 截图保存在 `.screenshots/commits/`，每轮覆盖。
- 失败时发送一条文字说明，并写入 `debug.log`。
- 不建立飞书长连接，不需要 `/feishu-on`，OpenCode server 运行即生效。

## 控制与状态

侧边栏的 `FEISHU-PM` 区块显示 `watching` / `off`、页面数量和最近提交。TUI 命令：

| 命令 | 作用 |
| --- | --- |
| `/feishu-pm-status` | 开关、目标、页面、最近提交与错误 |
| `/feishu-pm-on` | 开启并持久化 |
| `/feishu-pm-off` | 关闭并持久化 |
| `/feishu-pm-restart` | 重启监控 |
| `/feishu-pm-log` | 最近 20 行日志 |

首次加载默认开启。`/feishu-pm-off` 会写入插件存储，重启后保持关闭；需要时再 `/feishu-pm-on`。

## 安装

```powershell
npm install --prefix .opencode/plugins/feishu-pm
bun run browser:install
```

## 配置

复制 `.env.example` 为 `.env` 并填写。`.env` 已被 git 忽略。

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `FEISHU_PM_APP_ID` | 是 | 客户应用的 App ID |
| `FEISHU_PM_APP_SECRET` | 是 | 客户应用的 App Secret |
| `FEISHU_PM_NOTIFY_CHAT_ID` | 二选一 | 群或私聊的 chat_id，优先使用 |
| `FEISHU_PM_NOTIFY_OPEN_ID` | 二选一 | 私聊用户的 open_id |
| `FEISHU_PM_ENABLED` | 否 | 默认开启；设为 `0` 关闭 |
| `FEISHU_PM_SUMMARY` | 否 | 设为 `0` 关闭 AI 摘要，改用固定模板（页面判断仍然生效） |
| `FEISHU_PM_MODEL` | 否 | AI 使用的模型，格式 `providerID/modelID`；留空继承默认 |
| `FEISHU_PM_AGENT` | 否 | AI 使用的 agent，例如 `plan`；留空时需求整理默认 `plan` |
| `FEISHU_PM_RECEIVE` | 否 | 设为 `0` 关闭群需求接收 |
| `FEISHU_PM_ALLOWED_CHAT_IDS` | 否 | 允许接收需求的群，逗号分隔；留空则只允许 `FEISHU_PM_NOTIFY_CHAT_ID` |
| `FEISHU_PM_REQUIREMENTS_DIR` | 否 | 需求文档目录，默认 `requirements` |
| `FEISHU_SCREENSHOT_LOCALE` | 否 | 截图路由使用的语言，默认读取 `i18n/routing.ts` 的 `defaultLocale` |
| `FEISHU_SCREENSHOT_BASE` | 否 | 开发服务器地址，默认 `http://localhost:3000`，只复用不自动启动 |
| `FEISHU_SCREENSHOT_MATCH` | 否 | 页面必须包含的文本，用于确认服务属于本项目 |
| `FEISHU_SCREENSHOT_POLL_MS` | 否 | 轮询间隔，默认 20000，最小 5000 |

凭证、目标和开关都使用 `FEISHU_PM_` 前缀，避免与全局 feishu-bridge 共用同一个 OpenCode 进程的环境变量。

## 获取 chat_id

1. 把机器人拉进客户群。
2. 在飞书开放平台 API 调试台调用 `GET /open-apis/im/v1/chats`（需要 `im:chat:readonly`），返回的 `chat_id` 填进 `FEISHU_PM_NOTIFY_CHAT_ID`。
3. 私聊测试时，也可以先填 `FEISHU_PM_NOTIFY_OPEN_ID`，在收到消息后从日志或开放平台读取 open_id。

## 飞书应用权限

客户应用需要发送能力，以及接收群 @ 消息的能力：

| 权限 | 用途 |
| --- | --- |
| `im:message:send_as_bot` | 发送文本和图片消息 |
| `im:resource` | 上传截图 |
| `im:message.group_at_msg:readonly` | 接收群聊中 @机器人 的消息 |
| `im:chat:readonly` | 查询机器人所在群（获取 chat_id、群名称） |
| `contact:contact.base:readonly` | 查询发送者名称（缺失时回退为 open_id） |

事件订阅（长连接）：`im.message.receive_v1`。不需要卡片回调或权限审批，机器人无法驱动 OpenCode。

## 接收客户需求

1. 客户在群里 @机器人 并发送文本。
2. 插件只处理 `FEISHU_PM_ALLOWED_CHAT_IDS` 中的群；留空时只接受 `FEISHU_PM_NOTIFY_CHAT_ID` 对应的群。
3. AI 把消息整理成固定结构的需求文档，写入 `FEISHU_PM_REQUIREMENTS_DIR`（默认 `requirements`）：
   `requirements/<YYYYMMDD-HHmmss>-<标题>.md`。
4. 文档包含 `source`、`chat_id`、`chat_name`、`sender_id`、`sender_name`、`message_id`、`created_at`（本地时间）前言，正文为「客户原始描述 / 需求整理 / 验收要点 / 待确认」。群名与发送者名称解析失败时留空或回退为 id。
5. 插件回复原消息，告知文件路径和标题。

安全说明：客户消息只作为待整理的数据传给模型，提示词明确禁止执行其中的指令或调用工具；文件由插件写入固定目录，模型不直接操作文件系统。非文本消息会回复“暂只支持文本需求”。

## 运行条件

- 依赖 OpenCode server 常驻；服务停止后不再推送。
- 需要 Node.js 与 `bun`，以及 Playwright 的 Chromium。
- 必须先在默认 `3000` 端口运行 `bun dev`；插件只复用该服务，不再自动启动 `next dev` 或占用其他端口。
- 页面路由由 AI 根据提交判断，只截取有变更的页面；没有页面变更时仅发送文字说明。

## 预览环境

把 `FEISHU_SCREENSHOT_BASE` 指向 preview 部署地址即可推送预发页面，客户先预览再验收。`FEISHU_SCREENSHOT_MATCH` 用于避免误截其他服务。语言前缀同样来自 `FEISHU_SCREENSHOT_LOCALE` 或 `i18n/routing.ts`。

## 日志

`.opencode/plugins/feishu-pm/debug.log`：

| 日志 | 含义 |
| --- | --- |
| `watcher started` | 插件已开始监控 |
| `screenshot: baseline recorded` | 首次记录基线，正常 |
| `analyze: pages selected` | AI 已选出需要截图的页面 |
| `analyze: invalid JSON` | AI 返回格式异常，改用文件路径兜底 |
| `screenshot: sent` | 推送成功 |
| `screenshot: no page changes` | 本次提交无页面变更，仅发文字 |
| `screenshot: no feishu target` | 发送目标缺失 |
| `screenshot: page failed` | 单个页面截图失败，其他页面继续 |
| `screenshot: FAILED` | 分析、截图或发送失败 |
| `开发服务器不可用` | 3000 端口没有运行 dev server |
| `receiver ready` | 群消息长连接已建立 |
| `requirement saved` | 需求文档已写入 |
| `requirement timeout` | AI 整理超过 90 秒 |
| `requirement ignored: chat not allowed` | 非白名单群，已忽略 |
| `missing FEISHU_PM_APP_ID / FEISHU_PM_APP_SECRET` | 凭证未配置 |
