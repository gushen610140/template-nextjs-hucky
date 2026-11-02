import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * 用显式连接串创建 Prisma Client。
 *
 * 运行时和迁移/seed 使用不同的连接串:
 * - `lib/prisma.ts` 传入 `DATABASE_URL`(通常是 pooled 地址)
 * - `prisma/seed.ts` 传入 `MIGRATE_DATABASE_URL ?? DATABASE_URL`(直连地址)
 *
 * 不要在请求处理函数里直接调用它; 应用侧统一复用 `lib/prisma.ts` 的单例。
 */
export function createPrismaClient(
  connectionString: string | undefined,
): PrismaClient {
  if (!connectionString) {
    throw new Error("Database connection string is not configured.");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}
