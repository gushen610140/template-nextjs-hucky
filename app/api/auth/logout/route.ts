import { NextResponse } from "next/server";
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
  return response;
}
