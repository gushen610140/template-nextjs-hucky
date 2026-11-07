/**
 * 飞书侧命令。每个命令返回 true 表示已处理，不再进入 prompt。
 */

export type StoredChat = {
  sessionID: string;
  createdAt: string;
  model?: { providerID: string; id: string };
  agent?: string;
};

type ModelInfo = {
  providerID: string;
  id: string;
  modelID?: string;
  name?: string;
  type?: string;
  enabled?: boolean;
};

type AgentInfo = {
  id: string;
  name?: string;
  mode?: string;
  hidden?: boolean;
};

type Deps = {
  ctx: any;
  state: {
    wsState: string;
    messageCount: number;
    busyChats: string[];
  };
  sendText: (messageId: string, text: string) => Promise<void>;
  readChat: (chatId: string) => Promise<StoredChat | undefined>;
  writeChat: (chatId: string, patch: Partial<StoredChat>) => Promise<StoredChat>;
  newSession: (chatId: string) => Promise<string>;
  readMeta: (sessionID: string) => Promise<string>;
  log: (message: string, extra?: unknown) => void;
};

const HELP = [
  "命令：",
  "/new [目录]        新建会话，可指定工作目录",
  "/model             查看当前模型",
  "/model <关键词>    搜索模型",
  "/model #<编号>     选择搜索结果",
  "/model provider/model  直接指定",
  "/agent             查看可用 agent",
  "/agent <名称>      切换 agent（build / plan 等）",
  "/session           当前会话",
  "/session list      最近会话",
  "/session <编号|id> 绑定已有会话",
  "/cwd               工作目录",
  "/compact           压缩上下文",
  "/stop              中断当前任务",
  "/status            运行状态",
].join("\n");

const modelRef = (model: ModelInfo) => `${model.providerID}/${model.modelID ?? model.id}`;

