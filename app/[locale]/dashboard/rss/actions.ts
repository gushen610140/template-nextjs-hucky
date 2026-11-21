"use server";

import { revalidatePath } from "next/cache";
import { guardRssAction, toRssResult } from "@/lib/rss/action-guard";
import {
  markArticleRead,
  refreshChannel,
  refreshUserSubscriptions,
  setChannelEnabled,
  setSiteEnabled,
  setSubscription,
  toggleArticleSaved,
} from "@/lib/rss/service";
import type { RssActionResult } from "@/lib/rss/types";

function revalidateRss() {
  revalidatePath("/[locale]/dashboard/rss", "page");
  revalidatePath("/[locale]/dashboard/rss/[siteId]", "page");
  revalidatePath("/[locale]/dashboard/rss/read", "page");
  revalidatePath("/[locale]/dashboard/rss/read/[articleId]", "page");
  revalidatePath("/[locale]/dashboard", "layout");
}

export async function toggleSubscription(input: {
  channelId: string;
  enabled: boolean;
}): Promise<RssActionResult> {
  const guard = await guardRssAction();
  if (!guard.ok) return guard;

  try {
    await setSubscription(guard.user.id, input.channelId, input.enabled);
  } catch (error) {
    return toRssResult(error);
  }

  revalidateRss();
  return { ok: true };
}

export async function refreshChannelAction(
  channelId: string,
): Promise<RssActionResult & { newArticles?: number }> {
  const guard = await guardRssAction();
  if (!guard.ok) return guard;

  try {
    const result = await refreshChannel(channelId, { force: true });
    revalidateRss();
    return { ok: true, newArticles: result.newArticles };
  } catch (error) {
    return toRssResult(error);
  }
}

export async function refreshAllSubscriptions(): Promise<
  RssActionResult & { newArticles?: number }
> {
  const guard = await guardRssAction();
  if (!guard.ok) return guard;

  try {
    const result = await refreshUserSubscriptions(guard.user.id, {
      force: true,
    });
    revalidateRss();
    return { ok: true, newArticles: result.newArticles };
  } catch (error) {
    return toRssResult(error);
  }
}

export async function setSiteEnabledAction(input: {
  siteId: string;
  enabled: boolean;
}): Promise<RssActionResult> {
  const guard = await guardRssAction({ manage: true });
  if (!guard.ok) return guard;

  try {
    await setSiteEnabled(input.siteId, input.enabled);
  } catch (error) {
    return toRssResult(error);
  }

  revalidateRss();
  return { ok: true };
}

export async function setChannelEnabledAction(input: {
  channelId: string;
  enabled: boolean;
}): Promise<RssActionResult> {
  const guard = await guardRssAction({ manage: true });
  if (!guard.ok) return guard;

  try {
    await setChannelEnabled(input.channelId, input.enabled);
  } catch (error) {
    return toRssResult(error);
  }

  revalidateRss();
  return { ok: true };
}

export async function markArticleReadAction(input: {
  articleId: string;
  isRead: boolean;
}): Promise<RssActionResult> {
  const guard = await guardRssAction();
  if (!guard.ok) return guard;

  try {
    await markArticleRead(guard.user.id, input.articleId, input.isRead);
  } catch (error) {
    return toRssResult(error);
  }

  revalidateRss();
  return { ok: true };
}

export async function toggleArticleSavedAction(
  articleId: string,
): Promise<RssActionResult & { isSaved?: boolean }> {
  const guard = await guardRssAction();
  if (!guard.ok) return guard;

  try {
    const isSaved = await toggleArticleSaved(guard.user.id, articleId);
    revalidateRss();
    return { ok: true, isSaved };
  } catch (error) {
    return toRssResult(error);
  }
}
