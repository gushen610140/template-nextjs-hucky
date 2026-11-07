import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Plugin } from "@opencode/plugin";

/**
 * feishu-bridge M1.5
 *
 * 飞书文本 <-> OpenCode session。
 * 控制面注入 OpenCode 命令：
 *   /feishu-status  查看连接与状态
 *   /feishu-on      开启长连接（持久化）
 *   /feishu-off     关闭长连接（持久化）
 *   /feishu-restart 重连
 *   /feishu-log     看最近日志
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = join(HERE, "debug.log");
const ENV_FILE = join(HERE, ".env");
const GLOBAL_KEY = "__hucky_feishu_bridge__";
const ENABLED_KEY = "bridge/enabled";
const MAX_CHUNK = 3500;
const DEDUPE_TTL = 10 * 60 * 1000;

type BridgeState = {
  started: boolean;
  sdkLoaded: boolean;
  enabled: boolean;
  wsState: "idle" | "starting" | "connected" | "failed";
  lastError?: string;
  lastEventAt?: string;
  messageCount: number;
  busyChats: string[];
  controller?: {
    start: () => Promise<void>;
    stop: () => void;
  };
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

type StoredChat = { sessionID: string; createdAt: string };

type AnyMessage = {
  type?: string;
  text?: string;
  content?: Array<{ type?: string; text?: string }>;
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
  const existing = holder[GLOBAL_KEY] as Partial<BridgeState> | undefined;
  const state: BridgeState = {
    started: false,
    sdkLoaded: false,
    enabled: true,
    wsState: "idle",
    messageCount: 0,
    busyChats: [],
    ...existing,
  };
  // 热重载时旧 state 可能缺字段，补默认值
  state.busyChats = Array.isArray(state.busyChats) ? state.busyChats : [];
  holder[GLOBAL_KEY] = state;
  return state;
}

function stripMentions(text: string) {
  return text.replace(/@_user_\d+/g, "").trim();
}

function runtimeInfo() {
  return `bun=${process.versions.bun ?? "n/a"} node=${process.version} platform=${process.platform}`;
}

function splitText(text: string) {
  if (text.length <= MAX_CHUNK) return [text];
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += MAX_CHUNK) {
    chunks.push(text.slice(index, index + MAX_CHUNK));
  }
  return chunks;
}

function readLogTail(count: number) {
  if (!existsSync(LOG_FILE)) return "（暂无日志）";
  const lines = readFileSync(LOG_FILE, "utf8").split(/\r?\n/).filter(Boolean);
  return lines.slice(-count).join("\n");
}

/** 取本轮用户消息之后所有 assistant 文本，按顺序拼接。 */
function extractAnswer(messages: readonly AnyMessage[], promptText: string) {
  let start = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.type === "user" && message?.text === promptText) {
      start = index;
      break;
    }
  }
  const slice = start >= 0 ? messages.slice(start + 1) : messages;
  const parts: string[] = [];
  for (const message of slice) {
    if (message?.type !== "assistant") continue;
    for (const part of message.content ?? []) {
      if (part?.type === "text" && part.text) parts.push(part.text);
    }
  }
  return parts.join("\n").trim();
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

    const say = async (sessionID: string, text: string) => {
      await ctx.session.synthetic({ sessionID, text });
    };

    await ctx.tool.transform((editor) => {
      editor.add({
        name: "feishu_bridge_status",
        description: "查看飞书桥接的运行状态（SDK、长连接、忙碌会话、最近事件）",
        input: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: async () => ({
          content: JSON.stringify(
            {
              sdkLoaded: state.sdkLoaded,
              enabled: state.enabled,
              wsState: state.wsState,
              wsConnection: state.ws?.getConnectionStatus?.() ?? null,
              busyChats: state.busyChats,
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

    const statusText = () => {
      const connection = state.ws?.getConnectionStatus?.() as
        | { state?: string; reconnectAttempts?: number }
        | undefined;
      return [
        `enabled: ${state.enabled}`,
        `ws: ${connection?.state ?? state.wsState}`,
        `reconnect: ${connection?.reconnectAttempts ?? 0}`,
        `events: ${state.messageCount}`,
        `busy: ${state.busyChats.length > 0 ? state.busyChats.join(",") : "-"}`,
        `lastEvent: ${state.lastEventAt ?? "-"}`,
        `lastError: ${state.lastError ?? "-"}`,
        `runtime: ${runtimeInfo()}`,
      ].join("\n");
    };

    await ctx.command.transform((editor) => {
      editor.add({
        name: "feishu-status",
        description: "查看飞书桥接状态",
        execute: async ({ sessionID }) => {
          await say(sessionID, `[feishu]\n${statusText()}`);
        },
      });
      editor.add({
        name: "feishu-on",
        description: "开启飞书长连接",
        execute: async ({ sessionID }) => {
          if (!state.controller) {
            await say(sessionID, "[feishu] 未配置凭证，先填 .env 再重启");
            return;
          }
          await ctx.storage.set(ENABLED_KEY, true);
          state.enabled = true;
          await state.controller.start();
          await say(sessionID, `[feishu] 已开启\n${statusText()}`);
        },
      });
      editor.add({
        name: "feishu-off",
        description: "关闭飞书长连接",
        execute: async ({ sessionID }) => {
          await ctx.storage.set(ENABLED_KEY, false);
          state.enabled = false;
          state.controller?.stop();
          await say(sessionID, "[feishu] 已关闭");
        },
      });
      editor.add({
        name: "feishu-restart",
        description: "重连飞书长连接",
        execute: async ({ sessionID }) => {
          if (!state.controller) {
            await say(sessionID, "[feishu] 未配置凭证，先填 .env 再重启");
            return;
          }
          await ctx.storage.set(ENABLED_KEY, true);
          state.enabled = true;
          state.controller.stop();
          await state.controller.start();
          await say(sessionID, `[feishu] 已重连\n${statusText()}`);
        },
      });
      editor.add({
        name: "feishu-log",
        description: "查看飞书桥接最近日志",
        execute: async ({ sessionID }) => {
          await say(sessionID, `[feishu] 最近日志\n${readLogTail(20)}`);
        },
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
    const seen = new Map<string, number>();

    const sendText = async (messageId: string, text: string) => {
      for (const chunk of splitText(text)) {
        await client.im.message.reply({
          path: { message_id: messageId },
          data: {
            msg_type: "text",
            content: JSON.stringify({ text: chunk }),
          },
        });
      }
    };

    const getOrCreateSession = async (chatId: string) => {
      const key = `chat/${chatId}`;
      const stored = (await ctx.storage.get(key)) as StoredChat | undefined;
      if (stored?.sessionID) {
        try {
          await ctx.session.get({ sessionID: stored.sessionID });
          return stored.sessionID;
        } catch {
          log("stored session missing, recreate", { chatId, sessionID: stored.sessionID });
        }
      }
      const created = await ctx.session.create({ title: `飞书 ${chatId.slice(-6)}` });
      await ctx.storage.set(key, {
        sessionID: created.id,
        createdAt: new Date().toISOString(),
      } satisfies StoredChat);
      log("session created", { chatId, sessionID: created.id });
      return created.id;
    };

    const newSession = async (chatId: string) => {
      const created = await ctx.session.create({ title: `飞书 ${chatId.slice(-6)}` });
      await ctx.storage.set(`chat/${chatId}`, {
        sessionID: created.id,
        createdAt: new Date().toISOString(),
      } satisfies StoredChat);
      log("session created (manual)", { chatId, sessionID: created.id });
      return created.id;
    };

    const handleCommand = async (chatId: string, messageId: string, text: string) => {
      if (text === "/help") {
        await sendText(
          messageId,
          ["可用命令：", "/new 新建会话", "/stop 中断当前任务", "/status 查看会话状态", "/help 帮助"].join("\n"),
        );
        return true;
      }

      if (text === "/new") {
        const sessionID = await newSession(chatId);
        await sendText(messageId, `已新建会话\n${sessionID}`);
        return true;
      }

      if (text === "/status") {
        const stored = (await ctx.storage.get(`chat/${chatId}`)) as StoredChat | undefined;
        await sendText(
          messageId,
          [
            `session: ${stored?.sessionID ?? "未创建"}`,
            `busy: ${state.busyChats.includes(chatId)}`,
            `ws: ${state.wsState}`,
            `events: ${state.messageCount}`,
          ].join("\n"),
        );
        return true;
      }

      if (text === "/stop") {
        const stored = (await ctx.storage.get(`chat/${chatId}`)) as StoredChat | undefined;
        if (!stored?.sessionID) {
          await sendText(messageId, "当前没有会话");
          return true;
        }
        await ctx.session.interrupt({ sessionID: stored.sessionID, resume: false });
        await sendText(messageId, "已中断");
        return true;
      }

      return false;
    };

    const handlePrompt = async (chatId: string, messageId: string, text: string) => {
      if (state.busyChats.includes(chatId)) {
        await sendText(messageId, "上一条还在处理中，稍等或发 /stop 中断");
        return;
      }

      state.busyChats.push(chatId);
      try {
        const sessionID = await getOrCreateSession(chatId);
        await sendText(messageId, "收到，处理中…");

        const started = Date.now();
        await ctx.session.prompt({ sessionID, text });
        await ctx.session.wait({ sessionID });

        const messages = (await ctx.session.context({ sessionID })) as AnyMessage[];
        const answer = extractAnswer(messages, text);
        log("prompt done", { chatId, sessionID, ms: Date.now() - started, chars: answer.length });

        await sendText(messageId, answer.length > 0 ? answer : "（本轮没有返回文本）");
      } catch (error) {
        log("prompt FAILED", error);
        const message = error instanceof Error ? error.message : String(error);
        await sendText(messageId, `出错：${message}`);
      } finally {
        state.busyChats = state.busyChats.filter((item) => item !== chatId);
      }
    };

    const dispatcher = new Lark.EventDispatcher({}).register({
      "im.message.receive_v1": async (data: FeishuMessageEvent) => {
        state.lastEventAt = new Date().toISOString();
        state.messageCount += 1;

        const message = data.message;
        const messageId = message?.message_id;
        const chatId = message?.chat_id;
        const openId = data.sender?.sender_id?.open_id;
        const messageType = message?.message_type ?? "unknown";

        log("message received", {
          messageId,
          chatId,
          chatType: message?.chat_type,
          messageType,
          openId,
        });

        if (!messageId || !chatId) return;

        const now = Date.now();
        for (const [id, at] of seen) {
          if (now - at > DEDUPE_TTL) seen.delete(id);
        }
        if (seen.has(messageId)) {
          log("duplicate message ignored", { messageId });
          return;
        }
        seen.set(messageId, now);

        if (allowed.length > 0 && (!openId || !allowed.includes(openId))) {
          log("blocked by allowlist", { openId });
          await sendText(messageId, `未授权：open_id=${openId ?? "unknown"}`);
          return;
        }

        if (messageType !== "text") {
          await sendText(messageId, `暂只支持文本，收到 ${messageType}`);
          return;
        }

        let text = "";
        try {
          text = stripMentions(String(JSON.parse(message?.content ?? "{}").text ?? ""));
        } catch (error) {
          log("parse content failed", error);
        }

        if (text.length === 0) {
          await sendText(messageId, "空消息");
          return;
        }

        // 长任务不阻塞事件循环，否则 /stop 也收不到
        void (async () => {
          try {
            if (await handleCommand(chatId, messageId, text)) return;
            await handlePrompt(chatId, messageId, text);
          } catch (error) {
            log("handler FAILED", error);
          }
        })();
      },
    });

    const start = async () => {
      if (state.wsState === "connected" || state.wsState === "starting") return;
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
      state.wsState = "starting";
      try {
        await wsClient.start({ eventDispatcher: dispatcher });
        state.wsState = "connected";
        log("websocket start resolved");
      } catch (error) {
        state.wsState = "failed";
        state.lastError = error instanceof Error ? error.message : String(error);
        log("websocket start rejected", error);
      }
    };

    const stop = () => {
      log("websocket stopping");
      try {
        state.ws?.close?.({ force: true });
      } catch (error) {
        log("websocket close failed", error);
      }
      state.ws = undefined;
      state.wsState = "idle";
    };

    state.controller = { start, stop };
    state.started = true;

    const enabledStored = await ctx.storage.get(ENABLED_KEY);
    state.enabled = enabledStored !== false;

    if (state.enabled) {
      await start();
    } else {
      log("bridge disabled by /feishu-off, not connecting");
    }

    return () => {
      log("cleanup");
      stop();
      state.started = false;
      state.busyChats = [];
      state.controller = undefined;
    };
  },
});