export function createCommandHandler(deps: Deps) {
  const { ctx, state, sendText, readChat, writeChat, newSession, readMeta, log } = deps;
  const modelCache = new Map<string, string[]>();

  const listModels = async () => {
    const result = await ctx.model.list();
    return (result.data as ModelInfo[]).filter(
      (model) => model.type === "chat" && model.enabled !== false,
    );
  };

  const listAgents = async () => {
    const result = await ctx.agent.list();
    return (result.data as AgentInfo[]).filter(
      (agent) => agent.mode !== "subagent" && !agent.hidden,
    );
  };

  const modelLabel = async (ref: { providerID: string; id: string }) => {
    try {
      const models = await listModels();
      const found = models.find(
        (model) =>
          model.providerID === ref.providerID &&
          (model.modelID === ref.id || model.id === ref.id),
      );
      return found?.name ?? `${ref.providerID}/${ref.id}`;
    } catch {
      return `${ref.providerID}/${ref.id}`;
    }
  };

  const currentSession = async (chatId: string) => {
    const stored = await readChat(chatId);
    if (!stored?.sessionID) return undefined;
    try {
      return await ctx.session.get({ sessionID: stored.sessionID });
    } catch {
      return undefined;
    }
  };

  const applyModel = async (
    chatId: string,
    sessionID: string,
    providerID: string,
    id: string,
  ) => {
    await ctx.session.switchModel({ sessionID, model: { providerID, id } });
    await writeChat(chatId, { model: { providerID, id } });
    return modelLabel({ providerID, id });
  };

  const handleModel = async (chatId: string, messageId: string, arg: string) => {
    const session = await currentSession(chatId);
    if (!session) {
      await sendText(messageId, "当前没有会话，先发一条消息或 /new");
      return;
    }

    if (arg.length === 0) {
      const stored = await readChat(chatId);
      const ref = session.model ?? stored?.model;
      const label = ref ? await modelLabel(ref) : "未指定";
      await sendText(
        messageId,
        [
          `当前模型: ${label}${ref ? ` (${ref.providerID}/${ref.id})` : ""}`,
          "用 /model <关键词> 搜索，或 /model provider/model 直接指定",
        ].join("\n"),
      );
      return;
    }

    if (arg.startsWith("#")) {
      const index = Number(arg.slice(1)) - 1;
      const cached = modelCache.get(chatId) ?? [];
      const picked = cached[index];
      if (!picked) {
        await sendText(messageId, `没有 #${index + 1}，先 /model <关键词> 搜索`);
        return;
      }
      const [providerID, ...rest] = picked.split("/");
      const label = await applyModel(chatId, session.id, providerID, rest.join("/"));
      await sendText(messageId, `已切换模型: ${label}`);
      return;
    }

    if (arg.includes("/")) {
      const [providerID, ...rest] = arg.split("/");
      const id = rest.join("/");
      if (!providerID || !id) {
        await sendText(messageId, "格式应为 provider/model");
        return;
      }
      const label = await applyModel(chatId, session.id, providerID, id);
      await sendText(messageId, `已切换模型: ${label}`);
      return;
    }

    const keyword = arg.toLowerCase();
    const matched = (await listModels())
      .filter((model) => `${modelRef(model)} ${model.name ?? ""}`.toLowerCase().includes(keyword))
      .slice(0, 10);

    if (matched.length === 0) {
      await sendText(messageId, `没有匹配 "${arg}" 的模型`);
      return;
    }

    modelCache.set(chatId, matched.map(modelRef));
    await sendText(
      messageId,
      [
        `匹配 "${arg}":`,
        ...matched.map((model, index) => `#${index + 1} ${modelRef(model)} — ${model.name ?? ""}`),
        "用 /model #1 选择",
      ].join("\n"),
    );
  };

  const handleAgent = async (chatId: string, messageId: string, arg: string) => {
    const session = await currentSession(chatId);
    if (!session) {
      await sendText(messageId, "当前没有会话，先发一条消息或 /new");
      return;
    }

    const agents = await listAgents();
    const current = session.agent ?? (await readChat(chatId))?.agent;

    if (arg.length === 0) {
      await sendText(
        messageId,
        [
          `当前 agent: ${current ?? "未指定"}`,
          "可用:",
          ...agents.map((agent) => `- ${agent.id}${agent.name ? ` (${agent.name})` : ""}`),
          "用 /agent <名称> 切换",
        ].join("\n"),
      );
      return;
    }

    if (!agents.some((agent) => agent.id === arg)) {
      await sendText(messageId, `没有 agent "${arg}"，可用: ${agents.map((a) => a.id).join(", ")}`);
      return;
    }

    await ctx.session.switchAgent({ sessionID: session.id, agent: arg });
    await writeChat(chatId, { agent: arg });
    await sendText(messageId, `已切换 agent: ${arg}`);
  };

  const handleSession = async (chatId: string, messageId: string, arg: string) => {
    if (arg === "list" || arg === "") {
      const page = await ctx.session.list({
        directory: ctx.location.directory,
        limit: 10,
        order: "desc",
      });
      const sessions = page.data as Array<{ id: string; title?: string; time?: { updated?: number } }>;
      const stored = await readChat(chatId);
      await sendText(
        messageId,
        [
          stored?.sessionID ? `当前: ${stored.sessionID}` : "当前: 未绑定",
          "最近会话:",
          ...sessions.map(
            (item, index) => `#${index + 1} ${item.id} ${item.title ?? ""}`.trim(),
          ),
          "用 /session #1 或 /session <id> 绑定",
        ].join("\n"),
      );
      return;
    }

    let targetID = arg;
    if (arg.startsWith("#")) {
      const index = Number(arg.slice(1)) - 1;
      const page = await ctx.session.list({
        directory: ctx.location.directory,
        limit: 10,
        order: "desc",
      });
      const sessions = page.data as Array<{ id: string }>;
      const picked = sessions[index];
      if (!picked) {
        await sendText(messageId, `没有 #${index + 1}`);
        return;
      }
      targetID = picked.id;
    }

    try {
      const session = await ctx.session.get({ sessionID: targetID });
      await writeChat(chatId, {
        sessionID: session.id,
        model: undefined,
        agent: undefined,
      });
      await sendText(messageId, `已绑定会话\n${session.id}\n${session.title ?? ""}`.trim());
    } catch {
      await sendText(messageId, `会话不存在: ${targetID}`);
    }
  };

  return async (chatId: string, messageId: string, text: string) => {
    const [command, ...rest] = text.split(/\s+/);
    const arg = rest.join(" ").trim();

    if (command === "/help") {
      await sendText(messageId, HELP);
      return true;
    }

    if (command === "/new") {
      const sessionID = await newSession(chatId);
      if (arg.length > 0) {
        try {
          await ctx.session.move({ sessionID, directory: arg });
          await sendText(messageId, `已新建会话并切到 ${arg}\n${sessionID}`);
        } catch (error) {
          log("move session failed", error);
          const reason = error instanceof Error ? error.message : String(error);
          await sendText(messageId, `已新建会话 ${sessionID}\n切目录失败: ${reason}`);
        }
      } else {
        await sendText(messageId, `已新建会话\n${sessionID}`);
      }
      return true;
    }

    if (command === "/model") {
      await handleModel(chatId, messageId, arg);
      return true;
    }

    if (command === "/agent") {
      await handleAgent(chatId, messageId, arg);
      return true;
    }

    if (command === "/session") {
      await handleSession(chatId, messageId, arg);
      return true;
    }

    if (command === "/cwd") {
      const session = await currentSession(chatId);
      await sendText(messageId, session?.location?.directory ?? ctx.location.directory);
      return true;
    }

    if (command === "/compact") {
      const session = await currentSession(chatId);
      if (!session) {
        await sendText(messageId, "当前没有会话");
        return true;
      }
      await ctx.session.compact({ sessionID: session.id });
      await sendText(messageId, "已请求压缩，下个 step 边界生效");
      return true;
    }

    if (command === "/stop") {
      const session = await currentSession(chatId);
      if (!session) {
        await sendText(messageId, "当前没有会话");
        return true;
      }
      await ctx.session.interrupt({ sessionID: session.id, resume: false });
      await sendText(messageId, "已中断");
      return true;
    }

    if (command === "/status") {
      const stored = await readChat(chatId);
      const session = await currentSession(chatId);
      const meta = session ? await readMeta(session.id) : "无会话";
      await sendText(
        messageId,
        [
          `session: ${stored?.sessionID ?? "未绑定"}`,
          `meta: ${meta}`,
          `busy: ${state.busyChats.includes(chatId)}`,
          `ws: ${state.wsState}`,
          `events: ${state.messageCount}`,
        ].join("\n"),
      );
      return true;
    }

    if (command.startsWith("/")) {
      await sendText(messageId, `未知命令: ${command}\n/help 查看可用命令`);
      return true;
    }

    return false;
  };
}
