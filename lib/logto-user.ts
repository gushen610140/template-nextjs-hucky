import { randomBytes } from "node:crypto";
import type { IdTokenClaims } from "@logto/next";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * 把 Logto 身份映射到本地 User 表。
 *
 * 以 email 作为关联键: 本地已存在同邮箱用户时复用, 否则自动创建一个
 * "外部登录" 用户。外部用户没有本地密码, 因此写入一个随机 bcrypt 哈希占位,
 * 这样 POST /api/auth/login 的密码校验必然失败, 不会留下可用的空密码。
 *
 * 安全前提: 只接受已验证的邮箱, 否则任何人都能在 Logto 注册一个
 * 与本地账号相同的邮箱来接管它。
 */
export async function upsertLogtoUser(claims: IdTokenClaims) {
  const email = claims.email?.trim().toLowerCase();
  if (!email) {
    throw new Error(
      "Logto account has no email claim; make sure the email scope is granted",
    );
  }

  if (claims.email_verified !== true) {
    throw new Error("Logto account email is not verified");
  }

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

  // 外部账号没有本地密码, 用随机 bcrypt 哈希占位
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      name: claims.name ?? claims.username ?? null,
      avatarUrl: claims.picture ?? null,
    },
  });
}
