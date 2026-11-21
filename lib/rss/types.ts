/**
 * RSS 抓取层的统一输出。
 *
 * 采用 JSON Feed 1.1 的字段语义 (`https://jsonfeed.org/version/1.1`)，
 * 作为内部与对外 API 共用的标准 JSON；后续需要 XML 时再由这一结构转换。
 */

export type RssFeedItem = {
  /** 站点内稳定 id，例如 36 氪的 itemId */
  externalId: string;
  title: string;
  url: string;
  summary?: string;
  contentHtml?: string;
  author?: string;
  imageUrl?: string;
  publishedAt?: Date | null;
};

export type RssChannelRef = {
  adapterKey: string;
  name: string;
  config?: unknown;
};

export type RssAdapter = {
  id: string;
  fetchChannel: (
    channel: RssChannelRef,
    options?: { pageSize?: number },
  ) => Promise<{ items: RssFeedItem[]; hasNextPage: boolean }>;
  /** 补全正文；返回 null 表示保持列表里的摘要 */
  fetchArticle?: (item: RssFeedItem) => Promise<RssFeedItem | null>;
};

export type RssFeedJson = {
  version: "https://jsonfeed.org/version/1.1";
  title: string;
  home_page_url: string;
  feed_url?: string;
  description?: string;
  icon?: string;
  items: RssFeedItemJson[];
};

export type RssFeedItemJson = {
  id: string;
  url: string;
  title: string;
  content_html?: string;
  summary?: string;
  image?: string;
  date_published?: string;
  authors?: { name: string }[];
};

export type RssActionResult = { ok: true } | { ok: false; error: string };

export type RssSiteCard = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  homepageUrl: string;
  isEnabled: boolean;
  channelCount: number;
  subscribedCount: number;
};

export type RssChannelRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  url: string | null;
  isEnabled: boolean;
  subscribed: boolean;
  lastFetchedAt: string | null;
  lastError: string | null;
  articleCount: number;
};

export type RssArticleRow = {
  id: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  author: string | null;
  publishedAt: string | null;
  isRead: boolean;
  isSaved: boolean;
  siteName: string;
  channelName: string;
  url: string;
};

export type RssAdminChannel = {
  id: string;
  slug: string;
  name: string;
  isEnabled: boolean;
  articleCount: number;
  lastFetchedAt: string | null;
  lastError: string | null;
};

export type RssAdminSite = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  homepageUrl: string;
  isEnabled: boolean;
  channels: RssAdminChannel[];
};

export type RssAdminSiteCard = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  homepageUrl: string;
  isEnabled: boolean;
  channelCount: number;
  enabledChannelCount: number;
};

export type RssAdminArticleRow = {
  id: string;
  title: string;
  summary: string | null;
  siteId: string;
  siteName: string;
  channels: string[];
  author: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  url: string;
};

export type RssAdminArticleDetail = {
  id: string;
  title: string;
  content: string | null;
  summary: string | null;
  author: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  createdAt: string;
  siteName: string;
  channels: string[];
};
