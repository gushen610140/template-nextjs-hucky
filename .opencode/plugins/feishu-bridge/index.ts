import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Plugin } from "@opencode/plugin";

/**
 * feishu-bridge M0
 *
 * 目标：只验证 @larksuiteoapi/node-sdk 能否在 OpenCode 的 Bun 运行时里
 * 加载并建立飞书 WebSocket 长连接，收到消息后原样回显。
 *
 * 不做：OpenCode session、流式卡片、权限、命令路由。
 * 日志：本目录 debug.log（同时输出到 opencode 日志）。
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = join(HERE, "debug.log");
const ENV_FILE = join(HERE, ".env");
const GLOBAL_KEY = "__hucky_feishu_bridge__";

type BridgeState = {
  started: boolean;
  sdkLoaded: boolean;
  wsState: "idle" | "starting" | "connected" | "failed";
  lastError?: string;
  lastEventAt?: string;
  messageCount: number;
  ws?: {
    close?: (params?: { force?: boolean }) => void;
    getConnectionStatus?: () => unknown;
  };
};

type FeishuMessageEvent = {
  sender?: { sender_id?: { open_id?: string } };
  message?: {
    message_id?: string;
    chat_id?: string;
    chat_type?: string;
    message_type?: string;
    content?: string;
  };
};

function log(message: string, extra?: unknown) {
  let detail = "";
  if (extra !== undefined) {
    if (extra instanceof Error) {
      detail = ` ${extra.name}: ${extra.message}\n${extra.stack ?? ""}`;
    } else {
      try {
        detail = ` ${JSON.stringify(extra)}`;
      } catch {
        detail = ` ${String(extra)}`;
      }
    }
  }
  const line = `[${new Date().toISOString()}] ${message}${detail}`;
  try {
    appendFileSync(LOG_FILE, `${line}\n`);
  } catch {
    // 日志失败不影响主流程
  }
  console.log(`[feishu-bridge] ${line}`);
}

function loadEnvFile() {
  if (!existsSync(ENV_FILE)) return;
  const content = readFileSync(ENV_FILE, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

function getState(): BridgeState {
  const holder = globalThis as Record<string, unknown>;
  if (!holder[GLOBAL_KEY]) {
    holder[GLOBAL_KEY] = {
      started: false,
      sdkLoaded: false,
      wsState: "idle",
      messageCount: 0,
    } satisfies BridgeState;
  }
  return holder[GLOBAL_KEY] as BridgeState;
}

function stripMentions(text: string) {
  return text.replace(/@_user_\d+/g, "").trim();
}

function runtimeInfo() {
  return `bun=${process.versions.bun ?? "n/a"} node=${process.version} platform=${process.platform}`;
}

export default Plugin.define({
  id: "hucky.feishu-bridge",

  async setup(ctx) {
    loadEnvFile();

    const state = getState();
    log("setup start", {
      opencode: ctx.app.version,
      directory: ctx.location.directory,
      runtime: runtimeInfo(),
    });

    if (state.started) {
      log("already started in this process, skip duplicate instance");
      return;
    }

    await ctx.tool.transform((editor) => {
      editor.add({
        name: "feishu_bridge_status",
        description: "查看飞书桥接 M0 的运行状态（SDK、长连接、最近事件）",
        input: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: async () => ({
          content: JSON.stringify(
            {
              sdkLoaded: state.sdkLoaded,
              wsState: state.wsState,
              wsConnection: state.ws?.getConnectionStatus?.() ?? null,
              lastError: state.lastError ?? null,
              lastEventAt: state.lastEventAt ?? null,
              messageCount: state.messageCount,
              runtime: runtimeInfo(),
            },
            null,
            2,
          ),
        }),
      });
    });

    const appId = process.env.FEISHU_APP_ID?.trim();
    const appSecret = process.env.FEISHU_APP_SECRET?.trim();

    let Lark: typeof import("@larksuiteoapi/node-sdk");
    try {
      Lark = await import("@larksuiteoapi/node-sdk");
      state.sdkLoaded = true;
      log("sdk import ok", { exports: Object.keys(Lark).length });
    } catch (error) {
      state.lastError = error instanceof Error ? error.message : String(error);
      log("sdk import FAILED", error);
      return;
    }

    if (!appId || !appSecret) {
      log("missing FEISHU_APP_ID / FEISHU_APP_SECRET, fill .env and restart");
      return;
    }

    const allowed = (process.env.FEISHU_ALLOWED_OPEN_ID ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (allowed.length === 0) {
      log("WARN FEISHU_ALLOWED_OPEN_ID empty, every user can drive this bot");
    }

    const client = new Lark.Client({ appId, appSecret });

    const dispatcher = new Lark.EventDispatcher({}).register({
      "im.message.receive_v1": async (data: FeishuMessageEvent) => {
        state.lastEventAt = new Date().toISOString();
        state.messageCount += 1;

        const message = data.message;
        const messageId = message?.message_id;
        const openId = data.sender?.sender_id?.open_id;
        const messageType = message?.message_type ?? "unknown";

        log("message received", {
          messageId,
          chatId: message?.chat_id,
          chatType: message?.chat_type,
          messageType,
          openId,
        });

        if (!messageId) return;

        if (allowed.length > 0 && (!openId || !allowed.includes(openId))) {
          log("blocked by allowlist", { openId });
          await client.im.message.reply({
            path: { message_id: messageId },
            data: {
              msg_type: "text",
              content: JSON.stringify({
                text: `未授权：open_id=${openId ?? "unknown"}`,
              }),
            },
          });
          return;
        }

        if (messageType !== "text") {
          await client.im.message.reply({
            path: { message_id: messageId },
            data: {
              msg_type: "text",
              content: JSON.stringify({
                text: `M0 收到 ${messageType}，暂只回显文本。open_id=${openId ?? "unknown"}`,
              }),
            },
          });
          return;
        }

        let text = "";
        try {
          text = stripMentions(
            String(JSON.parse(message?.content ?? "{}").text ?? ""),
          );
        } catch (error) {
          log("parse content failed", error);
        }

        if (text === "/ping") {
          await client.im.message.reply({
            path: { message_id: messageId },
            data: {
              msg_type: "text",
              content: JSON.stringify({
                text: `pong\n${runtimeInfo()}\nws=${state.wsState} events=${state.messageCount}`,
              }),
            },
          });
          return;
        }

        await client.im.message.reply({
          path: { message_id: messageId },
          data: {
            msg_type: "text",
            content: JSON.stringify({
              text: `M0 echo (${runtimeInfo()}): ${text}`,
            }),
          },
        });
      },
    });

    await ctx.tool.transform((editor) => {
      editor.add({
        name: "feishu_bridge_status",
        description: "查看飞书桥接 M0 的运行状态（SDK、长连接、最近事件）",
        input: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: async () => ({
          content: JSON.stringify(
            {
              sdkLoaded: state.sdkLoaded,
              wsState: state.wsState,
              wsConnection: state.ws?.getConnectionStatus?.() ?? null,
              lastError: state.lastError ?? null,
              lastEventAt: state.lastEventAt ?? null,
              messageCount: state.messageCount,
              runtime: runtimeInfo(),
            },
            null,
            2,
          ),
        }),
      });
    });

    const wsClient = new Lark.WSClient({
      appId,
      appSecret,
      loggerLevel: Lark.LoggerLevel.info,
      onReady: () => {
        state.wsState = "connected";
        log("websocket ready, waiting for messages");
      },
      onReconnecting: () => {
        state.wsState = "starting";
        log("websocket reconnecting");
      },
      onReconnected: () => {
        state.wsState = "connected";
        log("websocket reconnected");
      },
      onError: (error: Error) => {
        state.wsState = "failed";
        state.lastError = error.message;
        log("websocket FAILED", error);
      },
    });
    state.ws = wsClient as unknown as BridgeState["ws"];
    state.started = true;
    state.wsState = "starting";

    void wsClient
      .start({ eventDispatcher: dispatcher })
      .then(() => {
        state.wsState = "connected";
        log("websocket start resolved");
      })
      .catch((error: unknown) => {
        state.wsState = "failed";
        state.lastError = error instanceof Error ? error.message : String(error);
        log("websocket start rejected", error);
      });

    return () => {
      log("cleanup");
      try {
        state.ws?.close?.({ force: true });
      } catch (error) {
        log("cleanup close failed", error);
      }
      state.started = false;
      state.wsState = "idle";
      state.ws = undefined;
    };
  },
});
