import type { NextResponse } from "next/server";
import type { User } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  hashToken,
  SESSION_COOKIE,
  SESSION_DURATION_MS,
} from "./session-token";

/**
 * 不透明 Session 方案:
 * - 客户端只持有随机 token(不透明字符串), 存于 httpOnly cookie
 * - 服务端(DB) 只存 token 的 sha256 哈希, 即使 DB 泄露也无法伪造
 * - 权威校验(数据层)用 cookie 中的 token 哈希查表; proxy 只做乐观格式检查
 *
 * token 的基础能力在 lib/session-token.ts, 这里只负责需要数据库的部分。
 */

// 兼容既有调用点: 常量与 token 工具仍从本模块导出
export { createSessionToken, hashToken, SESSION_COOKIE, SESSION_DURATION_MS };

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

/** 会话对应的用户; 内部关联字段(logtoSub)不随会话返回 */
export type SessionUser = Omit<User, "logtoSub">;

/** 校验 token 并返回对应用户, 无效/过期/禁用返回 null */
export async function getSessionUser(
  token: string | null | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now() || !session.user.isActive) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  return session.user;
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
