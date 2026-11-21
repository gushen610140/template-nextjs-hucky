import { createDecipheriv } from "node:crypto";
import type { RssAdapter, RssChannelRef, RssFeedItem } from "../types";

const HOME_URL = "https://www.36kr.com";
const GATEWAY_URL = "https://gateway.36kr.com";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const REQUEST_TIMEOUT_MS = 15_000;

type GatewayItem = {
  itemId?: number | string;
  itemType?: number;
  route?: string;
  templateMaterial?: {
    itemId?: number | string;
    widgetTitle?: string;
    widgetContent?: string;
    summary?: string;
    widgetImage?: string;
    authorName?: string;
    author?: string;
    publishTime?: number;
    navName?: string;
  };
};

type GatewayResponse = {
  code?: number;
  msg?: string;
  data?: {
    itemList?: GatewayItem[];
    hasNextPage?: number | boolean;
    pageCallback?: string;
  };
};

async function postGateway(
  path: string,
  param: Record<string, unknown>,
): Promise<GatewayResponse> {
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: HOME_URL,
      Referer: `${HOME_URL}/`,
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      partner_id: "web",
      param,
      timestamp: Date.now(),
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`36kr gateway ${response.status}`);
  }

  return (await response.json()) as GatewayResponse;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeItem(item: GatewayItem): RssFeedItem | null {
  const material = item.templateMaterial ?? {};
  const itemId = material.itemId ?? item.itemId;
  const title = material.widgetTitle ? stripHtml(material.widgetTitle) : "";
  if (!itemId || !title) return null;

  const isNewsflash = Boolean(item.route?.startsWith("detail_newsflash"));
  const url = isNewsflash
    ? `${HOME_URL}/newsflashes/${itemId}`
    : `${HOME_URL}/p/${itemId}`;
  const summary = material.summary ?? material.widgetContent;

  return {
    externalId: String(itemId),
    title,
    url,
    summary: summary ? stripHtml(summary).slice(0, 500) : undefined,
    author: material.authorName ?? material.author,
    imageUrl: material.widgetImage,
    publishedAt: material.publishTime ? new Date(material.publishTime) : null,
  };
}

/**
 * 从 HTML 中取出 `window.initialState=` 后面的完整 JSON 对象。
 * 用括号配平而不是正则，避免贪婪匹配吃掉后续脚本。
 */
function extractInitialState(html: string): unknown | null {
  const marker = "window.initialState=";
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return null;

  const start = html.indexOf("{", markerIndex + marker.length);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < html.length; i += 1) {
    const char = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

/** 36 氪部分页面会把 initialState 用 AES-128-ECB 再包一层 */
function decryptState(state: string): unknown | null {
  try {
    const key = Buffer.from("efabccee-b754-4c", "utf8");
    const decipher = createDecipheriv("aes-128-ecb", key, null);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(state, "base64")),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

type ArticleDetailState = {
  isEncrypt?: boolean;
  state?: string;
  articleDetail?: {
    articleDetailData?: {
      data?: {
        widgetTitle?: string;
        summary?: string;
        widgetContent?: string;
        author?: string;
        authorFace?: string;
        publishTime?: number;
      };
    };
  };
};

export async function fetch36krArticle(
  item: RssFeedItem,
): Promise<RssFeedItem | null> {
  const response = await fetch(item.url, {
    headers: {
      "User-Agent": USER_AGENT,
      Referer: `${HOME_URL}/`,
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) return null;

  const html = await response.text();
  let state = extractInitialState(html) as ArticleDetailState | null;
  if (state?.isEncrypt && state.state) {
    state = decryptState(state.state) as ArticleDetailState | null;
  }

  const data = state?.articleDetail?.articleDetailData?.data;
  if (!data?.widgetContent) return null;

  return {
    ...item,
    title: data.widgetTitle ? stripHtml(data.widgetTitle) : item.title,
    summary: data.summary ? stripHtml(data.summary) : item.summary,
    contentHtml: data.widgetContent,
    author: data.author ?? item.author,
    imageUrl: data.authorFace ?? item.imageUrl,
    publishedAt: data.publishTime
      ? new Date(data.publishTime)
      : item.publishedAt,
  };
}

async function fetchChannel(
  channel: RssChannelRef,
  options?: { pageSize?: number },
): Promise<{ items: RssFeedItem[]; hasNextPage: boolean }> {
  const pageSize = options?.pageSize ?? 20;
  const isNewsflash = channel.adapterKey === "newsflash";

  const response = isNewsflash
    ? await postGateway("/api/mis/nav/newsflash/flow", {
        pageSize,
        pageEvent: 0,
        pageCallback: "",
        siteId: 1,
        platformId: 2,
      })
    : await postGateway("/api/mis/nav/ifm/subNav/flow", {
        subnavType: 1,
        subnavNick: channel.adapterKey,
        pageSize,
        pageEvent: 0,
        pageCallback: "",
        siteId: 1,
        platformId: 2,
      });

  if (response.code !== 0) {
    throw new Error(response.msg ?? "36kr gateway error");
  }

  const rawItems = response.data?.itemList ?? [];
  const items = rawItems
    .filter((item) => item.itemType !== 0)
    .map(normalizeItem)
    .filter((item): item is RssFeedItem => Boolean(item));

  return { items, hasNextPage: Boolean(response.data?.hasNextPage) };
}

export const adapter36kr: RssAdapter = {
  id: "36kr",
  fetchChannel,
  fetchArticle: fetch36krArticle,
};
