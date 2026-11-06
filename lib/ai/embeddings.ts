import type { Embeddings } from "@langchain/core/embeddings";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { decryptSecret } from "@/lib/ai/crypto";
import { prisma } from "@/lib/prisma";

export type ResolvedEmbeddingModel = {
  providerId: string;
  providerName: string;
  /** AiModel.id */
  modelId: string;
  modelName: string;
  requestModelId: string;
  dimension: number;
  embeddings: Embeddings;
};

type CacheEntry = {
  version: string;
  resolved: ResolvedEmbeddingModel;
};

const CACHE_LIMIT = 30;
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

/**
 * 把数据库里的向量模型解析成 LangChain embeddings。
 *
 * 与对话模型分开缓存, 避免修改聊天模型时清空向量实例。
 * 目前覆盖 OpenAI / OpenAI 兼容 / Google; Anthropic 没有 embeddings。
 */
export async function resolveEmbeddingModel(
  modelId: string,
): Promise<ResolvedEmbeddingModel | null> {
  const model = await prisma.aiModel.findFirst({
    where: {
      id: modelId,
      kind: "EMBEDDING",
      isActive: true,
      embeddingDimension: { not: null },
      provider: { isActive: true },
    },
    select: {
      id: true,
      modelId: true,
      displayName: true,
      embeddingDimension: true,
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

  if (!model || !model.embeddingDimension) return null;

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

  let embeddings: Embeddings;
  switch (model.provider.type) {
    case "OPENAI":
    case "OPENAI_COMPATIBLE":
      embeddings = new OpenAIEmbeddings({
        apiKey,
        model: model.modelId,
        dimensions: model.embeddingDimension,
        configuration: model.provider.baseUrl
          ? { baseURL: model.provider.baseUrl }
          : undefined,
        ...params,
      });
      break;
    case "GOOGLE":
      embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey,
        model: model.modelId,
        ...params,
      });
      break;
    default:
      return null;
  }

  const resolved: ResolvedEmbeddingModel = {
    providerId: model.provider.id,
    providerName: model.provider.name,
    modelId: model.id,
    modelName: model.displayName,
    requestModelId: model.modelId,
    dimension: model.embeddingDimension,
    embeddings,
  };

  setCache(model.id, { version, resolved });
  return resolved;
}

export function invalidateEmbeddingCache(modelId?: string) {
  if (modelId) {
    cache.delete(modelId);
    return;
  }
  cache.clear();
}
