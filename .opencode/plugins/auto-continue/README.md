# auto-continue（自动续跑）

OpenCode 插件：在**开启了的会话**里，每当一轮对话正常结束，就自动向该会话发送一条续跑提示，让 Agent 继续校验、测试和修复，直到用户主动中断。

项目级插件放在 `.opencode/plugins/auto-continue/`，OpenCode 会自动加载，不需要改 `opencode.jsonc`。

> 如果全局 `~/.config/opencode/plugins/auto-continue/` 仍然存在，建议删除或移走，避免项目级和全局两份同名插件同时生效。

> 默认**关闭**：新会话不会自动续跑，需要时在当前会话里输入 `/auto-on` 打开。

## 位置

```text
.opencode/plugins/auto-continue/
├── index.ts        # 插件本体
├── settings.json   # 配置（可改）
└── README.md
```

改动 `index.ts` 后会自动热重载；改 `settings.json` 后需要重启 OpenCode，或随便改一下 `index.ts` 触发重载。

## 设计变化

这个版本**彻底移除了 `[[DONE]]` 标记机制**。

旧行为是让模型在任务完成后输出 `[[DONE]]`，插件看到标记就停止续跑。现在不再判断任务是否完成，而是：

1. 一轮正常结束后继续发送续跑提示。
2. 提示要求 Agent 即使认为目标已经完成，也要继续做全面校验和测试。
3. 发现小问题就修复，然后重新校验。
4. 一直循环，直到用户发送中断提示词，或按 `Esc` / `Ctrl+C` 中断。

因此不要再在提示词里要求模型输出 `[[DONE]]`，这个标记现在没有任何特殊含义。

## 开关：按会话控制

| 命令 | 作用 |
| --- | --- |
| `/auto-on` | 打开**当前会话**的自动续跑 |
| `/auto-off` | 关闭**当前会话**的自动续跑 |

- 命令是静默的，不会往对话里插消息，也不会触发一轮执行。
- 开关状态按会话记录，重启 OpenCode 后仍然保留。
- 关闭时会立刻取消还没发出去的续跑提示。

## 中断

以下任一方式都会停止当前会话的自动续跑：

- 按 `Esc` 或 `Ctrl+C` 中断当前执行。
- 发送明确的中断提示词，例如 `停止`、`中断`、`暂停`、`取消`、`不用继续`、`stop`、`pause`。
- 执行 `/auto-off`。

中断后，再发送一条普通消息即可恢复自动续跑。

## 行为

| 场景 | 结果 |
| --- | --- |
| 会话没开启（默认） | 什么都不做 |
| 一轮正常结束（已开启） | 等待 `delayMs` 后发送续跑提示 |
| Agent 说任务完成 | 仍然继续校验、测试和修复 |
| 你按 `Esc` / `Ctrl+C` 中断 | 该会话停止自动续跑，直到你重新发一条普通消息 |
| 你发送中断提示词 | 该会话停止自动续跑，直到你重新发一条普通消息 |
| 本轮执行失败 | 默认停止（不重试，避免错误循环） |
| 子会话（subagent） | 跳过，不会被打断 |
| 你在等待期内自己发了消息 | 取消这次自动发送，并重置计数 |

**想停下来**：按 `Esc` 打断当前这一轮，发送中断提示词，或输入 `/auto-off`。

## 配置 `settings.json`

```jsonc
{
  "enabled": false,         // 新会话是否默认开启；false = 需要手动 /auto-on
  "text": "继续。如果目标已经完成，不要结束任务：继续运行 lint、类型检查、测试和构建，主动找出所有小问题并修复，然后重新校验。重复这个过程，直到用户明确要求停止。",
  "delayMs": 800,           // 一轮结束后等待多久再发（毫秒）
  "maxRounds": 0,           // 最多连续自动续跑几轮，0 = 不限制
  "continueOnError": false, // 本轮失败时是否也继续
  "debug": false            // 写调试日志
}
```

`enabled` 只决定“没有单独设置过的会话”的默认状态；用 `/auto-on`、`/auto-off` 设置过的会话以命令为准。

`maxRounds` 的计数会在你发新消息时清零，所以它限制的是“同一次任务里连续自动续跑的次数”。默认 `0` 表示不限制，请配合中断使用。

## 调试

把 `debug` 设为 `true` 后，日志写到：

```text
%TEMP%\opencode\auto-continue-debug.log
```

（Windows 下一般是 `C:\Users\<你>\AppData\Local\Temp\opencode\auto-continue-debug.log`）

## 原理

订阅 OpenCode 的公共事件流，根据会话执行事件驱动：

- `session.execution.succeeded` → 一轮正常结束 → 若该会话已开启，发送续跑提示
- `session.execution.failed` → 失败 → 默认停止
- `session.execution.interrupted` → 被中断 → 停止，直到下一条普通消息
- `session.deleted` → 清理状态

用户提示词通过 `ctx.session.hook("prompt")` 监听：普通消息会重置计数并恢复续跑，中断提示词会把会话标记为 stopped。

会话开关通过 `ctx.command.transform` 注册的 `/auto-on`、`/auto-off` 命令写入插件存储（`ctx.storage`）。

注意：这个版本面向 OpenCode V2 的公共事件流，使用 `session.execution.*` 系列事件，不依赖 `session.text.ended` 或 `[[DONE]]` 标记。

## 卸载

删除 `.opencode/plugins/auto-continue/` 目录，然后重启 OpenCode。
