import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getRssAdapter } from "./adapters";
import type {
  RssAdminSite,
  RssArticleRow,
  RssChannelRow,
  RssFeedItem,
  RssFeedJson,
  RssSiteCard,
} from "./types";

/** 订阅内容超过该时间后，页面打开或 API 请求会触发一次抓取 */
const STALE_MS = 15 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 20;
const DETAIL_CONCURRENCY = 4;

const inFlight = new Map<string, Promise<{ newArticles: number }>>();

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 500);
}

async function doRefresh(channelId: string): Promise<{ newArticles: number }> {
  const channel = await prisma.rssChannel.findUnique({
    where: { id: channelId },
    include: { site: true },
  });
  if (!channel) throw new Error("channel_not_found");
  if (!channel.isEnabled || !channel.site.isEnabled) {
    throw new Error("channel_disabled");
  }

  const adapter = getRssAdapter(channel.site.adapter);
  const feed = await adapter.fetchChannel(
    {
      adapterKey: channel.adapterKey,
      name: channel.name,
      config: channel.config,
    },
    { pageSize: DEFAULT_PAGE_SIZE },
  );

  const existing = await prisma.rssArticle.findMany({
    where: {
      siteId: channel.siteId,
      externalId: { in: feed.items.map((item) => item.externalId) },
    },
    select: { id: true, externalId: true, content: true },
  });
  const existingMap = new Map(existing.map((row) => [row.externalId, row]));

  let newArticles = 0;
  const saved: { id: string; item: RssFeedItem; needsDetail: boolean }[] = [];

  for (const item of feed.items) {
    const current = existingMap.get(item.externalId);
    const common: Prisma.RssArticleUpdateInput = {
      title: item.title,
      url: item.url,
      summary: item.summary ?? undefined,
      author: item.author ?? undefined,
      imageUrl: item.imageUrl ?? undefined,
      publishedAt: item.publishedAt ?? undefined,
      fetchedAt: new Date(),
    };

    const row = current
      ? await prisma.rssArticle.update({
          where: { id: current.id },
          data: common,
        })
      : await prisma.rssArticle.create({
          data: {
            siteId: channel.siteId,
            externalId: item.externalId,
            title: item.title,
            url: item.url,
            summary: item.summary,
            content: item.contentHtml,
            author: item.author,
            imageUrl: item.imageUrl,
            publishedAt: item.publishedAt,
          },
        });

    if (!current) newArticles += 1;
    saved.push({
      id: row.id,
      item,
      needsDetail: !current?.content && !item.contentHtml,
    });
  }

  if (saved.length > 0) {
    await prisma.rssArticleChannel.createMany({
      data: saved.map(({ id }) => ({ articleId: id, channelId })),
      skipDuplicates: true,
    });
  }

  const detailTargets = adapter.fetchArticle
    ? saved.filter((entry) => entry.needsDetail)
    : [];

  await mapLimit(detailTargets, DETAIL_CONCURRENCY, async (entry) => {
    try {
      const detail = await adapter.fetchArticle?.(entry.item);
      if (!detail?.contentHtml) return;
      await prisma.rssArticle.update({
        where: { id: entry.id },
        data: {
          content: detail.contentHtml,
          summary: detail.summary ?? entry.item.summary,
          title: detail.title,
          author: detail.author ?? entry.item.author,
          imageUrl: detail.imageUrl ?? entry.item.imageUrl,
          publishedAt: detail.publishedAt ?? entry.item.publishedAt,
        },
      });
    } catch (error) {
      // 正文抓取失败不影响列表与订阅；下次刷新会继续补全
      console.warn(
        `RSS detail fetch failed (${entry.item.url}):`,
        errorMessage(error),
      );
    }
  });

  // 只给当前频道有效订阅者建立阅读状态，避免把文章推给未订阅用户
  const subscribers = await prisma.rssSubscription.findMany({
    where: { channelId, isEnabled: true },
    select: { userId: true },
  });
  if (saved.length > 0 && subscribers.length > 0) {
    await prisma.rssUserArticle.createMany({
      data: subscribers.flatMap(({ userId }) =>
        saved.map(({ id }) => ({ userId, articleId: id })),
      ),
      skipDuplicates: true,
    });
  }

  await prisma.rssChannel.update({
    where: { id: channelId },
    data: { lastFetchedAt: new Date(), lastError: null },
  });

  return { newArticles };
}

/**
 * 抓取单个频道。并发请求会复用同一 promise；未过期时默认跳过。
 */
