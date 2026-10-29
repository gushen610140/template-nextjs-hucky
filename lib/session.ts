import { createHash, randomBytes } from "node:crypto";
import type { NextResponse } from "next/server";
import type { User } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * 不透明 Session 方案:
 * - 客户端只持有随机 token(不透明字符串), 存于 httpOnly cookie
 * - 服务端(DB) 只存 token 的 sha256 哈希, 即使 DB 泄露也无法伪造
 * - 每次请求(proxy / auth/me)用 cookie 中的 token 哈希查表校验
 */

export const SESSION_COOKIE = "session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 生成新的不透明 session 随机字符串(客户端持有) */
export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** 为用户创建 session 记录, 返回应写入 cookie 的原始 token */
export async function createSession(userId: string): Promise<string> {
  const token = createSessionToken();
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    },
  });
  return token;
}

/** 校验 token 并返回对应用户(不含 passwordHash), 无效/过期返回 null */
export async function getSessionUser(
  token: string | null | undefined,
): Promise<Omit<User, "passwordHash"> | null> {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  const { passwordHash: _, ...user } = session.user;
  return user;
}

/** 删除会话(登出) */
export async function deleteSession(
  token: string | null | undefined,
): Promise<void> {
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/** 会话 cookie 的写入选项, 同时供 NextResponse 和 next/headers 的 cookieStore 使用 */
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_DURATION_MS / 1000,
} as const;

/** 写入 httpOnly cookie 到响应 */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
}

/** 清除 session cookie */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
