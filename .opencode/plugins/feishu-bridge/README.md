# feishu-bridge

飞书机器人 ↔ OpenCode。当前阶段 M1.5：文本对话 + 会话映射 + TUI 控制命令 + 侧边栏状态。

## 1. 凭证

编辑本目录 `.env`：

```
FEISHU_APP_ID=cli_xxxxxxxx
FEISHU_APP_SECRET=xxxxxxxx
FEISHU_ALLOWED_OPEN_ID=ou_xxxxxxxx
FEISHU_DOMAIN=feishu
```

- `.env` 已被 git 忽略。
- `FEISHU_ALLOWED_OPEN_ID` 支持逗号分隔多个；留空则不限制（日志会告警）。
- 系统环境变量优先级高于 `.env`。

## 2. 飞书后台

1. 创建「企业自建应用」，添加「机器人」能力。
2. 权限：`im:message`、`im:message.p2p_msg:readonly`、`im:message.group_at_msg:readonly`、`im:message:send_as_bot`、`im:resource`。
3. 事件与回调 → 长连接 → 订阅 `im.message.receive_v1`。
4. 创建版本并发布。

## 3. 依赖

```powershell
npm install --prefix .opencode/plugins/feishu-bridge
```

## 4. 侧边栏

`sidebar.content` 追加一个区块，与 `git-status` 的区块并存：

```
FEISHU
connected
idle · 4 events
```

数据通过 plugin RPC `hucky.feishu-bridge.status` 每 1.5s 拉取，不走日志解析。TUI 部分改动后需要重启 OpenCode TUI 才会加载。

## 5. OpenCode 控制命令

在 TUI 里输入：

| 命令 | 作用 |
|---|---|
| `/feishu-status` | 连接状态、事件数、忙碌会话、最近错误 |
| `/feishu-on` | 开启长连接，并持久化 |
| `/feishu-off` | 关闭长连接，并持久化 |
| `/feishu-restart` | 断开重连 |
| `/feishu-log` | 最近 20 行日志 |

开启/关闭状态存在 `ctx.storage` 的 `bridge/enabled`，插件重载或 OpenCode 重启后保持。

也可以在 `opencode.jsonc` 的 `plugins` 里用 `-hucky.feishu-bridge` 彻底停用插件。

## 6. 飞书侧命令

| 命令 | 作用 |
|---|---|
| `/new` | 新建会话 |
| `/stop` | 中断当前任务 |
| `/status` | 会话 ID、忙碌状态、连接状态 |
| `/help` | 帮助 |

## 7. 验证

1. `debug.log` 出现 `websocket ready`。
2. TUI 执行 `/feishu-status`。
3. 飞书私聊发消息，应回「收到，处理中…」，随后回最终答案。

## 排错

| debug.log | 含义 |
|---|---|
| `missing FEISHU_APP_ID` | `.env` 没填或没读到 |
| `sdk import FAILED` | SDK 与 Bun 不兼容 |
| `websocket FAILED` | 凭证错误、应用未发布、未开长连接、出站被拦 |
| `prompt FAILED` | OpenCode 侧报错，看同一行后面的 message |
| `rpc register FAILED` | RPC 契约或注册参数有问题 |
| 有 `websocket ready` 但无 `message received` | 事件订阅没配或应用未发布 |
