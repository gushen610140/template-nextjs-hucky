import { NextResponse } from "next/server";
import { logtoConfig } from "@/lib/logto";
import {
  clearSessionCookie,
  deleteSession,
  SESSION_COOKIE,
} from "@/lib/session";

export async function POST(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))?.[1];

  await deleteSession(token);

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);

  // 同时清掉 Logto SDK 的会话 cookie(名为 logto_<appId>), 避免留下残留登录态
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
