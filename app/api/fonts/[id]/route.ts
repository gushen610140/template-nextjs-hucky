import { NextResponse } from "next/server";
import { isFontId } from "@/lib/font-presets";
import { getFontDownloadTarget } from "@/lib/fonts/cos";

/** 依运行环境变量和 COS 在线状态, 不能预渲染 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/fonts/[id]
 * 返回私有桶字体的一次性签名下载地址。
 * id 允许带 .ttf 后缀, 方便浏览器端直接用文件名拼 URL。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const fontId = decodeURIComponent(id).replace(/\.ttf$/i, "");

  if (!isFontId(fontId)) {
    return NextResponse.json({ error: "unknown_font" }, { status: 404 });
  }

  try {
    const target = await getFontDownloadTarget(fontId);
    return NextResponse.json(target, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("[fonts] 生成下载地址失败", error);
    return NextResponse.json({ error: "font_unavailable" }, { status: 503 });
  }
}
