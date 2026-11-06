-- AlterTable
ALTER TABLE "AiConversation" ADD COLUMN     "agentId" TEXT,
ADD COLUMN     "agentName" TEXT;

-- CreateTable
CREATE TABLE "AiAgent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "modelId" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiAgent_name_key" ON "AiAgent"("name");

-- CreateIndex
CREATE INDEX "AiAgent_isActive_sortOrder_idx" ON "AiAgent"("isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AiModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
