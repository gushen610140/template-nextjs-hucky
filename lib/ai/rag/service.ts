import { randomUUID } from "node:crypto";
import { resolveEmbeddingModel } from "@/lib/ai/embeddings";
import type {
  ChatCitation,
  RagFileCandidate,
  RagLibraryFileRow,
  RagLibraryRow,
} from "@/lib/ai/types";
import type { RagFileStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { isUniqueConstraintError } from "@/lib/prisma-errors";
import { estimateTokens, RAG_EMBED_BATCH_SIZE, splitIntoChunks } from "./chunk";
import { ensureQdrantCollection, getQdrantClient } from "./client";
import { getQdrantConfig } from "./config";
import { extractFileText } from "./extract";

const NAME_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 300;
const RETRIEVAL_TOP_K = 5;
const RETRIEVAL_SCORE_THRESHOLD = 0.2;
const RETRIEVAL_MAX_CHUNKS = 10;
const RETRIEVAL_MAX_CHARS = 8_000;

/** 单实例内的 worker 互斥, 防止多个轮询请求同时处理同一个文件。 */
const activeJobs = new Set<string>();

type RagPointPayload = {
  chunkId: string;
  libraryId: string;
  libraryFileId: string;
  fileId: string;
  fileName: string;
  chunkIndex: number;
};

function normalizeName(raw: string): string | null {
  const value = raw.trim();
  if (!value || value.length > NAME_MAX_LENGTH) return null;
  return value;
}

function normalizeDescription(raw: string): string | null | "invalid" {
  const value = raw.trim();
  if (value.length > DESCRIPTION_MAX_LENGTH) return "invalid";
  return value || null;
}

function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "unknown";
  return error.message.slice(0, 500);
}

async function removeLibraryFilePoints(input: {
  libraryId: string;
  fileId?: string;
  libraryFileId?: string;
}) {
  const qdrant = getQdrantClient();
  const config = getQdrantConfig();
  const must: Array<Record<string, unknown>> = [
    { key: "libraryId", match: { value: input.libraryId } },
  ];
  if (input.fileId) {
    must.push({ key: "fileId", match: { value: input.fileId } });
  }
  if (input.libraryFileId) {
    must.push({
      key: "libraryFileId",
      match: { value: input.libraryFileId },
    });
  }

  await qdrant.delete(config.collection, {
    wait: true,
    filter: { must },
  });
}

export async function listRagLibraries(): Promise<RagLibraryRow[]> {
  const [libraries, readyCounts] = await Promise.all([
    prisma.ragLibrary.findMany({
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        description: true,
        embeddingModelId: true,
        vectorSize: true,
        createdAt: true,
        updatedAt: true,
        embeddingModel: {
          select: {
            displayName: true,
            provider: { select: { name: true } },
          },
        },
        _count: { select: { files: true, chunks: true } },
      },
    }),
    prisma.ragLibraryFile.groupBy({
      by: ["libraryId"],
      where: { status: "READY" },
      _count: { _all: true },
    }),
  ]);

  const readyByLibrary = new Map(
    readyCounts.map((row) => [row.libraryId, row._count._all]),
  );

  return libraries.map((library) => ({
    id: library.id,
    name: library.name,
    description: library.description,
    embeddingModelId: library.embeddingModelId,
    embeddingModelName: library.embeddingModel.displayName,
    providerName: library.embeddingModel.provider.name,
    vectorSize: library.vectorSize,
    fileCount: library._count.files,
    readyFileCount: readyByLibrary.get(library.id) ?? 0,
    hasVectors: library._count.chunks > 0,
    createdAt: library.createdAt.toISOString(),
    updatedAt: library.updatedAt.toISOString(),
  }));
}

export async function getRagLibrary(id: string) {
  return prisma.ragLibrary.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      embeddingModelId: true,
      vectorSize: true,
      embeddingModel: {
        select: {
          displayName: true,
          kind: true,
          embeddingDimension: true,
          provider: { select: { name: true } },
        },
      },
      _count: { select: { files: true } },
    },
  });
}

