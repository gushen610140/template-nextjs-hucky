import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { setSubscription } from "@/lib/rss/service";

export const runtime = "nodejs";

export const GET = withAuth(async (_request, _context, user) => {
  const subscriptions = await prisma.rssSubscription.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      isEnabled: true,
      createdAt: true,
      channel: {
        select: {
          id: true,
          slug: true,
          name: true,
          isEnabled: true,
          site: {
            select: { id: true, slug: true, name: true, isEnabled: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ subscriptions });
});

export const PATCH = withAuth(async (request, _context, user) => {
  const body = (await request.json().catch(() => null)) as {
    channelId?: string;
    enabled?: boolean;
  } | null;

  if (!body?.channelId || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    await setSubscription(user.id, body.channelId, body.enabled);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    const status = message === "channel_not_found" ? 404 : 409;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ ok: true });
});
