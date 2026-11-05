import type { AiModelRow, AiProviderRow } from "@/lib/ai/types";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ModelsClient } from "./models-client";

export default async function ModelsPage() {
  await requirePermission(PERMISSIONS.aiManage);

  const [models, providers] = await Promise.all([
    prisma.aiModel.findMany({
      orderBy: [
        { provider: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { displayName: "asc" },
      ],
      select: {
        id: true,
        providerId: true,
        modelId: true,
        displayName: true,
        contextWindow: true,
        maxTokens: true,
        temperature: true,
        isActive: true,
        isDefault: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        provider: {
          select: { name: true, type: true },
        },
      },
    }),
    prisma.aiProvider.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        baseUrl: true,
        isActive: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { models: true } },
      },
    }),
  ]);

  const modelRows: AiModelRow[] = models.map((model) => ({
    id: model.id,
    providerId: model.providerId,
    providerName: model.provider.name,
    providerType: model.provider.type,
    modelId: model.modelId,
    displayName: model.displayName,
    contextWindow: model.contextWindow,
    maxTokens: model.maxTokens,
    temperature: model.temperature,
    isActive: model.isActive,
    isDefault: model.isDefault,
    sortOrder: model.sortOrder,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  }));

  const providerRows: AiProviderRow[] = providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    type: provider.type,
    baseUrl: provider.baseUrl,
    isActive: provider.isActive,
    sortOrder: provider.sortOrder,
    modelCount: provider._count.models,
    apiKeyLast4: null,
    createdAt: provider.createdAt.toISOString(),
    updatedAt: provider.updatedAt.toISOString(),
  }));

  return <ModelsClient models={modelRows} providers={providerRows} />;
}
