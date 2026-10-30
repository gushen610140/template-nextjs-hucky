import { randomBytes } from "node:crypto";
import type { IdTokenClaims } from "@logto/next";
import bcrypt from "bcryptjs";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * 把 Logto 身份映射到本地 User 表。
 *
 * 关联键的选择:
 * - 有已验证邮箱时用邮箱, 这样能和本地邮箱密码注册的账号自动合并
 * - 否则(例如本实例只启用 username 登录, 没有邮箱验证流程)用 Logto 的稳定
 *   sub 派生占位邮箱 `<sub>@logto.local`。占位域名不会被真实邮箱占用, 同时
 *   避免把未验证的邮箱和本地已有账号关联, 防止账号接管。
 *
 * 外部账号没有本地密码, 因此写入随机 bcrypt 哈希占位, 使
 * POST /api/auth/login 的密码校验必然失败。
 */
export async function upsertLogtoUser(claims: IdTokenClaims) {
  const verifiedEmail =
    claims.email && claims.email_verified === true
      ? claims.email.trim().toLowerCase()
      : undefined;

  const email = verifiedEmail ?? `${claims.sub}@logto.local`;

  const profile = {
    ...(claims.name ? { name: claims.name } : {}),
    ...(claims.picture ? { avatarUrl: claims.picture } : {}),
  };

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    // 只补全资料, 保留本地密码(如果这个账号之前用邮箱密码注册过)
    return prisma.user.update({
      where: { id: existing.id },
      data: profile,
    });
  }

  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
  try {
    return await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: claims.name ?? claims.username ?? claims.sub,
        avatarUrl: claims.picture ?? null,
      },
    });
  } catch (error) {
    // 同一 Logto 身份并发回调时, 另一个请求可能已经创建了该邮箱。
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return prisma.user.update({
        where: { email },
        data: profile,
      });
    }
    throw error;
  }
}
