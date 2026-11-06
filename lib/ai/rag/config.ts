export type QdrantConfig = {
  url: string;
  apiKey: string | null;
  collection: string;
  vectorSize: number;
};

let cached: QdrantConfig | null = null;

/** 延迟读取 Qdrant 环境变量, 缺失时只在真正访问 RAG 时抛错。 */
export function getQdrantConfig(): QdrantConfig {
  if (cached) return cached;

  const url = process.env.QDRANT_URL?.trim();
  const collection = process.env.QDRANT_COLLECTION?.trim();
  const rawSize = process.env.QDRANT_VECTOR_SIZE?.trim();
  const vectorSize = rawSize ? Number(rawSize) : Number.NaN;

  const missing = [
    ["QDRANT_URL", url],
    ["QDRANT_COLLECTION", collection],
    ["QDRANT_VECTOR_SIZE", rawSize],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Qdrant is not configured. Missing: ${missing.join(", ")}`);
  }

  if (!Number.isInteger(vectorSize) || vectorSize <= 0) {
    throw new Error("QDRANT_VECTOR_SIZE must be a positive integer.");
  }

  cached = {
    url: url as string,
    apiKey: process.env.QDRANT_API_KEY?.trim() || null,
    collection: collection as string,
    vectorSize,
  };
  return cached;
}

export function getQdrantVectorSize(): number {
  return getQdrantConfig().vectorSize;
}
