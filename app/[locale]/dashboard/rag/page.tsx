import { getQdrantVectorSize } from "@/lib/ai/rag/config";
import { listRagLibraries } from "@/lib/ai/rag/service";
import type { AiModelOption } from "@/lib/ai/types";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { RagLibrariesClient } from "./rag-libraries-client";

export default async function RagPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  await requirePermission(PERMISSIONS.aiManage);
  const { create } = await searchParams;

  let vectorSize = 0;
  try {
    vectorSize = getQdrantVectorSize();
  } catch (error) {
    console.error("RAG vector size is not configured:", error);
  }

  const [libraries, models] = await Promise.all([
    listRagLibraries(),
    vectorSize > 0
      ? prisma.aiModel.findMany({
          where: {
            kind: "EMBEDDING",
            isActive: true,
            embeddingDimension: vectorSize,
            provider: { isActive: true },
          },
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
        })
      : Promise.resolve([]),
  ]);

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

  return (
    <RagLibrariesClient
      libraries={libraries}
      models={modelOptions}
      vectorSize={vectorSize}
      initialCreate={Boolean(create)}
    />
  );
}
