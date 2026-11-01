import { appendFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Plugin } from "@opencode/plugin";

/**
 * auto-continue
 *
 * 在开启的会话里，每轮 agent loop 正常结束后自动发送一条续跑提示。
 *
 * 开关：/auto-on、/auto-off（按会话，默认关闭，可用 settings.json 的 enabled 改默认值）
 * 触发：session.execution.succeeded
 * 停止：session.execution.interrupted / session.execution.failed / 中断提示词 / /auto-off
 *
 * 行为：
 * - 不再使用 DONE 标记。任务完成后也不会停，而是继续校验、测试、修复，直到用户中断。
 * - 只处理顶层会话，跳过 subagent 子会话。
 * - 用户按 Esc / Ctrl+C 中断后，该会话不再自动继续，直到用户重新发一条普通消息。
 * - 用户发送“停止”“中断”等中断提示词后，同样停止自动继续。
 * - 默认失败不重试，避免错误循环（可用 continueOnError 打开）。
 * - 只处理当前 location 的会话。
 */

const SOURCE = "auto-continue";
const DEFAULT_TEXT =
  "继续。如果目标已经完成，不要结束任务：继续运行 lint、类型检查、测试和构建，主动找出所有小问题并修复，然后重新校验。重复这个过程，直到用户明确要求停止。";

type AutoContinueOptions = {
  /** 新会话是否默认开启自动继续，默认 false（推荐：用 /auto-on 按会话开启） */
  enabled?: boolean;
  /** 自动发送的内容 */
  text?: string;
  /** 一轮结束后等待多久再发送（毫秒），默认 800 */
  delayMs?: number;
  /** 最多连续自动继续多少轮，0 表示不限制，默认 0 */
  maxRounds?: number;
  /** 本轮失败时是否也继续，默认 false */
  continueOnError?: boolean;
  /** 是否向 stderr 输出调试信息，默认 false */
  debug?: boolean;
};

/** 用户明确要求停止自动继续的短提示词。 */
const STOP_PATTERNS = [
  /^(?:please\s+)?(?:stop|halt|pause|cancel|abort)\b/i,
  /^(?:esc|escape)$/i,
  /^(?:请|麻烦)?(?:停|停止|停下|停一下|中断|暂停|取消|终止|别继续|不要继续|不用继续|不用再继续|到此为止|结束(?:任务|循环)?|够了)/,
];

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const normalizePath = (input: string) =>
  input.replaceAll("\\", "/").replace(/\/+$/, "").toLowerCase();

const isStopIntent = (text: string) => {
  const value = text.trim();
  if (value.length === 0) return false;
  return STOP_PATTERNS.some((pattern) => pattern.test(value));
};

/** 项目级插件可通过 settings.json 配置；opencode 配置里的 options 会覆盖它。 */
const loadFileOptions = (): AutoContinueOptions => {
  try {
    const file = join(dirname(fileURLToPath(import.meta.url)), "settings.json");
    const raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw) as AutoContinueOptions;
  } catch {
    return {};
  }
};

