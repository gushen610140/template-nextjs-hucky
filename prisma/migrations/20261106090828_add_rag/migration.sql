-- CreateEnum
CREATE TYPE "AiModelKind" AS ENUM ('CHAT', 'EMBEDDING');

-- CreateEnum
CREATE TYPE "AiModality" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'VECTOR');

-- CreateEnum
CREATE TYPE "RagFileStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "AiMessage" ADD COLUMN     "citations" JSONB;

-- AlterTable
ALTER TABLE "AiModel" ADD COLUMN     "embeddingDimension" INTEGER,
ADD COLUMN     "inputModalities" "AiModality"[] DEFAULT ARRAY[]::"AiModality"[],
ADD COLUMN     "kind" "AiModelKind" NOT NULL DEFAULT 'CHAT',
ADD COLUMN     "outputModalities" "AiModality"[] DEFAULT ARRAY[]::"AiModality"[];

-- Existing providers are chat models; keep them selectable after capability filtering.
UPDATE "AiModel"
SET "inputModalities" = ARRAY['TEXT']::"AiModality"[],
    "outputModalities" = ARRAY['TEXT']::"AiModality"[];

-- CreateTable
CREATE TABLE "RagLibrary" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "embeddingModelId" TEXT NOT NULL,
    "vectorSize" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RagLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RagLibraryFile" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "status" "RagFileStatus" NOT NULL DEFAULT 'PENDING',
    "sourceEtag" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "processedChunks" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "vectorizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RagLibraryFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RagChunk" (
    "id" TEXT NOT NULL,
    "libraryFileId" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RagChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgentKnowledgeBase" (
    "agentId" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiAgentKnowledgeBase_pkey" PRIMARY KEY ("agentId","libraryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "RagLibrary_name_key" ON "RagLibrary"("name");

-- CreateIndex
CREATE INDEX "RagLibrary_embeddingModelId_idx" ON "RagLibrary"("embeddingModelId");

-- CreateIndex
CREATE INDEX "RagLibraryFile_status_updatedAt_idx" ON "RagLibraryFile"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "RagLibraryFile_fileId_idx" ON "RagLibraryFile"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "RagLibraryFile_libraryId_fileId_key" ON "RagLibraryFile"("libraryId", "fileId");

-- CreateIndex
CREATE INDEX "RagChunk_libraryId_fileId_idx" ON "RagChunk"("libraryId", "fileId");

-- CreateIndex
CREATE UNIQUE INDEX "RagChunk_libraryFileId_chunkIndex_key" ON "RagChunk"("libraryFileId", "chunkIndex");

-- CreateIndex
CREATE INDEX "AiAgentKnowledgeBase_libraryId_idx" ON "AiAgentKnowledgeBase"("libraryId");

-- CreateIndex
CREATE INDEX "AiModel_kind_isActive_sortOrder_idx" ON "AiModel"("kind", "isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "RagLibrary" ADD CONSTRAINT "RagLibrary_embeddingModelId_fkey" FOREIGN KEY ("embeddingModelId") REFERENCES "AiModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagLibrary" ADD CONSTRAINT "RagLibrary_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagLibraryFile" ADD CONSTRAINT "RagLibraryFile_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "RagLibrary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagLibraryFile" ADD CONSTRAINT "RagLibraryFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagChunk" ADD CONSTRAINT "RagChunk_libraryFileId_fkey" FOREIGN KEY ("libraryFileId") REFERENCES "RagLibraryFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagChunk" ADD CONSTRAINT "RagChunk_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "RagLibrary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagChunk" ADD CONSTRAINT "RagChunk_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentKnowledgeBase" ADD CONSTRAINT "AiAgentKnowledgeBase_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentKnowledgeBase" ADD CONSTRAINT "AiAgentKnowledgeBase_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "RagLibrary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
