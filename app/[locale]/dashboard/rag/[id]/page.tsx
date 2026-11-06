import { notFound } from "next/navigation";
import {
  getRagLibrary,
  listLibraryFiles,
  listRagFileCandidates,
  listRagFolderCandidates,
} from "@/lib/ai/rag/service";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { RagLibraryClient } from "./rag-library-client";

export default async function RagLibraryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(PERMISSIONS.aiManage);

  const library = await getRagLibrary(id);
  if (!library) notFound();

  const [files, candidates, folders] = await Promise.all([
    listLibraryFiles(id),
    listRagFileCandidates(user.id),
    listRagFolderCandidates(user.id),
  ]);

  return (
    <RagLibraryClient
      library={{
        id: library.id,
        name: library.name,
        description: library.description,
        embeddingModelName: library.embeddingModel.displayName,
        providerName: library.embeddingModel.provider.name,
        vectorSize: library.vectorSize,
        fileCount: library._count.files,
      }}
      files={files}
      candidates={candidates}
      folders={folders}
    />
  );
}