export default Plugin.define({
  id: "hucky.auto-continue",
  async setup(ctx) {
    const options: AutoContinueOptions = {
      ...loadFileOptions(),
      ...(ctx.options ?? {}),
    };
    const enabledByDefault = options.enabled === true;
    const text =
      typeof options.text === "string" && options.text.trim().length > 0
        ? options.text
        : DEFAULT_TEXT;
    const delayMs = Number.isFinite(options.delayMs)
      ? Math.max(0, Number(options.delayMs))
      : 800;
    const maxRounds = Number.isFinite(options.maxRounds)
      ? Math.max(0, Math.floor(Number(options.maxRounds)))
      : 0;
    const continueOnError = options.continueOnError === true;
    const debug = options.debug === true;

    const here = normalizePath(ctx.location.directory);
    const debugFile = join(tmpdir(), "opencode", "auto-continue-debug.log");
    const log = (message: string) =>
      console.error(`[auto-continue] ${message}`);
    const writeDebug = (line: string) => {
      try {
        appendFileSync(debugFile, line, "utf8");
      } catch {
        // ignore
      }
    };
    if (debug) {
      writeDebug(
        `SETUP ${new Date().toISOString()} [${here}] options=${JSON.stringify(options)} url=${String(import.meta?.url)}\n`,
      );
    }
    const trace = (message: string) => {
      if (!debug) return;
      log(message);
      writeDebug(`${new Date().toISOString()} [${here}] ${message}\n`);
    };

    /** sessionID -> 已经连续自动继续的轮次 */
    const rounds = new Map<string, number>();
    /** sessionID -> 待发送的定时器 */
    const pending = new Map<string, ReturnType<typeof setTimeout>>();
    /** 被用户中断、发送停止提示词或失败的会话，收到新的普通消息前不再自动继续 */
    const stopped = new Set<string>();

    /** sessionID -> 该会话是否开启自动继续；未记录时使用 enabledByDefault */
    const enabledSessions = new Map<string, boolean>();
    const storageKey = (sessionID: string) => `session/${sessionID}`;

    const isEnabled = async (sessionID: string) => {
      const cached = enabledSessions.get(sessionID);
      if (cached !== undefined) return cached;
      let value = enabledByDefault;
      try {
        const stored = await ctx.storage.get(storageKey(sessionID));
        if (typeof stored === "boolean") value = stored;
      } catch {
        // storage 不可用时退回默认值
      }
      enabledSessions.set(sessionID, value);
      return value;
    };

    const setEnabled = async (sessionID: string, value: boolean) => {
      enabledSessions.set(sessionID, value);
      try {
        await ctx.storage.set(storageKey(sessionID), value);
      } catch (error) {
        log(
          `failed to persist state for ${sessionID}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      if (!value) cancel(sessionID);
    };

    const controller = new AbortController();

    const cancel = (sessionID: string) => {
      const timer = pending.get(sessionID);
      if (timer !== undefined) {
        clearTimeout(timer);
        pending.delete(sessionID);
      }
    };

    const forget = (sessionID: string) => {
      cancel(sessionID);
      rounds.delete(sessionID);
      stopped.delete(sessionID);
      enabledSessions.delete(sessionID);
      void ctx.storage.remove(storageKey(sessionID)).catch(() => {});
    };

    const continueSession = async (sessionID: string) => {
      try {
        if (stopped.has(sessionID)) return;

        // 该会话没开启就什么都不做
        if (!(await isEnabled(sessionID))) {
          trace(`session ${sessionID} is not enabled, skip`);
          return;
        }

        const info = await ctx.session.get({ sessionID });

        // subagent 子会话不处理
        if (info.parentID) return;

        // 只处理本 location 的会话
        if (normalizePath(info.location.directory) !== here) return;

        const round = rounds.get(sessionID) ?? 0;
        if (maxRounds > 0 && round >= maxRounds) {
          trace(`session ${sessionID} reached maxRounds=${maxRounds}, stop`);
          return;
        }
        if (stopped.has(sessionID)) return;

        rounds.set(sessionID, round + 1);
        trace(
          `session ${sessionID} finished a turn, sending continuation (round ${round + 1})`,
        );

        await ctx.session.prompt({
          sessionID,
          text,
          metadata: { source: SOURCE, round: round + 1 },
        });
      } catch (error) {
        log(
          `failed to continue ${sessionID}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    const schedule = (sessionID: string) => {
      cancel(sessionID);
      const timer = setTimeout(() => {
        pending.delete(sessionID);
        void continueSession(sessionID);
      }, delayMs);
      pending.set(sessionID, timer);
    };

    // 人工消息：取消待发送，重置轮次；停止提示词会保持 stopped 状态。
    const promptHook = await ctx.session.hook("prompt", (event) => {
      const fromPlugin = event.metadata?.source === SOURCE;
      trace(
        `prompt hook: session=${event.sessionID} fromPlugin=${fromPlugin} text=${JSON.stringify(event.prompt?.text)}`,
      );
      if (fromPlugin) return;

      cancel(event.sessionID);
      rounds.set(event.sessionID, 0);

      const promptText =
        typeof event.prompt?.text === "string" ? event.prompt.text : "";
      if (isStopIntent(promptText)) {
        stopped.add(event.sessionID);
        trace(`session ${event.sessionID} got a stop prompt, stop`);
        return;
      }

      stopped.delete(event.sessionID);
      trace(`session ${event.sessionID} got a user prompt, reset`);
    });

    // 按会话开关自动继续（默认关闭）。命令保持静默，不触发额外一轮执行。
    const toggle =
      (value: boolean) =>
      async ({ sessionID }: { sessionID: string }) => {
        await setEnabled(sessionID, value);
        trace(`command: session=${sessionID} -> ${value}`);
      };

    const commandRegistration = await ctx.command.transform((editor) => {
      editor.add({
        name: "auto-on",
        description: "开启当前会话的自动续跑（仅本会话，默认关闭）",
        execute: toggle(true),
      });
      editor.add({
        name: "auto-off",
        description: "关闭当前会话的自动续跑（仅本会话）",
        execute: toggle(false),
      });
    });

    const handle = (event: {
      type: string;
      location?: { directory: string };
      data?: Record<string, unknown>;
    }) => {
      const sessionID =
        typeof event.data?.sessionID === "string"
          ? event.data.sessionID
          : undefined;
      if (!sessionID) return;

      // 事件流是按 location 分发的，先做一次廉价过滤
      if (event.location && normalizePath(event.location.directory) !== here)
        return;

      switch (event.type) {
        case "session.execution.succeeded": {
          schedule(sessionID);
          break;
        }
        case "session.execution.failed": {
          if (continueOnError) schedule(sessionID);
          else {
            stopped.add(sessionID);
            cancel(sessionID);
            trace(`session ${sessionID} failed, stop`);
          }
          break;
        }
        case "session.execution.interrupted": {
          stopped.add(sessionID);
          cancel(sessionID);
          trace(`session ${sessionID} interrupted, stop`);
          break;
        }
        case "session.deleted": {
          forget(sessionID);
          break;
        }
      }
    };

    const pump = async () => {
      while (!controller.signal.aborted) {
        try {
          for await (const event of ctx.event.subscribe({
            signal: controller.signal,
          })) {
            if (controller.signal.aborted) return;
            handle(event as never);
          }
        } catch (error) {
          if (controller.signal.aborted) return;
          log(
            `event stream ended: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        await sleep(2_000);
      }
    };

    void pump();

    trace(
      `loaded for ${here} options=${JSON.stringify({ text, delayMs, maxRounds, continueOnError, debug })}`,
    );

    return async () => {
      controller.abort();
      await promptHook.dispose();
      await commandRegistration.dispose();
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
      rounds.clear();
      stopped.clear();
      enabledSessions.clear();
    };
  },
});
