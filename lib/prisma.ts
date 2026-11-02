import type { PrismaClient } from "@/lib/generated/prisma/client";
import { createPrismaClient } from "@/lib/prisma-client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 运行时使用普通连接串(生产环境通常是托管数据库的 pooled / 连接池地址)。
// 迁移和 seed 使用 MIGRATE_DATABASE_URL, 见 prisma.config.ts 与 prisma/seed.ts。
export const prisma =
  globalForPrisma.prisma ?? createPrismaClient(process.env.DATABASE_URL);

// 解决热重载连接池过载问题
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
