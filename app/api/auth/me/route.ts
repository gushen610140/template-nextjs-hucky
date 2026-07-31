import { NextResponse } from "next/server";
import { getSessionUser, SESSION_COOKIE } from "@/lib/session";

/** 读取当前登录态(供客户端刷新/挂载时恢复) */
export async function GET(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))?.[1];

  const user = await getSessionUser(token);
  return NextResponse.json({ user });
}
