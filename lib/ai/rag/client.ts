import { QdrantClient } from "@qdrant/js-client-rest";
import { getQdrantConfig } from "./config";

let client: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (client) return client;

  const config = getQdrantConfig();
  const parsed = new URL(config.url);
  const isHttps = parsed.protocol === "https:";
  const prefix = parsed.pathname.replace(/^\/+|\/+$/g, "");

  client = new QdrantClient({
    host: parsed.hostname,
    https: isHttps,
    port: parsed.port ? Number(parsed.port) : isHttps ? 443 : 6333,
    prefix: prefix || undefined,
    apiKey: config.apiKey ?? undefined,
    checkCompatibility: false,
  });
  return client;
}

export type QdrantVectorLayout = {
  /** 默认匿名向量为 null; 命名向量(包括空字符串名)为实际名称。 */
  name: string | null;
  size: number;
  distance: string | null;
};

type RawVectorConfig = {
  size?: number;
  distance?: string;
};

let layoutCache: QdrantVectorLayout | null = null;

function readVectorLayout(params: unknown): QdrantVectorLayout {
  if (!params || typeof params !== "object") {
    throw new Error("Qdrant collection has no vector configuration.");
  }
  const vectors = (params as { vectors?: unknown }).vectors;
  if (!vectors || typeof vectors !== "object") {
    throw new Error("Qdrant collection has no vector configuration.");
  }

  // 默认匿名向量: { size, distance }
  if ("size" in vectors) {
    const vector = vectors as RawVectorConfig;
    if (!vector.size) {
      throw new Error("Qdrant collection vector size is missing.");
    }
    return {
      name: null,
      size: vector.size,
      distance: vector.distance ?? null,
    };
  }

  // 命名向量: { name: { size, distance } }
  const entries = Object.entries(vectors as Record<string, RawVectorConfig>);
  if (entries.length !== 1) {
    throw new Error("Qdrant collection must use exactly one vector for RAG.");
  }
  const [name, vector] = entries[0] as [string, RawVectorConfig];
  if (!vector?.size) {
    throw new Error("Qdrant collection vector size is missing.");
  }
  return {
    name,
    size: vector.size,
    distance: vector.distance ?? null,
  };
}

/**
 * 读取 collection 的向量布局并校验维度 / 距离。
 *
 * 兼容两种创建方式: 默认匿名向量, 以及 Qdrant 控制台创建的单个命名向量。
 */
export async function getQdrantVectorLayout(): Promise<QdrantVectorLayout> {
  if (layoutCache) return layoutCache;

  const config = getQdrantConfig();
  const info = await getQdrantClient().getCollection(config.collection);
  const layout = readVectorLayout(info.config?.params);

  if (layout.size !== config.vectorSize) {
    throw new Error(
      `Qdrant vector size mismatch: collection=${layout.size}, env=${config.vectorSize}.`,
    );
  }
  if (layout.distance && layout.distance !== "Cosine") {
    throw new Error(
      `Qdrant collection "${config.collection}" must use Cosine distance.`,
    );
  }

  layoutCache = layout;
  return layout;
}

/**
 * 确保 collection 存在且维度 / 距离与当前配置一致。
 *
 * 用户已经在 Qdrant 建好 collection 时这里只做校验, 不会修改既有数据。
 */
export async function ensureQdrantCollection(): Promise<QdrantVectorLayout> {
  const config = getQdrantConfig();
  const qdrant = getQdrantClient();
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some(
    (item) => item.name === config.collection,
  );

  if (!exists) {
    await qdrant.createCollection(config.collection, {
      vectors: { size: config.vectorSize, distance: "Cosine" },
    });
    layoutCache = null;
  }

  return getQdrantVectorLayout();
}

export function invalidateQdrantLayout() {
  layoutCache = null;
}
