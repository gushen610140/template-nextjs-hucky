import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz";
import { getChannelFeedJson } from "@/lib/rss/service";

export const runtime = "nodejs";

type FeedContext = { params: Promise<{ channelId: string }> };

/**
 * 标准 JSON Feed 1.1。
 * `?refresh=1` 强制立即抓取；默认命中 15 分钟缓存。
 */
export const GET = withAuth<FeedContext>(async (request, context, _user) => {
  const { channelId } = await context.params;
  const refresh = new URL(request.url).searchParams.get("refresh") === "1";

  try {
    const feed = await getChannelFeedJson(channelId, { refresh });
    return NextResponse.json(feed, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    const status = message === "channel_not_found" ? 404 : 409;
    return NextResponse.json({ error: message }, { status });
  }
});
