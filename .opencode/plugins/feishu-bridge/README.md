# feishu-bridge (M0)

M0 只验证一件事：`@larksuiteoapi/node-sdk` 能否在 OpenCode 的 Bun 运行时里加载、建立飞书 WebSocket 长连接、收发消息。收到文本后原样回显，不接 OpenCode session。

## 1. 填凭证

编辑本目录 `.env`：

```
FEISHU_APP_ID=cli_xxxxxxxx
FEISHU_APP_SECRET=xxxxxxxx
FEISHU_ALLOWED_OPEN_ID=
FEISHU_DOMAIN=feishu
```

- `.env` 已被 git 忽略，不会提交。
- `FEISHU_ALLOWED_OPEN_ID` 留空表示不限制；发一条消息后 `debug.log` 会打印你的 `open_id`，再填进来。
- 凭证也可用系统环境变量提供，优先级高于 `.env`。

## 2. 飞书后台配置

1. 开放平台创建「企业自建应用」，添加「机器人」能力。
2. 权限：`im:message`、`im:message.p2p_msg:readonly`、`im:message.group_at_msg:readonly`、`im:message:send_as_bot`、`im:resource`。
3. 事件与回调 → 订阅方式选「长连接」→ 添加事件 `im.message.receive_v1`。
4. 创建版本并发布（不发布不生效）。

## 3. 依赖

已安装到本目录 `node_modules/`（不进 git）。重装：

```powershell
npm install --prefix .opencode/plugins/feishu-bridge
```

## 4. 加载

`.opencode/plugins/` 下的目录会被自动发现。改动后如果没生效：

```powershell
opencode service restart
```

## 5. 验证

1. 看 `debug.log`，应依次出现 `sdk import ok`、`websocket ready`。
2. 私聊机器人发 `/ping`，应回 `pong` 和 bun 版本。
3. 发任意文本，应回 `M0 echo (...)`。
4. 在 OpenCode 里调用工具 `feishu_bridge_status` 查看连接状态。

## 排错

| debug.log | 含义 |
|---|---|
| `missing FEISHU_APP_ID` | `.env` 没填或没被读到 |
| `sdk import FAILED` | SDK 与 Bun 不兼容，M0 失败，需换裸 `ws` 方案 |
| `websocket FAILED` | 凭证错误、应用未发布、未开长连接、网络出站被拦 |
| 有 `websocket ready` 但收不到消息 | 事件订阅没配 `im.message.receive_v1`，或应用版本未发布 |
