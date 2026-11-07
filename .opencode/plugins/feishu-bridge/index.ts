import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Plugin } from "@opencode/plugin";
import {
  buildCard,
  buildMessageCard,
  buildPermissionCard,
  type CardStatus,
} from "./card";
import { createCommandHandler, type StoredChat } from "./commands";
import { FeishuBridge } from "./rpc";

/**
 * feishu-bridge M1.5
 *
 * 飞书文本 <-> OpenCode session。
 * 控制面：/feishu-status /feishu-on /feishu-off /feishu-restart /feishu-log
 * 侧边栏：sidebar.content（与 git-status 并存）
 * 状态通道：plugin RPC
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = join(HERE, "debug.log");
const ENV_FILE = join(HERE, ".env");
const PROMPTS_FILE = join(HERE, "prompts.json");
const GLOBAL_KEY = "__hucky_feishu_bridge__";
const ENABLED_KEY = "bridge/enabled";
const MAX_CHUNK = 3500;
const DEDUPE_TTL = 10 * 60 * 1000;

type Prompts = {
  prefix: string;
  suffix: string;
  image: string;
  images: string;
  file: string;
};

const DEFAULT_PROMPTS: Prompts = {
  prefix: "",
  suffix: "",
  image: "请看这张图片",
  images: "请看这些图片",
  file: "请阅读这个文件：{{name}}",
};

type BridgeState = {
  started: boolean;
  sdkLoaded: boolean;
  enabled: boolean;
  wsState: "idle" | "starting" | "connected" | "failed";
  lastError?: string;
  lastEventAt?: string;
  messageCount: number;
  busyChats: string[];
  streams: Map<string, StreamState>;
  eventsAbort?: AbortController;
  owner?: symbol;
  pending?: Promise<void>;
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

type AnyMessage = {
  type?: string;
  text?: string;
  content?: Array<{ type?: string; text?: string }>;
};

type StreamState = {
  chatId: string;
  messageId: string;
  text: string;
  meta: string;
  tools: Map<string, { name: string; status: "running" | "done" | "error" }>;
  lastPatchAt: number;
  timer?: ReturnType<typeof setTimeout>;
  finished: boolean;
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

function loadPrompts(): Prompts {
  try {
    if (!existsSync(PROMPTS_FILE)) return DEFAULT_PROMPTS;
    const parsed = JSON.parse(readFileSync(PROMPTS_FILE, "utf8")) as Partial<Prompts>;
    return { ...DEFAULT_PROMPTS, ...parsed };
  } catch (error) {
    log("prompts.json load failed, using defaults", error);
    return DEFAULT_PROMPTS;
  }
}

function getState(): BridgeState {
  const holder = globalThis as Record<string, unknown>;
  const existing = holder[GLOBAL_KEY] as Partial<BridgeState> | undefined;
  const state: BridgeState = {
    started: false,
    sdkLoaded: false,
    enabled: false,
    wsState: "idle",
    messageCount: 0,
    busyChats: [],
    streams: new Map(),
    ...existing,
  };
  // 热重载时旧 state 可能缺字段，补默认值
  state.busyChats = Array.isArray(state.busyChats) ? state.busyChats : [];
  state.streams =
    state.streams instanceof Map ? state.streams : new Map<string, StreamState>();
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
    const token = Symbol("feishu-instance");
    log("setup start", {
      opencode: ctx.app.version,
      directory: ctx.location.directory,
      runtime: runtimeInfo(),
    });

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

    const waitForReady = async (timeoutMs = 5000) => {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        const connection = state.ws?.getConnectionStatus?.() as
          | { state?: string }
          | undefined;
        if ((connection?.state ?? state.wsState) === "connected") return true;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      return false;
    };

    const statusText = () => {      const connection = state.ws?.getConnectionStatus?.() as
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
          await waitForReady();
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
          await waitForReady();
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

    try {
      await ctx.rpc.register(FeishuBridge, {
        status: async () => {
          const connection = state.ws?.getConnectionStatus?.() as
            | { state?: string; reconnectAttempts?: number }
            | undefined;
          return {
            enabled: state.enabled,
            sdkLoaded: state.sdkLoaded,
            wsState: connection?.state ?? state.wsState,
            reconnectAttempts: connection?.reconnectAttempts ?? 0,
            messageCount: state.messageCount,
            busyChats: [...state.busyChats],
            lastEventAt: state.lastEventAt ?? null,
            lastError: state.lastError ?? null,
          };
        },
      });
      log("rpc registered", { id: FeishuBridge.id });
      state.lastError = undefined;
    } catch (error) {
      state.lastError = error instanceof Error ? error.message : String(error);
      log("rpc register FAILED", error);
    }

    /** 只在没有现存连接时创建；热重载复用同一个 WS。 */
    const createBridge = async () => {
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
      const cardTitle = process.env.FEISHU_CARD_TITLE?.trim() || "OpenCode";
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

      const sendCardText = async (messageId: string, text: string) => {
        await client.im.message.reply({
          path: { message_id: messageId },
          data: {
            msg_type: "interactive",
            content: JSON.stringify(buildMessageCard({ title: cardTitle, text })),
          },
        });
      };

      const summarizeTools = (stream: StreamState) => {
        const counts = new Map<string, { count: number; running: number }>();
        for (const tool of stream.tools.values()) {
          const entry = counts.get(tool.name) ?? { count: 0, running: 0 };
          entry.count += 1;
          if (tool.status === "running") entry.running += 1;
          counts.set(tool.name, entry);
        }
        return [...counts.entries()]
          .sort((left, right) => right[1].count - left[1].count)
          .map(([name, entry]) => ({
            name,
            count: entry.count,
            running: entry.running,
          }));
      };

      const parseModel = (value: string) => {        const index = value.indexOf("/");
        if (index <= 0 || index === value.length - 1) return undefined;
        return {
          providerID: value.slice(0, index),
          id: value.slice(index + 1),
        };
      };

      /** 优先 env 指定；否则继承本 location 最近一个非飞书会话的模型/agent。 */
      const resolveTarget = async () => {
        const target: {
          model?: { providerID: string; id: string };
          agent?: string;
        } = {};

        const envModel = process.env.FEISHU_MODEL?.trim();
        const envAgent = process.env.FEISHU_AGENT?.trim();
        if (envModel) target.model = parseModel(envModel);
        if (envAgent) target.agent = envAgent;
        if (target.model && target.agent) return target;

        try {
          const page = await ctx.session.list({
            directory: ctx.location.directory,
            limit: 20,
          });
          for (const item of page.data ?? []) {
            if ((item.title ?? "").startsWith("飞书 ")) continue;
            const messages = await ctx.session.context({ sessionID: item.id });
            for (let index = messages.length - 1; index >= 0; index -= 1) {
              const message = messages[index] as {
                type?: string;
                model?: { providerID: string; id: string };
                agent?: string;
              };
              if (message?.type !== "assistant" || !message.model) continue;
              target.model ??= message.model;
              target.agent ??= message.agent;
              break;
            }
            if (target.model && target.agent) break;
          }
        } catch (error) {
          log("resolve target failed", error);
        }

        return target;
      };

      const readMeta = async (sessionID: string) => {
        try {
          const info = await ctx.session.get({ sessionID });
          let agent = info.agent;
          let model = info.model;

          if (!model) {
            const messages = await ctx.session.context({ sessionID });
            for (let index = messages.length - 1; index >= 0; index -= 1) {
              const message = messages[index] as {
                type?: string;
                model?: { providerID: string; id: string };
                agent?: string;
              };
              if (message?.type !== "assistant" || !message.model) continue;
              model = message.model;
              agent ??= message.agent;
              break;
            }
          }

          let label = "unknown";
          if (model) {
            try {
              const models = await ctx.model.list();
              const found = models.data.find(
                (item) =>
                  item.providerID === model!.providerID &&
                  (item.modelID === model!.id || item.id === model!.id),
              );
              label = `${found?.name ?? model.id} (${model.providerID})`;
            } catch {
              label = `${model.id} (${model.providerID})`;
            }
          } else {
            try {
              const fallback = await ctx.model.default();
              label = fallback.data
                ? `${fallback.data.name} (${fallback.data.providerID})`
                : "unknown";
            } catch {
              label = "unknown";
            }
          }

          return [
            agent ?? "build",
            label,
            info.location?.directory ?? ctx.location.directory,
          ].join(" · ");
        } catch {
          return ctx.location.directory;
        }
      };

      const patchCard = async (cardId: string, card: unknown) => {
        try {
          await client.im.message.patch({
            path: { message_id: cardId },
            data: { content: JSON.stringify(card) },
          });
        } catch (error) {
          log("card patch failed", error);
        }
      };

      const sendCard = async (replyTo: string, card: unknown) => {
        const result = await client.im.message.reply({
          path: { message_id: replyTo },
          data: { msg_type: "interactive", content: JSON.stringify(card) },
        });
        return result?.data?.message_id as string | undefined;
      };

      const schedulePatch = (stream: StreamState) => {
        if (stream.finished || stream.timer) return;
        const delay = Math.max(0, 900 - (Date.now() - stream.lastPatchAt));
        stream.timer = setTimeout(() => {
          stream.timer = undefined;
          stream.lastPatchAt = Date.now();
          void patchCard(
            stream.messageId,
            buildCard({
              title: cardTitle,
              text: stream.text,
              status: "running",
              meta: stream.meta,
              tools: summarizeTools(stream),
            }),
          );
        }, delay);
      };

      const finishStream = (stream: StreamState) => {
        stream.finished = true;
        if (stream.timer) {
          clearTimeout(stream.timer);
          stream.timer = undefined;
        }
      };

      const readChat = async (chatId: string) =>
        (await ctx.storage.get(`chat/${chatId}`)) as StoredChat | undefined;

      const writeChat = async (chatId: string, patch: Partial<StoredChat>) => {
        const current =
          (await readChat(chatId)) ??
          ({
            sessionID: "",
            createdAt: new Date().toISOString(),
          } satisfies StoredChat);
        const next = { ...current, ...patch } as StoredChat;
        await ctx.storage.set(`chat/${chatId}`, next);
        return next;
      };

      const getOrCreateSession = async (chatId: string) => {
        const stored = await readChat(chatId);
        if (stored?.sessionID) {
          try {
            await ctx.session.get({ sessionID: stored.sessionID });
            return stored.sessionID;
          } catch {
            log("stored session missing, recreate", {
              chatId,
              sessionID: stored.sessionID,
            });
          }
        }
        const created = await ctx.session.create({ title: `飞书 ${chatId.slice(-6)}` });
        await writeChat(chatId, {
          sessionID: created.id,
          createdAt: new Date().toISOString(),
          model: undefined,
          agent: undefined,
        });
        log("session created", { chatId, sessionID: created.id });
        return created.id;
      };

      const newSession = async (chatId: string) => {
        const created = await ctx.session.create({ title: `飞书 ${chatId.slice(-6)}` });
        await writeChat(chatId, {
          sessionID: created.id,
          createdAt: new Date().toISOString(),
          model: undefined,
          agent: undefined,
        });
        log("session created (manual)", { chatId, sessionID: created.id });
        return created.id;
      };

      const handleCommand = createCommandHandler({
        ctx,
        state,
        sendText: sendCardText,
        readChat,
        writeChat,
        newSession,
        readMeta,
        log,
      });

      const handlePrompt = async (
        chatId: string,
        messageId: string,
        text: string,
        files?: Array<{ uri: string; name?: string }>,
      ) => {
        if (state.busyChats.includes(chatId)) {
          await sendText(messageId, "上一条还在处理中，稍等或发 /stop 中断");
          return;
        }

        state.busyChats.push(chatId);
        let sessionID: string | undefined;
        let stream: StreamState | undefined;
        try {
          sessionID = await getOrCreateSession(chatId);

          const stored = await readChat(chatId);
          const inherited = await resolveTarget();
          const target = {
            model: stored?.model ?? inherited.model,
            agent: stored?.agent ?? inherited.agent,
          };
          log("target resolved", {
            chatId,
            model: target.model,
            agent: target.agent,
          });
          if (target.model) {
            try {
              await ctx.session.switchModel({ sessionID, model: target.model });
            } catch (error) {
              log("switch model failed", error);
            }
          }
          if (target.agent) {
            try {
              await ctx.session.switchAgent({ sessionID, agent: target.agent });
            } catch (error) {
              log("switch agent failed", error);
            }
          }

          const meta = await readMeta(sessionID);

          const cardId = await sendCard(
            messageId,
            buildCard({ title: cardTitle, text: "", status: "running", meta }),
          );
          if (cardId) {
            stream = {
              chatId,
              messageId: cardId,
              text: "",
              meta,
              tools: new Map(),
              lastPatchAt: Date.now(),
              finished: false,
            };
            state.streams.set(sessionID, stream);
          } else {
            await sendText(messageId, "收到，处理中…");
          }

          const prompts = loadPrompts();
          const promptText = `${prompts.prefix}${text}${prompts.suffix}`;

          const started = Date.now();
          await ctx.session.prompt({
            sessionID,
            text: promptText,
            ...(files && files.length > 0 ? { files } : {}),
          });

          if (stream) {
            stream.meta = await readMeta(sessionID);
            schedulePatch(stream);
          }

          await ctx.session.wait({ sessionID });

          const messages = (await ctx.session.context({ sessionID })) as AnyMessage[];
          const answer = extractAnswer(messages, promptText);
          log("prompt done", {
            chatId,
            sessionID,
            ms: Date.now() - started,
            chars: answer.length,
          });

          if (stream) {
            finishStream(stream);
            if (answer.length <= 4000) {
              await patchCard(
                stream.messageId,
                buildCard({
                  title: cardTitle,
                  text: answer.length > 0 ? answer : "（本轮没有返回文本）",
                  status: "done",
                  meta: stream.meta,
                  tools: summarizeTools(stream),
                }),
              );
            } else {
              await patchCard(
                stream.messageId,
                buildCard({
                  title: cardTitle,
                  text: `已完成，全文见下方（${answer.length} 字）`,
                  status: "done",
                  meta: stream.meta,
                  tools: summarizeTools(stream),
                }),
              );
              await sendText(messageId, answer);
            }
          } else {
            await sendText(messageId, answer.length > 0 ? answer : "（本轮没有返回文本）");
          }
        } catch (error) {
          log("prompt FAILED", error);
          const message = error instanceof Error ? error.message : String(error);
          if (stream) {
            finishStream(stream);
            await patchCard(
              stream.messageId,
              buildCard({
                title: cardTitle,
                text: `出错：${message}`,
                status: "error",
                meta: stream.meta,
                tools: summarizeTools(stream),
              }),
            );
          } else {
            await sendText(messageId, `出错：${message}`);
          }
        } finally {
          state.busyChats = state.busyChats.filter((item) => item !== chatId);
          if (sessionID) state.streams.delete(sessionID);
        }
      };

      const headerValue = (headers: any, name: string) => {
        if (!headers) return "";
        if (typeof headers.get === "function") {
          return String(headers.get(name) ?? "");
        }
        return String(headers[name] ?? headers[name.toLowerCase()] ?? "");
      };

      const mimeExt = (contentType: string) => {
        const type = contentType.toLowerCase();
        if (type.includes("jpeg") || type.includes("jpg")) return ".jpg";
        if (type.includes("gif")) return ".gif";
        if (type.includes("webp")) return ".webp";
        if (type.includes("bmp")) return ".bmp";
        return ".png";
      };

      const downloadAttachment = async (
        messageId: string,
        messageType: string,
        content: Record<string, any>,
      ) => {
        const isImage = messageType === "image";
        const fileKey = isImage ? content.image_key : content.file_key;
        if (!fileKey) return undefined;

        const dir = join(
          ctx.location.directory,
          ".opencode",
          "plugins",
          "feishu-bridge",
          "feishu-files",
        );
        mkdirSync(dir, { recursive: true });

        const response = await client.im.messageResource.get({
          path: { message_id: messageId, file_key: fileKey },
          params: { type: isImage ? "image" : "file" },
        });

        const ext = isImage
          ? mimeExt(headerValue(response?.headers, "content-type"))
          : extname(String(content.file_name ?? "")) || ".bin";
        const safeKey = String(fileKey).replace(/[^A-Za-z0-9._-]/g, "_");
        const target = join(dir, `${messageId}-${safeKey}${ext}`);
        await response.writeFile(target);

        return {
          uri: pathToFileURL(target).href,
          name: isImage
            ? `image-${safeKey}${ext}`
            : String(content.file_name ?? `file-${safeKey}${ext}`),
        };
      };

      const parsePost = (content: any) => {
        const texts: string[] = [];
        const images: string[] = [];
        const rows = Array.isArray(content?.content) ? content.content : [];
        for (const row of rows) {
          if (!Array.isArray(row)) continue;
          for (const node of row) {
            if (node?.tag === "text" && node.text) {
              texts.push(String(node.text));
            } else if (node?.tag === "a" && node.text) {
              texts.push(String(node.text));
            } else if (node?.tag === "img" && node.image_key) {
              images.push(String(node.image_key));
            }
          }
        }
        return { text: texts.join(" ").trim(), images };
      };

      const findChatBySession = async (sessionID: string) => {
        try {
          const page = await ctx.storage.scan({ prefix: "chat/", limit: 100 });
          for (const entry of page.entries) {
            const value = entry.value as StoredChat | undefined;
            if (value?.sessionID === sessionID) {
              return entry.key.slice("chat/".length);
            }
          }
        } catch (error) {
          log("scan chats failed", error);
        }
        return undefined;
      };

      const handlePermission = async (request: any) => {
        const chatId = await findChatBySession(String(request?.sessionID ?? ""));
        if (!chatId) {
          log("permission ignored, no chat mapping", {
            sessionID: request?.sessionID,
          });
          return;
        }
        try {
          const result = await client.im.message.create({
            params: { receive_id_type: "chat_id" },
            data: {
              receive_id: chatId,
              msg_type: "interactive",
              content: JSON.stringify(
                buildPermissionCard({
                  title: cardTitle,
                  action: String(request?.action ?? "permission"),
                  resources: Array.isArray(request?.resources)
                    ? request.resources.map(String)
                    : [],
                  message: request?.message ? String(request.message) : undefined,
                  requestID: String(request?.id ?? ""),
                  sessionID: String(request?.sessionID ?? ""),
                }),
              ),
            },
          });
          log("permission card sent", {
            requestID: request?.id,
            chatId,
            messageId: result?.data?.message_id,
          });
        } catch (error) {
          log("permission card FAILED", error);
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

          let text = "";
          let files: Array<{ uri: string; name?: string }> = [];
          const prompts = loadPrompts();

          if (messageType === "text") {
            try {
              text = stripMentions(String(JSON.parse(message?.content ?? "{}").text ?? ""));
            } catch (error) {
              log("parse content failed", error);
            }
          } else if (messageType === "image" || messageType === "file") {
            try {
              const content = JSON.parse(message?.content ?? "{}");
              const file = await downloadAttachment(messageId, messageType, content);
              if (!file) {
                await sendText(messageId, "附件下载失败：缺少 file_key");
                return;
              }
              files = [file];
              text =
                messageType === "image"
                  ? prompts.image
                  : prompts.file.replace("{{name}}", String(content.file_name ?? file.name));
            } catch (error) {
              log("attachment FAILED", error);
              const reason = error instanceof Error ? error.message : String(error);
              await sendText(messageId, `附件处理失败: ${reason}`);
              return;
            }
          } else if (messageType === "post") {
            try {
              const content = JSON.parse(message?.content ?? "{}");
              const post = parsePost(content);
              text = post.text;
              for (const imageKey of post.images.slice(0, 5)) {
                const file = await downloadAttachment(messageId, "image", {
                  image_key: imageKey,
                });
                if (file) files.push(file);
              }
              if (text.length === 0 && files.length > 0) {
                text = files.length > 1 ? prompts.images : prompts.image;
              }
              if (text.length === 0 && files.length === 0) {
                await sendText(messageId, "暂不支持这种富文本内容");
                return;
              }
            } catch (error) {
              log("post FAILED", error);
              const reason = error instanceof Error ? error.message : String(error);
              await sendText(messageId, `富文本处理失败: ${reason}`);
              return;
            }
          } else {
            await sendText(messageId, `暂不支持 ${messageType}`);
            return;
          }

          if (text.length === 0 && files.length === 0) {
            await sendText(messageId, "空消息");
            return;
          }

          // 长任务不阻塞事件循环，否则 /stop 也收不到
          void (async () => {
            try {
              if (messageType === "text" && (await handleCommand(chatId, messageId, text))) {
                return;
              }
              await handlePrompt(chatId, messageId, text, files);
            } catch (error) {
              log("handler FAILED", error);
            }
          })();
        },

        "im.message.recalled_v1": async (data: any) => {
          const chatId = data?.chat_id ?? data?.event?.chat_id;
          const recalledId = data?.message_id ?? data?.event?.message_id;
          if (!chatId) return;

          const stored = await readChat(chatId);
          if (!stored?.sessionID) return;

          log("message recalled", { chatId, messageId: recalledId });

          if (!state.busyChats.includes(chatId)) return;

          try {
            await ctx.session.interrupt({ sessionID: stored.sessionID, resume: false });
          } catch (error) {
            log("recall interrupt failed", error);
          }

          const stream = state.streams.get(stored.sessionID);
          if (stream) {
            finishStream(stream);
            await patchCard(
              stream.messageId,
              buildCard({
                title: cardTitle,
                text: "消息已撤回，任务已中断",
                status: "error",
                meta: stream.meta,
                tools: summarizeTools(stream),
              }),
            );
          }
        },

        "card.action.trigger": async (data: any) => {
          const value = data?.action?.value;
          if (!value || value.kind !== "feishu-permission") return;

          const openId = data?.operator?.open_id ?? data?.operator?.operator_id?.open_id;
          if (allowed.length > 0 && (!openId || !allowed.includes(openId))) {
            log("permission action blocked", { openId });
            return;
          }

          const decision = value.decision as "once" | "always" | "reject";
          if (!["once", "always", "reject"].includes(decision)) return;

          try {
            await ctx.permission.reply({
              sessionID: value.sessionID,
              requestID: value.requestID,
              decision,
            });
            log("permission replied", {
              requestID: value.requestID,
              decision,
              openId,
            });
          } catch (error) {
            log("permission reply FAILED", error);
          }

          const cardMessageId = data?.context?.open_message_id;
          if (cardMessageId) {
            const label =
              decision === "reject" ? "已拒绝" : decision === "always" ? "已始终允许" : "已允许一次";
            await patchCard(
              cardMessageId,
              buildCard({
                title: cardTitle,
                text: `权限请求: ${label}`,
                status: decision === "reject" ? "error" : "done",
              }),
            );
          }
        },
      });

      let eventsAbort: AbortController | undefined;

      const subscribeEvents = () => {
        if (eventsAbort) return;
        eventsAbort = new AbortController();
        state.eventsAbort = eventsAbort;
        const signal = eventsAbort.signal;

        void (async () => {
          try {
            for await (const event of ctx.event.subscribe({
              signal,
              types: [
                "session.text.delta",
                "session.tool.input.started",
                "session.tool.called",
                "session.tool.success",
                "session.tool.failed",
                "permission.asked",
              ],
            })) {
              if (event.type === "permission.asked") {
                void handlePermission(event.data);
                continue;
              }

              const data = event.data as {
                sessionID?: string;
                delta?: string;
                id?: string;
                name?: string;
              };
              const stream = data.sessionID
                ? state.streams.get(data.sessionID)
                : undefined;
              if (!stream || stream.finished) continue;

              if (event.type === "session.text.delta") {
                stream.text += data.delta ?? "";
                schedulePatch(stream);
              } else if (event.type === "session.tool.input.started") {
                if (data.id && data.name) {
                  stream.tools.set(data.id, { name: data.name, status: "running" });
                }
                schedulePatch(stream);
              } else if (event.type === "session.tool.called") {
                const tool = data.id ? stream.tools.get(data.id) : undefined;
                if (tool) tool.status = "running";
                schedulePatch(stream);
              } else if (event.type === "session.tool.success") {
                const tool = data.id ? stream.tools.get(data.id) : undefined;
                if (tool) tool.status = "done";
                schedulePatch(stream);
              } else if (event.type === "session.tool.failed") {
                const tool = data.id ? stream.tools.get(data.id) : undefined;
                if (tool) tool.status = "error";
                schedulePatch(stream);
              }
            }
            if (!signal.aborted) log("event stream ended");
          } catch (error) {
            if (!signal.aborted) log("event stream FAILED", error);
          }
        })();
      };

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
        subscribeEvents();
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
        eventsAbort?.abort();
        eventsAbort = undefined;
        state.eventsAbort = undefined;
        for (const stream of state.streams.values()) finishStream(stream);
        state.streams.clear();
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

      const initialized = await ctx.storage.get("bridge/initialized");
      if (initialized !== true) {
        // 首次升级：默认关闭，避免升级后自动连上
        await ctx.storage.set("bridge/initialized", true);
        await ctx.storage.set(ENABLED_KEY, false);
        state.enabled = false;
      } else {
        state.enabled = (await ctx.storage.get(ENABLED_KEY)) === true;
      }

      if (state.enabled) {
        await start();
      } else {
        log("bridge disabled, use /feishu-on in TUI to start");
      }
    };

    if (state.controller) {
      log("reuse existing bridge connection");
    } else if (state.pending) {
      log("wait for pending bridge setup");
      await state.pending;
    } else {
      state.pending = createBridge().finally(() => {
        state.pending = undefined;
      });
      await state.pending;
    }

    state.owner = token;

    return () => {
      if (state.owner !== token) {
        log("cleanup skipped, instance superseded");
        return;
      }
      log("cleanup");
      state.controller?.stop();
      state.started = false;
      state.busyChats = [];
      state.controller = undefined;
      state.owner = undefined;
    };
  },
});
