import type { AiAgentRow, AiModelOption } from "@/lib/ai/types";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AgentsClient } from "./agents-client";

export default async function AgentsPage() {
  await requirePermission(PERMISSIONS.aiManage);

  const [agents, models] = await Promise.all([
    prisma.aiAgent.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        modelId: true,
        systemPrompt: true,
        isActive: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        model: {
          select: {
            displayName: true,
            provider: { select: { name: true } },
          },
        },
      },
    }),
    prisma.aiModel.findMany({
      orderBy: [
        { provider: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { displayName: "asc" },
      ],
      select: {
        id: true,
        displayName: true,
        isActive: true,
        provider: { select: { name: true } },
      },
    }),
  ]);

  const agentRows: AiAgentRow[] = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    modelId: agent.modelId,
    modelName: agent.model.displayName,
    providerName: agent.model.provider.name,
    systemPrompt: agent.systemPrompt,
    isActive: agent.isActive,
    sortOrder: agent.sortOrder,
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString(),
  }));

  const modelOptions: AiModelOption[] = models.map((model) => ({
    id: model.id,
    displayName: model.displayName,
    providerName: model.provider.name,
    isActive: model.isActive,
  }));

  return <AgentsClient agents={agentRows} models={modelOptions} />;
}
