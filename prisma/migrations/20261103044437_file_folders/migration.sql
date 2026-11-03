-- AlterTable
ALTER TABLE "FileObject" ADD COLUMN     "folderId" TEXT;

-- CreateTable
CREATE TABLE "FileFolder" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileFolder_ownerId_parentId_createdAt_idx" ON "FileFolder"("ownerId", "parentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "FileObject_ownerId_folderId_status_createdAt_idx" ON "FileObject"("ownerId", "folderId", "status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "FileObject" ADD CONSTRAINT "FileObject_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "FileFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileFolder" ADD CONSTRAINT "FileFolder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileFolder" ADD CONSTRAINT "FileFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FileFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
