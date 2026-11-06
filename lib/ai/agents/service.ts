import { type ResolvedChatModel, resolveChatModel } from "@/lib/ai/models";
import type { ChatAgentOption } from "@/lib/ai/types";
import { prisma } from "@/lib/prisma";

/**
 * 智能体运行时。
 *
 * 聊天路径只依赖这个结构。后续接入 RAG / skills 时, 在
 * `resolveAgentRuntime` 里把检索上下文、工具或技能合并进 systemPrompt,
 * 或扩展 `tools` 字段, 不需要改动对话接口和客户端协议。
 */
export type AgentRuntime = {
  id: string;
  name: string;
  systemPrompt: string;
  model: ResolvedChatModel;
};

/** 普通用户可选的已启用智能体; 模型或供应商停用后自动从列表消失。 */
export async function getActiveAgents(): Promise<ChatAgentOption[]> {
  const agents = await prisma.aiAgent.findMany({
    where: {
      isActive: true,
      model: { isActive: true, provider: { isActive: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      model: {
        select: {
          displayName: true,
          provider: { select: { name: true } },
        },
      },
    },
  });

  return agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    providerName: agent.model.provider.name,
    modelName: agent.model.displayName,
  }));
}

/**
 * 把智能体解析成可直接调用的运行时。
 *
 * 智能体或模型被停用、模型配置不可用时返回 null。每次对话都会重新解析,
 * 因此管理员修改提示词或换模型后, 下一条消息立即生效。
 */
export async function resolveAgentRuntime(
  agentId: string,
): Promise<AgentRuntime | null> {
  const agent = await prisma.aiAgent.findFirst({
    where: { id: agentId, isActive: true },
    select: {
      id: true,
      name: true,
      systemPrompt: true,
      modelId: true,
    },
  });
  if (!agent) return null;

  const model = await resolveChatModel(agent.modelId);
  if (!model) return null;

  return {
    id: agent.id,
    name: agent.name,
    systemPrompt: agent.systemPrompt.trim(),
    model,
  };
}
