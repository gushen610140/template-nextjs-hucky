import type { IdTokenClaims } from "@logto/next";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * 把 Logto 身份映射到本地 User 表。
 *
 * Logto 是唯一的凭证来源, 本地 User 只保存业务资料与授权关系:
 * - `logtoSub` 是唯一关联键; 用户在 Logto 改邮箱不会断开本地账号
 * - 首次登录时若本地已有同邮箱的历史账号, 自动绑定并保留其角色/业务数据
 * - 没有已验证邮箱时用 `<sub>@logto.local` 占位, 满足 email 非空约束
 */
export async function upsertLogtoUser(claims: IdTokenClaims) {
  const sub = claims.sub;
  const verifiedEmail =
    claims.email && claims.email_verified === true
      ? claims.email.trim().toLowerCase()
      : undefined;
  const fallbackEmail = `${sub}@logto.local`;
  const profile = {
    ...(claims.name ? { name: claims.name } : {}),
    ...(claims.picture ? { avatarUrl: claims.picture } : {}),
  };

  // 1. 已绑定过: 同步资料与当前已验证邮箱
  const bound = await prisma.user.findUnique({ where: { logtoSub: sub } });
  if (bound) {
    return syncProfile(bound.id, profile, verifiedEmail);
  }

  // 2. 历史本地账号(尚无 logtoSub): 用已验证邮箱绑定一次
  if (verifiedEmail) {
    const legacy = await prisma.user.findUnique({
      where: { email: verifiedEmail },
    });
    if (legacy && !legacy.logtoSub) {
      return prisma.user.update({
        where: { id: legacy.id },
        data: { ...profile, logtoSub: sub },
      });
    }
  }

  // 3. 新用户
  const email = verifiedEmail ?? fallbackEmail;
  try {
    return await prisma.user.create({
      data: {
        logtoSub: sub,
        email,
        name: claims.name ?? claims.username ?? sub,
        avatarUrl: claims.picture ?? null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // 并发回调: 另一个请求已经完成创建/绑定
      const existing = await prisma.user.findUnique({
        where: { logtoSub: sub },
      });
      if (existing) return existing;

      // 邮箱已被另一个 Logto 身份占用: 退回占位邮箱, 避免相互覆盖
      if (email !== fallbackEmail) {
        return prisma.user.create({
          data: {
            logtoSub: sub,
            email: fallbackEmail,
            name: claims.name ?? claims.username ?? sub,
            avatarUrl: claims.picture ?? null,
          },
        });
      }
    }
    throw error;
  }
}

/** 更新资料; 邮箱被其他账号占用时保留原邮箱, 不让登录失败 */
async function syncProfile(
  userId: string,
  profile: { name?: string; avatarUrl?: string },
  verifiedEmail: string | undefined,
) {
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        ...profile,
        ...(verifiedEmail ? { email: verifiedEmail } : {}),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return prisma.user.update({ where: { id: userId }, data: profile });
    }
    throw error;
  }
}
