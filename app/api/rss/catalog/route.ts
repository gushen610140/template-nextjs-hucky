import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * 公开的可订阅目录。
 * 移动端 / 第三方在登录前即可发现有哪些站点和频道；
 * 真正拉取订阅内容仍需登录 (见 /api/rss/feed/[channelId])。
 */
export async function GET() {
  const sites = await prisma.rssSite.findMany({
    where: { isEnabled: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      homepageUrl: true,
      requiresAuth: true,
      sourceType: true,
      channels: {
        where: { isEnabled: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          url: true,
        },
      },
    },
  });

  return NextResponse.json({ sites });
}
