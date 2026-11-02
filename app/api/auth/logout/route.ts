import LogtoClient from "@logto/next/server-actions";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logtoConfig } from "@/lib/logto";
import {
  clearSessionCookie,
  deleteSession,
  SESSION_COOKIE,
} from "@/lib/session";

/**
 * 登出本地会话, 并返回 Logto 的全局登出地址。
 *
 * 客户端拿到 redirectUrl 后整页跳转, 由 Logto 结束集中式会话,
 * 再回到 `LOGTO_BASE_URL`。Logto 不可用时直接回到 `LOGTO_BASE_URL`。
 */
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  await deleteSession(token);

  const baseUrl = process.env.LOGTO_BASE_URL ?? logtoConfig.baseUrl;

  let redirectUrl: string | null = null;
  try {
    const client = new LogtoClient(logtoConfig);
    redirectUrl = await client.handleSignOut(baseUrl);
  } catch (error) {
    // Logto 不可用时不要让用户卡在登出流程
    console.error("Failed to build Logto sign-out URL:", error);
  }

  const response = NextResponse.json({
    ok: true,
    redirectUrl,
    fallbackUrl: baseUrl,
  });
  clearSessionCookie(response);

  // 兜底清除 Logto SDK 的会话 cookie(正常情况下 handleSignOut 已清)
  if (logtoConfig.appId) {
    response.cookies.set(`logto_${logtoConfig.appId}`, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