export async function refreshChannel(
  channelId: string,
  options?: { force?: boolean },
): Promise<{ newArticles: number; skipped: boolean }> {
  const channel = await prisma.rssChannel.findUnique({
    where: { id: channelId },
    select: {
      lastFetchedAt: true,
      isEnabled: true,
      site: { select: { isEnabled: true } },
    },
  });
  if (!channel) throw new Error("channel_not_found");
  if (!channel.isEnabled || !channel.site.isEnabled) {
    throw new Error("channel_disabled");
  }

  const fresh =
    channel.lastFetchedAt &&
    Date.now() - channel.lastFetchedAt.getTime() < STALE_MS;
  if (fresh && !options?.force) {
    return { newArticles: 0, skipped: true };
  }

  const running = inFlight.get(channelId);
  if (running) {
    return { ...(await running), skipped: false };
  }

  const task = doRefresh(channelId).finally(() => inFlight.delete(channelId));
  inFlight.set(channelId, task);

  try {
    return { ...(await task), skipped: false };
  } catch (error) {
    await prisma.rssChannel
      .update({
        where: { id: channelId },
        data: { lastError: errorMessage(error) },
      })
      .catch(() => undefined);
    throw error;
  }
}

export async function refreshUserSubscriptions(
  userId: string,
  options?: { force?: boolean },
): Promise<{ refreshed: number; failed: number; newArticles: number }> {
  const subscriptions = await prisma.rssSubscription.findMany({
    where: {
      userId,
      isEnabled: true,
      channel: { isEnabled: true, site: { isEnabled: true } },
    },
    select: { channelId: true },
  });

  let refreshed = 0;
  let failed = 0;
  let newArticles = 0;

  await mapLimit(subscriptions, 3, async ({ channelId }) => {
    try {
      const result = await refreshChannel(channelId, { force: options?.force });
      refreshed += 1;
      newArticles += result.newArticles;
    } catch {
      failed += 1;
    }
  });

  return { refreshed, failed, newArticles };
}

async function ensureFreshSubscriptions(userId: string) {
  await refreshUserSubscriptions(userId, { force: false });
}

export async function listCatalog(
  userId: string,
  options?: { includeDisabled?: boolean },
): Promise<RssSiteCard[]> {
  const sites = await prisma.rssSite.findMany({
    where: options?.includeDisabled ? undefined : { isEnabled: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      homepageUrl: true,
      isEnabled: true,
      _count: { select: { channels: true } },
      channels: {
        where: { subscriptions: { some: { userId, isEnabled: true } } },
        select: { id: true },
      },
    },
  });

  return sites.map((site) => ({
    id: site.id,
    slug: site.slug,
    name: site.name,
    description: site.description,
    homepageUrl: site.homepageUrl,
    isEnabled: site.isEnabled,
    channelCount: site._count.channels,
    subscribedCount: site.channels.length,
  }));
}

export async function getSiteWithChannels(
  userId: string,
  siteId: string,
): Promise<{
  site: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    homepageUrl: string;
    isEnabled: boolean;
  };
  channels: RssChannelRow[];
} | null> {
  const site = await prisma.rssSite.findUnique({
    where: { id: siteId },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      homepageUrl: true,
      isEnabled: true,
      channels: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          url: true,
          isEnabled: true,
          lastFetchedAt: true,
          lastError: true,
          _count: { select: { articles: true } },
          subscriptions: {
            where: { userId },
            select: { isEnabled: true },
          },
        },
      },
    },
  });
  if (!site) return null;

  return {
    site: {
      id: site.id,
      slug: site.slug,
      name: site.name,
      description: site.description,
      homepageUrl: site.homepageUrl,
      isEnabled: site.isEnabled,
    },
    channels: site.channels.map((channel) => ({
      id: channel.id,
      slug: channel.slug,
      name: channel.name,
      description: channel.description,
      url: channel.url,
      isEnabled: channel.isEnabled,
      subscribed: channel.subscriptions[0]?.isEnabled ?? false,
      lastFetchedAt: channel.lastFetchedAt?.toISOString() ?? null,
      lastError: channel.lastError,
      articleCount: channel._count.articles,
    })),
  };
}