async function assertUsableEmbeddingModel(embeddingModelId: string) {
  const model = await prisma.aiModel.findFirst({
    where: {
      id: embeddingModelId,
      kind: "EMBEDDING",
      isActive: true,
      provider: { isActive: true },
    },
    select: {
      id: true,
      embeddingDimension: true,
      outputModalities: true,
    },
  });
  if (!model || !model.embeddingDimension) {
    throw new Error("embedding_model_unavailable");
  }
  if (!model.outputModalities.includes("VECTOR")) {
    throw new Error("embedding_model_unavailable");
  }

  const expected = getQdrantConfig().vectorSize;
  if (model.embeddingDimension !== expected) {
    throw new Error("dimension_mismatch");
  }
  return model;
}

export async function createRagLibrary(
  userId: string,
  input: {
    name: string;
    description: string;
    embeddingModelId: string;
  },
) {
  const name = normalizeName(input.name);
  if (!name) throw new Error("invalid_name");

  const description = normalizeDescription(input.description);
  if (description === "invalid") throw new Error("invalid_description");

  const model = await assertUsableEmbeddingModel(input.embeddingModelId);
  await ensureQdrantCollection();

  try {
    return await prisma.ragLibrary.create({
      data: {
        name,
        description,
        embeddingModelId: model.id,
        vectorSize: model.embeddingDimension as number,
        createdById: userId,
      },
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error("name_taken");
    throw error;
  }
}

export async function updateRagLibrary(input: {
  id: string;
  name: string;
  description: string;
  embeddingModelId: string;
}) {
  const target = await prisma.ragLibrary.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      embeddingModelId: true,
      _count: { select: { chunks: true } },
    },
  });
  if (!target) throw new Error("not_found");

  const name = normalizeName(input.name);
  if (!name) throw new Error("invalid_name");

  const description = normalizeDescription(input.description);
  if (description === "invalid") throw new Error("invalid_description");

  let vectorSize = undefined as number | undefined;
  if (input.embeddingModelId !== target.embeddingModelId) {
    if (target._count.chunks > 0) {
      throw new Error("library_locked");
    }
    const model = await assertUsableEmbeddingModel(input.embeddingModelId);
    vectorSize = model.embeddingDimension as number;
  }

  try {
    await prisma.ragLibrary.update({
      where: { id: target.id },
      data: {
        name,
        description,
        embeddingModelId: input.embeddingModelId,
        ...(vectorSize ? { vectorSize } : {}),
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error("name_taken");
    throw error;
  }
}

export async function deleteRagLibrary(id: string) {
  const library = await prisma.ragLibrary.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!library) throw new Error("not_found");

  await removeLibraryFilePoints({ libraryId: id }).catch((error) => {
    console.error("deleteRagLibrary: qdrant cleanup failed:", error);
  });
  await prisma.ragLibrary.delete({ where: { id } });
}

export async function listLibraryFiles(
  libraryId: string,
): Promise<RagLibraryFileRow[]> {
  const rows = await prisma.ragLibraryFile.findMany({
    where: { libraryId },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      fileId: true,
      status: true,
      chunkCount: true,
      processedChunks: true,
      error: true,
      vectorizedAt: true,
      sourceEtag: true,
      file: {
        select: {
          name: true,
          mimeType: true,
          size: true,
          etag: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    fileId: row.fileId,
    name: row.file.name,
    mimeType: row.file.mimeType,
    size: Number(row.file.size),
    status: row.status as RagFileStatus,
    chunkCount: row.chunkCount,
    processedChunks: row.processedChunks,
    error: row.error,
    vectorizedAt: row.vectorizedAt?.toISOString() ?? null,
    stale:
      row.status === "READY" &&
      Boolean(row.sourceEtag) &&
      row.file.etag !== row.sourceEtag,
  }));
}

export async function listRagFileCandidates(
  ownerId: string,
): Promise<RagFileCandidate[]> {
  const rows = await prisma.fileObject.findMany({
    where: { ownerId, status: "READY" },
    orderBy: [{ createdAt: "desc" }],
    take: 500,
    select: {
      id: true,
      name: true,
      mimeType: true,
      size: true,
      folderId: true,
      createdAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    mimeType: row.mimeType,
    size: Number(row.size),
    folderId: row.folderId,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listRagFolderCandidates(ownerId: string) {
  return prisma.fileFolder.findMany({
    where: { ownerId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, parentId: true },
  });
}

export async function addFilesToLibrary(
  ownerId: string,
  libraryId: string,
  fileIds: string[],
): Promise<number> {
  const library = await prisma.ragLibrary.findUnique({
    where: { id: libraryId },
    select: { id: true },
  });
  if (!library) throw new Error("not_found");

  const uniqueIds = [...new Set(fileIds)];
  const files = await prisma.fileObject.findMany({
    where: {
      id: { in: uniqueIds },
      ownerId,
      status: "READY",
    },
    select: { id: true },
  });
  if (files.length === 0) throw new Error("no_files");

  const result = await prisma.ragLibraryFile.createMany({
    data: files.map((file) => ({ libraryId, fileId: file.id })),
    skipDuplicates: true,
  });
  return result.count;
}

export async function removeFileFromLibrary(libraryId: string, fileId: string) {
  const target = await prisma.ragLibraryFile.findUnique({
    where: { libraryId_fileId: { libraryId, fileId } },
    select: { id: true },
  });
  if (!target) throw new Error("not_found");

  await removeLibraryFilePoints({ libraryId, fileId }).catch((error) => {
    console.error("removeFileFromLibrary: qdrant cleanup failed:", error);
  });
  await prisma.ragLibraryFile.delete({ where: { id: target.id } });
}

async function resetForVectorization(libraryFileId: string) {
  const target = await prisma.ragLibraryFile.findUnique({
    where: { id: libraryFileId },
    select: { id: true, libraryId: true, fileId: true },
  });
  if (!target) throw new Error("not_found");

  await removeLibraryFilePoints({
    libraryId: target.libraryId,
    fileId: target.fileId,
    libraryFileId: target.id,
  }).catch((error) => {
    console.error("resetForVectorization: qdrant cleanup failed:", error);
  });

  await prisma.$transaction([
    prisma.ragChunk.deleteMany({ where: { libraryFileId: target.id } }),
    prisma.ragLibraryFile.update({
      where: { id: target.id },
      data: {
        status: "QUEUED",
        chunkCount: 0,
        processedChunks: 0,
        error: null,
        vectorizedAt: null,
      },
    }),
  ]);
}

export async function enqueueLibraryFile(libraryFileId: string) {
  await resetForVectorization(libraryFileId);
}

export async function enqueueAllLibraryFiles(libraryId: string) {
  const rows = await prisma.ragLibraryFile.findMany({
    where: {
      libraryId,
      status: { in: ["PENDING", "FAILED", "READY"] },
    },
    select: { id: true },
  });
  for (const row of rows) {
    await resetForVectorization(row.id);
  }
  return rows.length;
}

async function prepareChunks(input: {
  id: string;
  libraryId: string;
  fileId: string;
  file: {
    key: string;
    name: string;
    mimeType: string;
    size: bigint;
  };
}) {
  const text = await extractFileText({
    key: input.file.key,
    name: input.file.name,
    mimeType: input.file.mimeType,
    size: Number(input.file.size),
  });
  const chunks = await splitIntoChunks(text);
  if (chunks.length === 0) throw new Error("empty_text");

  await prisma.$transaction(async (tx) => {
    await tx.ragChunk.deleteMany({ where: { libraryFileId: input.id } });
    await tx.ragChunk.createMany({
      data: chunks.map((content, chunkIndex) => ({
        id: randomUUID(),
        libraryFileId: input.id,
        libraryId: input.libraryId,
        fileId: input.fileId,
        chunkIndex,
        content,
        tokenCount: estimateTokens(content),
      })),
    });
    await tx.ragLibraryFile.update({
      where: { id: input.id },
      data: {
        chunkCount: chunks.length,
        processedChunks: 0,
        error: null,
      },
    });
  });

  return chunks.length;
}

/**
 * 处理一个可恢复的向量化任务。
 *
 * 客户端轮询调用; 每次只处理一批 chunk, 因此大文件不会卡住单个请求。
 */
export async function processNextRagJob(): Promise<{
  processed: boolean;
  remaining: number;
}> {
  const layout = await ensureQdrantCollection();

  let job = await prisma.ragLibraryFile.findFirst({
    where: { status: "QUEUED" },
    orderBy: { updatedAt: "asc" },
    include: {
      file: {
        select: {
          id: true,
          key: true,
          name: true,
          mimeType: true,
          size: true,
          etag: true,
        },
      },
      library: {
        select: { id: true, embeddingModelId: true, vectorSize: true },
      },
    },
  });

  if (job) {
    const claimed = await prisma.ragLibraryFile.updateMany({
      where: { id: job.id, status: "QUEUED" },
      data: { status: "PROCESSING" },
    });
    if (claimed.count === 0) job = null;
  }

  if (!job) {
    job = await prisma.ragLibraryFile.findFirst({
      where: { status: "PROCESSING" },
      orderBy: { updatedAt: "asc" },
      include: {
        file: {
          select: {
            id: true,
            key: true,
            name: true,
            mimeType: true,
            size: true,
            etag: true,
          },
        },
        library: {
          select: { id: true, embeddingModelId: true, vectorSize: true },
        },
      },
    });
  }

  if (!job) {
    return { processed: false, remaining: 0 };
  }

  if (activeJobs.has(job.id)) {
    return { processed: false, remaining: await countPendingJobs() };
  }
  activeJobs.add(job.id);

  try {
    const embedding = await resolveEmbeddingModel(job.library.embeddingModelId);
    if (!embedding) throw new Error("embedding_model_unavailable");
    const config = getQdrantConfig();
    if (
      embedding.dimension !== layout.size ||
      job.library.vectorSize !== layout.size
    ) {
      throw new Error("dimension_mismatch");
    }

    if (job.chunkCount === 0) {
      await prepareChunks({
        id: job.id,
        libraryId: job.libraryId,
        fileId: job.fileId,
        file: job.file,
      });
    }

    const chunks = await prisma.ragChunk.findMany({
      where: { libraryFileId: job.id },
      orderBy: { chunkIndex: "asc" },
      skip: job.processedChunks,
      take: RAG_EMBED_BATCH_SIZE,
      select: { id: true, content: true, chunkIndex: true },
    });

    if (chunks.length === 0) {
      await finalizeJob(job.id, job.file.etag);
      return { processed: true, remaining: await countPendingJobs() };
    }

    const vectors = await embedding.embeddings.embedDocuments(
      chunks.map((chunk) => chunk.content),
    );
    if (vectors.some((vector) => vector.length !== layout.size)) {
      throw new Error("dimension_mismatch");
    }

    await getQdrantClient().upsert(config.collection, {
      wait: true,
      points: chunks.map((chunk, index) => ({
        id: chunk.id,
        vector:
          layout.name === null
            ? (vectors[index] as number[])
            : { [layout.name]: vectors[index] as number[] },
        payload: {
          chunkId: chunk.id,
          libraryId: job.libraryId,
          libraryFileId: job.id,
          fileId: job.fileId,
          fileName: job.file.name,
          chunkIndex: chunk.chunkIndex,
        } satisfies RagPointPayload,
      })),
    });

    const processedChunks = job.processedChunks + chunks.length;
    if (processedChunks >= job.chunkCount) {
      await finalizeJob(job.id, job.file.etag, processedChunks);
    } else {
      await prisma.ragLibraryFile.update({
        where: { id: job.id },
        data: { processedChunks },
      });
    }

    return { processed: true, remaining: await countPendingJobs() };
  } catch (error) {
    console.error("processNextRagJob failed:", error);
    await prisma.ragLibraryFile.update({
      where: { id: job.id },
      data: { status: "FAILED", error: errorMessage(error) },
    });
    return { processed: true, remaining: await countPendingJobs() };
  } finally {
    activeJobs.delete(job.id);
  }
}

async function finalizeJob(
  id: string,
  etag: string | null,
  processedChunks?: number,
) {
  await prisma.ragLibraryFile.update({
    where: { id },
    data: {
      status: "READY",
      error: null,
      sourceEtag: etag,
      vectorizedAt: new Date(),
      ...(processedChunks === undefined ? {} : { processedChunks }),
    },
  });
}

async function countPendingJobs() {
  return prisma.ragLibraryFile.count({
    where: { status: { in: ["QUEUED", "PROCESSING"] } },
  });
}

export type RagRetrievalResult = {
  context: string;
  citations: ChatCitation[];
};

/**
 * 用每个知识库自己的 embedding 模型检索, 合并后按相似度排序。
 * 检索失败不会阻断对话, 调用方可以当作空上下文处理。
 */
export async function retrieveKnowledge(
  libraryIds: string[],
  query: string,
): Promise<RagRetrievalResult> {
  if (libraryIds.length === 0 || !query.trim()) {
    return { context: "", citations: [] };
  }

  const libraries = await prisma.ragLibrary.findMany({
    where: { id: { in: libraryIds } },
    select: {
      id: true,
      name: true,
      embeddingModelId: true,
    },
  });
  if (libraries.length === 0) return { context: "", citations: [] };

  const config = getQdrantConfig();
  const layout = await ensureQdrantCollection();
  const qdrant = getQdrantClient();
  const hits: Array<{
    chunkId: string;
    libraryId: string;
    libraryName: string;
    score: number;
    payload: RagPointPayload;
  }> = [];

  for (const library of libraries) {
    const embedding = await resolveEmbeddingModel(library.embeddingModelId);
    if (!embedding || embedding.dimension !== layout.size) continue;

    const queryVector = await embedding.embeddings.embedQuery(query);
    const points = await qdrant.query(config.collection, {
      query: queryVector,
      ...(layout.name === null ? {} : { using: layout.name }),
      limit: RETRIEVAL_TOP_K,
      score_threshold: RETRIEVAL_SCORE_THRESHOLD,
      with_payload: true,
      filter: {
        must: [{ key: "libraryId", match: { value: library.id } }],
      },
    });

    for (const point of points.points) {
      const payload = point.payload as RagPointPayload | null;
      if (!payload?.chunkId) continue;
      hits.push({
        chunkId: payload.chunkId,
        libraryId: library.id,
        libraryName: library.name,
        score: point.score,
        payload,
      });
    }
  }

  if (hits.length === 0) return { context: "", citations: [] };

  hits.sort((a, b) => b.score - a.score);
  const selected = hits.slice(0, RETRIEVAL_MAX_CHUNKS);
  const chunks = await prisma.ragChunk.findMany({
    where: { id: { in: selected.map((hit) => hit.chunkId) } },
    select: { id: true, content: true, chunkIndex: true },
  });
  const contentById = new Map(chunks.map((chunk) => [chunk.id, chunk]));

  const citations: ChatCitation[] = [];
  const sections: string[] = [];
  let usedChars = 0;

  for (const hit of selected) {
    const chunk = contentById.get(hit.chunkId);
    if (!chunk) continue;

    const section = `[知识库: ${hit.libraryName} | 文件: ${hit.payload.fileName} | 相似度: ${hit.score.toFixed(3)}]\n${chunk.content}`;
    if (usedChars + section.length > RETRIEVAL_MAX_CHARS) break;
    usedChars += section.length;
    sections.push(section);

    citations.push({
      libraryId: hit.libraryId,
      libraryName: hit.libraryName,
      fileId: hit.payload.fileId,
      fileName: hit.payload.fileName,
      chunkIndex: chunk.chunkIndex,
      score: Number(hit.score.toFixed(4)),
    });
  }

  return {
    context: sections.join("\n\n---\n\n"),
    citations,
  };
}
