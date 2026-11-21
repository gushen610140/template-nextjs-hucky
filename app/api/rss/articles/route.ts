import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz";
import {
  listUserArticles,
  markArticleRead,
  setArticleSaved,
} from "@/lib/rss/service";

export const runtime = "nodejs";

export const GET = withAuth(async (request, _context, user) => {
  const params = new URL(request.url).searchParams;
  const filter = params.get("filter");
  const channelId = params.get("channelId") ?? undefined;
  const date = params.get("date") ?? undefined;
  const page = Number(params.get("page") ?? "1");

  const result = await listUserArticles(user.id, {
    filter: filter === "unread" || filter === "saved" ? filter : "all",
    channelId,
    date,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  });

  return NextResponse.json(result);
});

export const PATCH = withAuth(async (request, _context, user) => {
  const body = (await request.json().catch(() => null)) as {
    articleId?: string;
    isRead?: boolean;
    isSaved?: boolean;
  } | null;

  if (!body?.articleId) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (typeof body.isRead === "boolean") {
    await markArticleRead(user.id, body.articleId, body.isRead);
  }
  if (typeof body.isSaved === "boolean") {
    await setArticleSaved(user.id, body.articleId, body.isSaved);
    return NextResponse.json({ ok: true, isSaved: body.isSaved });
  }

  return NextResponse.json({ ok: true });
});
