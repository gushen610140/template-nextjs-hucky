import { listRagLibraries } from "@/lib/ai/rag/service";
import type {
  AiAgentRow,
  AiModelOption,
  RagLibraryOption,
} from "@/lib/ai/types";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AgentsClient } from "./agents-client";

export default async function AgentsPage() {
  await requirePermission(PERMISSIONS.aiManage);

  const [agents, models, libraries] = await Promise.all([
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
        knowledgeBases: { select: { libraryId: true } },
      },
    }),
    prisma.aiModel.findMany({
      where: { kind: "CHAT" },
      orderBy: [
        { provider: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { displayName: "asc" },
      ],
      select: {
        id: true,
        displayName: true,
        isActive: true,
        kind: true,
        inputModalities: true,
        outputModalities: true,
        embeddingDimension: true,
        provider: { select: { name: true } },
      },
    }),
    listRagLibraries(),
  ]);

  const agentRows: AiAgentRow[] = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    modelId: agent.modelId,
    modelName: agent.model.displayName,
    providerName: agent.model.provider.name,
    systemPrompt: agent.systemPrompt,
    knowledgeBaseIds: agent.knowledgeBases.map((item) => item.libraryId),
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
    kind: model.kind,
    inputModalities: model.inputModalities,
    outputModalities: model.outputModalities,
    embeddingDimension: model.embeddingDimension,
  }));

  const libraryOptions: RagLibraryOption[] = libraries.map((library) => ({
    id: library.id,
    name: library.name,
    embeddingModelName: library.embeddingModelName,
    readyFileCount: library.readyFileCount,
  }));

  return (
    <AgentsClient
      agents={agentRows}
      models={modelOptions}
      libraries={libraryOptions}
    />
  );
}
