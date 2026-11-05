import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { decryptSecret } from "@/lib/ai/crypto";
import { createChatModel } from "@/lib/ai/provider-factory";
import type { AiCatalog, AiCatalogProvider } from "@/lib/ai/types";
import { prisma } from "@/lib/prisma";

export type ResolvedChatModel = {
  providerId: string;
  providerName: string;
  /** AiModel.id */
  modelId: string;
  /** 用户可见名称 */
  modelName: string;
  /** 供应商侧的请求标识 */
  requestModelId: string;
  contextWindow: number | null;
  maxTokens: number | null;
  chatModel: BaseChatModel;
};

type CacheEntry = {
  version: string;
  resolved: ResolvedChatModel;
};

const CACHE_LIMIT = 50;
const cache = new Map<string, CacheEntry>();

function setCache(key: string, entry: CacheEntry) {
  cache.delete(key);
  cache.set(key, entry);

  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
}

/** 可供普通用户选择的供应商 / 模型目录; 只返回启用中的组合。 */
export async function getActiveCatalog(): Promise<AiCatalog> {
  const providers = await prisma.aiProvider.findMany({
    where: {
      isActive: true,
      models: { some: { isActive: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      models: {
        where: { isActive: true },
        orderBy: [
          { isDefault: "desc" },
          { sortOrder: "asc" },
          { displayName: "asc" },
        ],
        select: {
          id: true,
          modelId: true,
          displayName: true,
          contextWindow: true,
          isDefault: true,
        },
      },
    },
  });

  const catalog: AiCatalog = {
    providers: providers.map<AiCatalogProvider>((provider) => ({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      models: provider.models,
    })),
  };

  return catalog;
}

/**
 * 把数据库里的模型解析成可调用的 LangChain chat model。
 *
 * 每次读取供应商和模型的最新更新时间作为缓存版本; 管理端修改配置或
 * 更换密钥后, 下一次请求会自然重建实例。
 */
export async function resolveChatModel(
  modelId: string,
): Promise<ResolvedChatModel | null> {
  const model = await prisma.aiModel.findFirst({
    where: {
      id: modelId,
      isActive: true,
      provider: { isActive: true },
    },
    select: {
      id: true,
      modelId: true,
      displayName: true,
      contextWindow: true,
      maxTokens: true,
      temperature: true,
      params: true,
      updatedAt: true,
      provider: {
        select: {
          id: true,
          name: true,
          type: true,
          baseUrl: true,
          apiKeyCipher: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!model) return null;

  const version = `${model.updatedAt.getTime()}:${model.provider.updatedAt.getTime()}`;
  const cached = cache.get(model.id);
  if (cached && cached.version === version) {
    return cached.resolved;
  }

  const apiKey = decryptSecret(model.provider.apiKeyCipher);
  const params =
    model.params &&
    typeof model.params === "object" &&
    !Array.isArray(model.params)
      ? (model.params as Record<string, unknown>)
      : {};

  const resolved: ResolvedChatModel = {
    providerId: model.provider.id,
    providerName: model.provider.name,
    modelId: model.id,
    modelName: model.displayName,
    requestModelId: model.modelId,
    contextWindow: model.contextWindow,
    maxTokens: model.maxTokens,
    chatModel: createChatModel({
      providerType: model.provider.type,
      baseUrl: model.provider.baseUrl,
      apiKey,
      modelId: model.modelId,
      maxTokens: model.maxTokens,
      temperature: model.temperature,
      params,
    }),
  };

  setCache(model.id, { version, resolved });
  return resolved;
}

export function invalidateModelCache(modelId?: string) {
  if (modelId) {
    cache.delete(modelId);
    return;
  }
  cache.clear();
}
