-- CreateEnum
CREATE TYPE "RssSourceType" AS ENUM ('HTML', 'JSON_API', 'RSS', 'BROWSER');

-- CreateTable
CREATE TABLE "RssSite" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "homepageUrl" TEXT NOT NULL,
    "description" TEXT,
    "adapter" TEXT NOT NULL,
    "sourceType" "RssSourceType" NOT NULL DEFAULT 'JSON_API',
    "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RssSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RssChannel" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "adapterKey" TEXT NOT NULL,
    "config" JSONB,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lastFetchedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RssChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RssSubscription" (
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "credentials" JSONB,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RssSubscription_pkey" PRIMARY KEY ("userId","channelId")
);

-- CreateTable
CREATE TABLE "RssArticle" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "author" TEXT,
    "imageUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RssArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RssArticleChannel" (
    "articleId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "RssArticleChannel_pkey" PRIMARY KEY ("articleId","channelId")
);

-- CreateTable
CREATE TABLE "RssUserArticle" (
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "savedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RssUserArticle_pkey" PRIMARY KEY ("userId","articleId")
);

-- CreateIndex
CREATE UNIQUE INDEX "RssSite_slug_key" ON "RssSite"("slug");

-- CreateIndex
CREATE INDEX "RssSite_isEnabled_sortOrder_idx" ON "RssSite"("isEnabled", "sortOrder");

-- CreateIndex
CREATE INDEX "RssChannel_siteId_isEnabled_sortOrder_idx" ON "RssChannel"("siteId", "isEnabled", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RssChannel_siteId_slug_key" ON "RssChannel"("siteId", "slug");

-- CreateIndex
CREATE INDEX "RssSubscription_userId_isEnabled_idx" ON "RssSubscription"("userId", "isEnabled");

-- CreateIndex
CREATE INDEX "RssSubscription_channelId_idx" ON "RssSubscription"("channelId");

-- CreateIndex
CREATE INDEX "RssArticle_siteId_publishedAt_idx" ON "RssArticle"("siteId", "publishedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "RssArticle_siteId_externalId_key" ON "RssArticle"("siteId", "externalId");

-- CreateIndex
CREATE INDEX "RssArticleChannel_channelId_idx" ON "RssArticleChannel"("channelId");

-- CreateIndex
CREATE INDEX "RssUserArticle_userId_isRead_createdAt_idx" ON "RssUserArticle"("userId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RssUserArticle_userId_isSaved_createdAt_idx" ON "RssUserArticle"("userId", "isSaved", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "RssChannel" ADD CONSTRAINT "RssChannel_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "RssSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RssSubscription" ADD CONSTRAINT "RssSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RssSubscription" ADD CONSTRAINT "RssSubscription_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "RssChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RssArticle" ADD CONSTRAINT "RssArticle_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "RssSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RssArticleChannel" ADD CONSTRAINT "RssArticleChannel_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "RssArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RssArticleChannel" ADD CONSTRAINT "RssArticleChannel_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "RssChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RssUserArticle" ADD CONSTRAINT "RssUserArticle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RssUserArticle" ADD CONSTRAINT "RssUserArticle_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "RssArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
