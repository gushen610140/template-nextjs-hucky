import {
  appendFileSync,
  createReadStream,
  existsSync,
  readFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Plugin } from "@opencode/plugin";
import { type NotifyTarget, startScreenshotWatcher } from "./screenshot";

const HERE = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = join(HERE, "debug.log");
const ENV_FILE = join(HERE, ".env");
const GLOBAL_KEY = "__hucky_feishu_pm__";

type PmState = {
  owner?: symbol;
  watcher?: { stop: () => void };
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
  if (!holder[GLOBAL_KEY]) holder[GLOBAL_KEY] = {};
  return holder[GLOBAL_KEY] as PmState;
}

/**
 * 推送目标只来自配置，不依赖接收消息，因此客户 bot 不需要长连接和事件订阅。
 */
function resolveTarget(): NotifyTarget | undefined {
  const chatId = process.env.FEISHU_NOTIFY_CHAT_ID?.trim();
  if (chatId) return { receiveIdType: "chat_id", receiveId: chatId };
  const openId = process.env.FEISHU_NOTIFY_OPEN_ID?.trim();
  if (openId) return { receiveIdType: "open_id", receiveId: openId };
  return undefined;
}

export default Plugin.define({
  id: "hucky.feishu-pm",

  async setup(ctx) {
    loadEnvFile();

    if (process.env.FEISHU_PM_ENABLED === "0") {
      log("disabled by FEISHU_PM_ENABLED=0");
      return;
    }

    const appId = process.env.FEISHU_APP_ID?.trim();
    const appSecret = process.env.FEISHU_APP_SECRET?.trim();
    if (!appId || !appSecret) {
      log("missing FEISHU_APP_ID / FEISHU_APP_SECRET");
      return;
    }

    const target = resolveTarget();
    if (!target) {
      log("missing FEISHU_NOTIFY_CHAT_ID / FEISHU_NOTIFY_OPEN_ID");
      return;
    }

    let Lark: typeof import("@larksuiteoapi/node-sdk");
    try {
      Lark = await import("@larksuiteoapi/node-sdk");
    } catch (error) {
      log("sdk import FAILED", error);
      return;
    }

    const state = getState();
    const token = Symbol("feishu-pm");
    state.owner = token;
    // 重载时先停掉旧 watcher，避免两个定时器同时触发。
    state.watcher?.stop();
    state.watcher = undefined;

    const client = new Lark.Client({ appId, appSecret });

    const sendText = async (to: NotifyTarget, text: string) => {
      await client.im.message.create({
        params: { receive_id_type: to.receiveIdType },
        data: {
          receive_id: to.receiveId,
          msg_type: "text",
          content: JSON.stringify({ text }),
        },
      });
    };

    const sendImage = async (to: NotifyTarget, filePath: string) => {
      const uploaded = (await client.im.image.create({
        data: {
          image_type: "message",
          image: createReadStream(filePath),
        },
      })) as { image_key?: string; data?: { image_key?: string } };
      const imageKey = uploaded?.image_key ?? uploaded?.data?.image_key;
      if (!imageKey) throw new Error("图片上传失败：没有返回 image_key");
      await client.im.message.create({
        params: { receive_id_type: to.receiveIdType },
        data: {
          receive_id: to.receiveId,
          msg_type: "image",
          content: JSON.stringify({ image_key: imageKey }),
        },
      });
    };

    const watcher = startScreenshotWatcher({
      directory: ctx.location.directory,
      log,
      storageGet: (key) => ctx.storage.get(key),
      storageSet: (key, value) => ctx.storage.set(key, value),
      getTarget: async () => resolveTarget(),
      sendImage,
      sendText,
      onStatus: () => {},
    });

    state.watcher = watcher;
    log("watcher started", {
      directory: ctx.location.directory,
      target: target.receiveIdType,
    });

    return () => {
      if (state.owner !== token) return;
      watcher.stop();
      if (state.watcher === watcher) state.watcher = undefined;
      state.owner = undefined;
    };
  },
});