export async function setSubscription(
  userId: string,
  channelId: string,
  enabled: boolean,
): Promise<void> {
  const channel = await prisma.rssChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      isEnabled: true,
      site: { select: { isEnabled: true } },
    },
  });
  if (!channel) throw new Error("channel_not_found");
  if (enabled && (!channel.isEnabled || !channel.site.isEnabled)) {
    throw new Error("channel_disabled");
  }

  if (!enabled) {
    await prisma.rssSubscription.updateMany({
      where: { userId, channelId },
      data: { isEnabled: false },
    });
    return;
  }

  await prisma.rssSubscription.upsert({
    where: { userId_channelId: { userId, channelId } },
    update: { isEnabled: true },
    create: { userId, channelId, isEnabled: true },
  });

  // 已有文章直接进入用户文章库，首次订阅不必等新一轮抓取
  const articles = await prisma.rssArticleChannel.findMany({
    where: { channelId },
    select: { articleId: true },
  });
  if (articles.length > 0) {
    await prisma.rssUserArticle.createMany({
      data: articles.map(({ articleId }) => ({ userId, articleId })),
      skipDuplicates: true,
    });
  }

  try {
    await refreshChannel(channelId);
  } catch {
    // 错误已写入 channel.lastError，订阅本身保留
  }
}

export async function listAdminChannelTree(): Promise<RssAdminSite[]> {
  const sites = await prisma.rssSite.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      homepageUrl: true,
      isEnabled: true,
      channels: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          isEnabled: true,
          lastFetchedAt: true,
          lastError: true,
          _count: { select: { articles: true } },
        },
      },
    },
  });

  return sites.map((site) => ({
    id: site.id,
    slug: site.slug,
    name: site.name,
    description: site.description,
    homepageUrl: site.homepageUrl,
    isEnabled: site.isEnabled,
    channels: site.channels.map((channel) => ({
      id: channel.id,
      slug: channel.slug,
      name: channel.name,
      isEnabled: channel.isEnabled,
      articleCount: channel._count.articles,
      lastFetchedAt: channel.lastFetchedAt?.toISOString() ?? null,
      lastError: channel.lastError,
    })),
  }));
}

export async function setSiteEnabled(siteId: string, enabled: boolean) {
  await prisma.rssSite.update({
    where: { id: siteId },
    data: { isEnabled: enabled },
  });
}

export async function setChannelEnabled(channelId: string, enabled: boolean) {
  await prisma.rssChannel.update({
    where: { id: channelId },
    data: { isEnabled: enabled },
  });
}

type ArticleFilter = "all" | "unread" | "saved";

