import { execFile } from "node:child_process";
import {
  appendFileSync,
  createReadStream,
  existsSync,
  readFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Plugin } from "@opencode/plugin";
import { buildRequirementPrompt, writeRequirement } from "./requirement";
import { FeishuPm } from "./rpc";
import { type NotifyTarget, startScreenshotWatcher } from "./screenshot";

const execFileAsync = promisify(execFile);

const HERE = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = join(HERE, "debug.log");
const ENV_FILE = join(HERE, ".env");
const GLOBAL_KEY = "__hucky_feishu_pm__";
const ENABLED_KEY = "feishu-pm/enabled";
const INITIALIZED_KEY = "feishu-pm/initialized";

type PmState = {
  owner?: symbol;
  watcher?: { stop: () => void };
  enabled: boolean;
  watching: boolean;
  target: string | null;
  lastCommit?: string;
  lastAt?: string;
  lastError?: string;
  receiver?: { close?: (params?: { force?: boolean }) => void };
  receiverState: "idle" | "starting" | "connected" | "failed";
  received: number;
  lastRequirement?: string;
};

type AnyMessage = {
  type?: string;
  text?: string;
  content?: Array<{ type?: string; text?: string }>;
};

function log(message: string, extra?: unknown) {
  let detail = "";
  if (extra !== undefined) {
    if (extra instanceof Error) {
      detail = ` ${extra.name}: ${extra.message}`;
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
  console.log(`[feishu-pm] ${line}`);
}

function loadEnvFile() {
  if (!existsSync(ENV_FILE)) return;
  try {
    for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index <= 0) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed
        .slice(index + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (process.env[key] === undefined || process.env[key] === "") {
        process.env[key] = value;
      }
    }
  } catch (error) {
    log("env load failed", error);
  }
}

function getState(): PmState {
  const holder = globalThis as Record<string, unknown>;
  if (!holder[GLOBAL_KEY]) {
    holder[GLOBAL_KEY] = {
      enabled: false,
      watching: false,
      target: null,
      receiverState: "idle",
      received: 0,
    } satisfies PmState;
  }
  return holder[GLOBAL_KEY] as PmState;
}

function pagesFromEnv() {
  return (process.env.FEISHU_SCREENSHOT_PAGES ?? "/,/docs,/login")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function baseFromEnv() {
  return process.env.FEISHU_SCREENSHOT_BASE ?? "http://localhost:3000";
}

function pollFromEnv() {
  return Math.max(
    5000,
    Number(process.env.FEISHU_SCREENSHOT_POLL_MS ?? 20000) || 20000,
  );
}

/**
 * 推送目标只来自配置，不依赖接收消息，因此客户 bot 不需要长连接和事件订阅。
 */
function resolveTarget(): NotifyTarget | undefined {
  const chatId = process.env.FEISHU_PM_NOTIFY_CHAT_ID?.trim();
  if (chatId) return { receiveIdType: "chat_id", receiveId: chatId };
  const openId = process.env.FEISHU_PM_NOTIFY_OPEN_ID?.trim();
  if (openId) return { receiveIdType: "open_id", receiveId: openId };
  return undefined;
}

function messageText(message: { content?: string }) {
  try {
    const parsed = JSON.parse(message.content ?? "{}") as { text?: string };
    return String(parsed.text ?? "")
      .replace(/@_user_\d+/g, "")
      .trim();
  } catch {
    return "";
  }
}

async function readCommitDiff(directory: string, sha: string) {
  try {
    const { stdout: stat } = await execFileAsync(
      "git",
      ["-C", directory, "show", "--stat", "--format=%h %s%n%b", sha],
      { timeout: 20000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
    );
    const { stdout: patch } = await execFileAsync(
      "git",
      ["-C", directory, "show", "--format=", "--unified=2", sha],
      { timeout: 20000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
    );
    return `${stat.trim()}\n\n${patch.trim()}`.slice(0, 30000);
  } catch (error) {
    log("read commit diff failed", error);
    return "";
  }
}

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

function readLogTail(count: number) {
  try {
    if (!existsSync(LOG_FILE)) return "(empty)";
    return readFileSync(LOG_FILE, "utf8")
      .trimEnd()
      .split(/\r?\n/)
      .slice(-count)
      .join("\n");
  } catch (error) {
    return `log read failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function statusText(state: PmState) {
  return [
    `enabled: ${state.enabled}`,
    `watching: ${state.watching}`,
    `target: ${state.target ?? "-"}`,
    `pages: ${pagesFromEnv().join(", ")}`,
    `base: ${baseFromEnv()}`,
    `poll: ${pollFromEnv()}ms`,
    `lastCommit: ${state.lastCommit ?? "-"}`,
    `lastAt: ${state.lastAt ?? "-"}`,
    `lastError: ${state.lastError ?? "-"}`,
    `receiver: ${state.receiverState}`,
    `received: ${state.received}`,
    `lastRequirement: ${state.lastRequirement ?? "-"}`,
  ].join("\n");
}

function describeLarkError(error: unknown) {
  const detail = error as {
    message?: string;
    response?: { status?: number; data?: { code?: number; msg?: string } };
  };
  const code = detail?.response?.data?.code;
  const msg = detail?.response?.data?.msg;
  if (code !== undefined) {
    return `${detail.message ?? "request failed"} (code=${code} msg=${msg ?? "-"})`;
  }
  return error instanceof Error ? error.message : String(error);
}

export default Plugin.define({
  id: "hucky.feishu-pm",

  async setup(ctx) {
    loadEnvFile();

    const state = getState();
    const token = Symbol("feishu-pm");
    state.owner = token;

    const say = async (sessionID: string, text: string) => {
      await ctx.session.synthetic({ sessionID, text });
    };

    // 使用独立前缀：全局 feishu-bridge 与本插件共享同一个 OpenCode 进程的 process.env，
    // 沿用 FEISHU_APP_ID 会被先加载的控制 bot 凭证覆盖。
    const appId = process.env.FEISHU_PM_APP_ID?.trim();
    const appSecret = process.env.FEISHU_PM_APP_SECRET?.trim();
    const target = resolveTarget();
    state.target = target
      ? `${target.receiveIdType}:${target.receiveId}`
      : null;

    let configError = "";
    if (!appId || !appSecret) {
      configError = "missing FEISHU_PM_APP_ID / FEISHU_PM_APP_SECRET";
    } else if (!target) {
      configError =
        "missing FEISHU_PM_NOTIFY_CHAT_ID / FEISHU_PM_NOTIFY_OPEN_ID";
    }
    if (configError) log(configError);

    type LarkModule = typeof import("@larksuiteoapi/node-sdk");
    type LarkClient = InstanceType<LarkModule["Client"]>;
    let client: LarkClient | undefined;
    const getClient = async (): Promise<LarkClient> => {
      if (client) return client;
      const Lark = await import("@larksuiteoapi/node-sdk");
      client = new Lark.Client({ appId, appSecret });
      return client;
    };

    const parseModel = (value?: string) => {
      const text = value?.trim();
      if (!text) return undefined;
      const index = text.indexOf("/");
      if (index <= 0 || index === text.length - 1) return undefined;
      return { providerID: text.slice(0, index), id: text.slice(index + 1) };
    };

    const applyTarget = async (sessionID: string) => {
      const model = parseModel(process.env.FEISHU_PM_MODEL);
      if (model) {
        await ctx.session
          .switchModel({ sessionID, model })
          .catch((error) => log("switch model FAILED", error));
      }
      const agent = process.env.FEISHU_PM_AGENT?.trim();
      if (agent) {
        await ctx.session
          .switchAgent({ sessionID, agent })
          .catch((error) => log("switch agent FAILED", error));
      }
    };

    const sendText = async (to: NotifyTarget, text: string) => {
      const lark = await getClient();
      try {
        await lark.im.message.create({
          params: { receive_id_type: to.receiveIdType },
          data: {
            receive_id: to.receiveId,
            msg_type: "text",
            content: JSON.stringify({ text: text.slice(0, 4000) }),
          },
        });
      } catch (error) {
        throw new Error(`发送文本失败：${describeLarkError(error)}`);
      }
    };

    const sendImage = async (to: NotifyTarget, filePath: string) => {
      const lark = await getClient();
      try {
        const uploaded = (await lark.im.image.create({
          data: {
            image_type: "message",
            image: createReadStream(filePath),
          },
        })) as { image_key?: string; data?: { image_key?: string } };
        const imageKey = uploaded?.image_key ?? uploaded?.data?.image_key;
        if (!imageKey) throw new Error("图片上传失败：没有返回 image_key");
        await lark.im.message.create({
          params: { receive_id_type: to.receiveIdType },
          data: {
            receive_id: to.receiveId,
            msg_type: "image",
            content: JSON.stringify({ image_key: imageKey }),
          },
        });
      } catch (error) {
        throw new Error(`发送图片失败：${describeLarkError(error)}`);
      }
    };

    const summarizeCommit = async (sha: string, subject: string) => {
      if (process.env.FEISHU_PM_SUMMARY === "0") return undefined;
      const diff = await readCommitDiff(ctx.location.directory, sha);
      if (!diff) return undefined;

      const promptText = [
        "你在为客户的更新通知撰写发布说明。",
        "只根据下面的提交内容，用简体中文 2-4 句话概括本次提交完成或修改了什么。",
        "面向非开发客户，说明用户能感知的变化，避免逐文件罗列和内部实现细节。",
        "不要调用工具，不要修改文件。只输出正文，不要标题、列表符号或前后缀。",
        "",
        diff,
      ].join("\n");

      try {
        const created = await ctx.session.create({
          title: `feishu-pm 摘要 ${sha.slice(0, 7)}`,
        });
        await applyTarget(created.id);
        await ctx.session.prompt({ sessionID: created.id, text: promptText });
        const finished = await Promise.race([
          ctx.session.wait({ sessionID: created.id }).then(() => true),
          new Promise<boolean>((resolve) =>
            setTimeout(() => resolve(false), 90000),
          ),
        ]);
        if (!finished) {
          log("summarize timeout", { sha });
          return undefined;
        }
        const messages = (await ctx.session.context({
          sessionID: created.id,
        })) as AnyMessage[];
        const answer = extractAnswer(messages, promptText);
        return answer ? `${subject}\n\n${answer.slice(0, 2000)}` : undefined;
      } catch (error) {
        log("summarize FAILED", error);
        return undefined;
      }
    };

    const stopWatcher = () => {
      state.watcher?.stop();
      state.watcher = undefined;
      state.watching = false;
    };

    const startWatcher = () => {
      if (configError) {
        log(`watcher not started: ${configError}`);
        return false;
      }
      if (state.watcher) return true;
      state.watcher = startScreenshotWatcher({
        directory: ctx.location.directory,
        log,
        storageGet: (key) => ctx.storage.get(key),
        storageSet: (key, value) => ctx.storage.set(key, value),
        getTarget: async () => resolveTarget(),
        sendImage,
        sendText,
        summarize: summarizeCommit,
        onStatus: (status) => {
          state.lastCommit = status.commit;
          state.lastAt = status.at;
          state.lastError = status.error;
        },
      });
      state.watching = true;
      log("watcher started", {
        directory: ctx.location.directory,
        target: target?.receiveIdType ?? "-",
      });
      return true;
    };

    const allowedChats = () => {
      const configured = (process.env.FEISHU_PM_ALLOWED_CHAT_IDS ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (configured.length > 0) return new Set(configured);
      const fallback = process.env.FEISHU_PM_NOTIFY_CHAT_ID?.trim();
      return new Set(fallback ? [fallback] : []);
    };

    const replyMessage = async (messageId: string, text: string) => {
      const lark = await getClient();
      await lark.im.message.reply({
        path: { message_id: messageId },
        data: {
          msg_type: "text",
          content: JSON.stringify({ text }),
        },
      });
    };

    const seenMessages = new Set<string>();
    let queue: Promise<void> = Promise.resolve();
    const enqueue = (task: () => Promise<void>) => {
      queue = queue
        .then(task)
        .catch((error) => log("receive task FAILED", error));
    };

    const requirementsDir = () =>
      join(
        ctx.location.directory,
        process.env.FEISHU_PM_REQUIREMENTS_DIR?.trim() || "requirements",
      );

    const chatNames = new Map<string, string>();
    const userNames = new Map<string, string>();

    const resolveNames = async (chatId: string, openId?: string) => {
      const result: { chatName?: string; senderName?: string } = {};
      try {
        let name = chatNames.get(chatId);
        if (!name) {
          const lark = await getClient();
          const chat = await lark.im.chat.get({
            path: { chat_id: chatId },
          });
          name = (chat as { data?: { name?: string } })?.data?.name;
          if (name) chatNames.set(chatId, name);
        }
        result.chatName = name;
      } catch (error) {
        log("chat name lookup FAILED", error);
      }
      if (openId) {
        try {
          let name = userNames.get(openId);
          if (!name) {
            const lark = await getClient();
            const user = await lark.contact.user.get({
              path: { user_id: openId },
              params: { user_id_type: "open_id" },
            });
            name = (user as { data?: { user?: { name?: string } } })?.data?.user
              ?.name;
            if (name) userNames.set(openId, name);
          }
          result.senderName = name;
        } catch (error) {
          log("user name lookup FAILED", error);
        }
      }
      return result;
    };

    const handleIncoming = async (data: unknown) => {
      const event = data as {
        message?: {
          message_id?: string;
          chat_id?: string;
          chat_type?: string;
          message_type?: string;
          content?: string;
        };
        sender?: {
          sender_type?: string;
          sender_id?: { open_id?: string };
        };
      };
      const message = event.message;
      const sender = event.sender;
      if (!message?.message_id || !message?.chat_id) return;
      if (message.chat_type !== "group") return;
      if (sender?.sender_type === "app" || sender?.sender_type === "bot") {
        return;
      }
      if (seenMessages.has(message.message_id)) return;
      seenMessages.add(message.message_id);
      if (seenMessages.size > 500) {
        const first = seenMessages.values().next().value;
        if (first) seenMessages.delete(first);
      }

      const allowed = allowedChats();
      if (allowed.size > 0 && !allowed.has(message.chat_id)) {
        log("requirement ignored: chat not allowed", {
          chatId: message.chat_id,
        });
        return;
      }

      if (message.message_type !== "text") {
        await replyMessage(
          message.message_id,
          "目前只支持文本需求，请直接发送文字。",
        );
        return;
      }

      const text = messageText(message);
      if (!text) return;

      const names = await resolveNames(
        message.chat_id,
        sender?.sender_id?.open_id,
      );
      const source = {
        chatId: message.chat_id,
        senderId: sender?.sender_id?.open_id,
        messageId: message.message_id,
        ...names,
        createdAt: new Date(),
      };
      const promptText = buildRequirementPrompt(text, source);

      const created = await ctx.session.create({
        title: `客户需求 ${new Date().toISOString().slice(0, 10)}`,
      });
      await applyTarget(created.id);
      if (!process.env.FEISHU_PM_AGENT?.trim()) {
        await ctx.session
          .switchAgent({ sessionID: created.id, agent: "plan" })
          .catch(() => {});
      }
      await ctx.session.prompt({ sessionID: created.id, text: promptText });
      const finished = await Promise.race([
        ctx.session.wait({ sessionID: created.id }).then(() => true),
        new Promise<boolean>((resolve) =>
          setTimeout(() => resolve(false), 90000),
        ),
      ]);
      if (!finished) {
        log("requirement timeout", { messageId: message.message_id });
        await replyMessage(message.message_id, "需求整理超时，请稍后重试。");
        return;
      }

      const messages = (await ctx.session.context({
        sessionID: created.id,
      })) as AnyMessage[];
      const body = extractAnswer(messages, promptText);
      if (!body) {
        await replyMessage(message.message_id, "需求整理失败：没有生成内容。");
        return;
      }

      const { filePath, title } = await writeRequirement(
        requirementsDir(),
        body,
        source,
      );
      const display = relative(ctx.location.directory, filePath).replace(
        /\\/g,
        "/",
      );
      state.received += 1;
      state.lastRequirement = display;
      log("requirement saved", { file: display, title });
      await replyMessage(
        message.message_id,
        `已记录需求：${display}\n标题：${title}`,
      );
    };

    const startReceiver = async () => {
      if (process.env.FEISHU_PM_RECEIVE === "0") return;
      if (!appId || !appSecret) return;
      if (state.receiver) return;
      try {
        const Lark = await import("@larksuiteoapi/node-sdk");
        const dispatcher = new Lark.EventDispatcher({}).register({
          "im.message.receive_v1": (data: unknown) => {
            enqueue(() => handleIncoming(data));
          },
        });
        const ws = new Lark.WSClient({
          appId,
          appSecret,
          loggerLevel: Lark.LoggerLevel.info,
        });
        state.receiver = ws as unknown as PmState["receiver"];
        state.receiverState = "starting";
        await ws.start({ eventDispatcher: dispatcher });
        state.receiverState = "connected";
        log("receiver ready");
      } catch (error) {
        state.receiverState = "failed";
        log("receiver FAILED", error);
      }
    };

    const stopReceiver = () => {
      try {
        state.receiver?.close?.({ force: true });
      } catch (error) {
        log("receiver close FAILED", error);
      }
      state.receiver = undefined;
      state.receiverState = "idle";
    };

    const startAll = () => {
      const started = startWatcher();
      void startReceiver();
      return started;
    };

    const stopAll = () => {
      stopWatcher();
      stopReceiver();
    };

    const initialized = await ctx.storage.get(INITIALIZED_KEY);
    if (initialized !== true) {
      await ctx.storage.set(INITIALIZED_KEY, true);
      await ctx.storage.set(ENABLED_KEY, true);
      state.enabled = true;
    } else {
      state.enabled = (await ctx.storage.get(ENABLED_KEY)) !== false;
    }
    if (state.enabled) startAll();

    try {
      await ctx.rpc.register(FeishuPm, {
        status: async () => ({
          enabled: state.enabled,
          watching: state.watching,
          target: state.target,
          pages: pagesFromEnv(),
          base: baseFromEnv(),
          pollMs: pollFromEnv(),
          lastCommit: state.lastCommit ?? null,
          lastAt: state.lastAt ?? null,
          lastError: state.lastError ?? null,
          receiverState: state.receiverState,
          received: state.received,
          lastRequirement: state.lastRequirement ?? null,
        }),
      });
      log("rpc registered", { id: FeishuPm.id });
    } catch (error) {
      log("rpc register FAILED", error);
    }

    await ctx.command.transform((editor) => {
      editor.add({
        name: "feishu-pm-status",
        description: "查看飞书变更推送状态",
        execute: async ({ sessionID }) => {
          await say(sessionID, `[feishu-pm]\n${statusText(state)}`);
        },
      });
      editor.add({
        name: "feishu-pm-on",
        description: "开启飞书变更推送",
        execute: async ({ sessionID }) => {
          await ctx.storage.set(ENABLED_KEY, true);
          state.enabled = true;
          const started = startAll();
          await say(
            sessionID,
            `[feishu-pm] ${started ? "已开启" : "配置不完整，未启动"}\n${statusText(state)}`,
          );
        },
      });
      editor.add({
        name: "feishu-pm-off",
        description: "关闭飞书变更推送",
        execute: async ({ sessionID }) => {
          await ctx.storage.set(ENABLED_KEY, false);
          state.enabled = false;
          stopAll();
          await say(sessionID, "[feishu-pm] 已关闭");
        },
      });
      editor.add({
        name: "feishu-pm-restart",
        description: "重启飞书变更推送",
        execute: async ({ sessionID }) => {
          stopAll();
          const started = startAll();
          await say(
            sessionID,
            `[feishu-pm] ${started ? "已重启" : "配置不完整，未启动"}\n${statusText(state)}`,
          );
        },
      });
      editor.add({
        name: "feishu-pm-log",
        description: "查看飞书变更推送最近日志",
        execute: async ({ sessionID }) => {
          await say(sessionID, `[feishu-pm] 最近日志\n${readLogTail(20)}`);
        },
      });
    });

    return () => {
      if (state.owner !== token) return;
      stopAll();
      state.owner = undefined;
    };
  },
});