export async function listUserArticles(
  userId: string,
  options?: {
    filter?: ArticleFilter;
    channelId?: string;
    date?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<{ rows: RssArticleRow[]; total: number; unread: number }> {
  await ensureFreshSubscriptions(userId);

  const filter = options?.filter ?? "all";
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = options?.pageSize ?? 20;

  // 按本地自然日筛选；date 由页面传入 YYYY-MM-DD
  let publishedAt: Prisma.DateTimeFilter | undefined;
  if (options?.date) {
    const start = new Date(`${options.date}T00:00:00`);
    if (!Number.isNaN(start.getTime())) {
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      publishedAt = { gte: start, lt: end };
    }
  }

  const where: Prisma.RssUserArticleWhereInput = {
    userId,
    article: {
      ...(publishedAt ? { publishedAt } : {}),
      channels: {
        some: {
          ...(options?.channelId ? { channelId: options.channelId } : {}),
          channel: {
            isEnabled: true,
            site: { isEnabled: true },
            subscriptions: { some: { userId, isEnabled: true } },
          },
        },
      },
    },
    ...(filter === "unread" ? { isRead: false } : {}),
    ...(filter === "saved" ? { isSaved: true } : {}),
  };

  const [rows, total, unread] = await Promise.all([
    prisma.rssUserArticle.findMany({
      where,
      orderBy: [{ article: { publishedAt: "desc" } }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        isRead: true,
        isSaved: true,
        article: {
          select: {
            id: true,
            title: true,
            summary: true,
            imageUrl: true,
            author: true,
            publishedAt: true,
            url: true,
            channels: {
              where: {
                channel: {
                  subscriptions: { some: { userId, isEnabled: true } },
                },
              },
              take: 1,
              select: {
                channel: {
                  select: { name: true, site: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    }),
    prisma.rssUserArticle.count({ where }),
    prisma.rssUserArticle.count({ where: { userId, isRead: false } }),
  ]);

  return {
    total,
    unread,
    rows: rows.map((row) => ({
      id: row.article.id,
      title: row.article.title,
      summary: row.article.summary,
      imageUrl: row.article.imageUrl,
      author: row.article.author,
      publishedAt: row.article.publishedAt?.toISOString() ?? null,
      isRead: row.isRead,
      isSaved: row.isSaved,
      siteName: row.article.channels[0]?.channel.site.name ?? "",
      channelName: row.article.channels[0]?.channel.name ?? "",
      url: row.article.url,
    })),
  };
}

export async function getUserArticle(
  userId: string,
  articleId: string,
): Promise<{
  id: string;
  title: string;
  content: string | null;
  summary: string | null;
  author: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: string | null;
  isRead: boolean;
  isSaved: boolean;
  siteName: string;
  channelName: string;
  channelId: string | null;
} | null> {
  const row = await prisma.rssUserArticle.findUnique({
    where: { userId_articleId: { userId, articleId } },
    select: {
      isRead: true,
      isSaved: true,
      article: {
        select: {
          id: true,
          title: true,
          content: true,
          summary: true,
          author: true,
          url: true,
          imageUrl: true,
          publishedAt: true,
          channels: {
            take: 1,
            select: {
              channel: {
                select: {
                  id: true,
                  name: true,
                  site: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!row) return null;

  const channel = row.article.channels[0]?.channel;
  return {
    id: row.article.id,
    title: row.article.title,
    content: row.article.content,
    summary: row.article.summary,
    author: row.article.author,
    url: row.article.url,
    imageUrl: row.article.imageUrl,
    publishedAt: row.article.publishedAt?.toISOString() ?? null,
    isRead: row.isRead,
    isSaved: row.isSaved,
    siteName: channel?.site.name ?? "",
    channelName: channel?.name ?? "",
    channelId: channel?.id ?? null,
  };
}

export async function markArticleRead(
  userId: string,
  articleId: string,
  isRead = true,
): Promise<void> {
  await prisma.rssUserArticle.updateMany({
    where: { userId, articleId },
    data: { isRead, readAt: isRead ? new Date() : null },
  });
}

export async function toggleArticleSaved(
  userId: string,
  articleId: string,
): Promise<boolean> {
  const current = await prisma.rssUserArticle.findUnique({
    where: { userId_articleId: { userId, articleId } },
    select: { isSaved: true },
  });
  if (!current) return false;

  const isSaved = !current.isSaved;
  await prisma.rssUserArticle.update({
    where: { userId_articleId: { userId, articleId } },
    data: { isSaved, savedAt: isSaved ? new Date() : null },
  });
  return isSaved;
}

export async function setArticleSaved(
  userId: string,
  articleId: string,
  isSaved: boolean,
): Promise<void> {
  await prisma.rssUserArticle.updateMany({
    where: { userId, articleId },
    data: { isSaved, savedAt: isSaved ? new Date() : null },
  });
}

export async function getChannelFeedJson(
  channelId: string,
  options?: { refresh?: boolean; limit?: number },
): Promise<RssFeedJson> {
  const channel = await prisma.rssChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      name: true,
      url: true,
      isEnabled: true,
      lastFetchedAt: true,
      site: { select: { name: true, homepageUrl: true, isEnabled: true } },
    },
  });
  if (!channel) throw new Error("channel_not_found");
  if (!channel.isEnabled || !channel.site.isEnabled) {
    throw new Error("channel_disabled");
  }

  const stale =
    !channel.lastFetchedAt ||
    Date.now() - channel.lastFetchedAt.getTime() >= STALE_MS;
  if (options?.refresh || stale) {
    await refreshChannel(channelId, { force: options?.refresh });
  }

  const articles = await prisma.rssArticleChannel.findMany({
    where: { channelId },
    take: options?.limit ?? 50,
    orderBy: [
      { article: { publishedAt: "desc" } },
      { article: { createdAt: "desc" } },
    ],
    select: {
      article: {
        select: {
          externalId: true,
          title: true,
          url: true,
          summary: true,
          content: true,
          author: true,
          imageUrl: true,
          publishedAt: true,
        },
      },
    },
  });

  return {
    version: "https://jsonfeed.org/version/1.1",
    title: `${channel.site.name} · ${channel.name}`,
    home_page_url: channel.site.homepageUrl,
    feed_url: channel.url ?? undefined,
    items: articles.map(({ article }) => ({
      id: article.externalId,
      url: article.url,
      title: article.title,
      content_html: article.content ?? undefined,
      summary: article.summary ?? undefined,
      image: article.imageUrl ?? undefined,
      date_published: article.publishedAt?.toISOString(),
      authors: article.author ? [{ name: article.author }] : undefined,
    })),
  };
}

export async function countUnreadArticles(userId: string): Promise<number> {
  return prisma.rssUserArticle.count({ where: { userId, isRead: false } });
}
