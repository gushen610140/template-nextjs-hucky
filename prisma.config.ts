import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// 主要是本地 prisma migrate dev 的时候加载文件要选择一下
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: envFile, quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `prisma db seed` 和 `prisma migrate reset` 会执行; 生产需显式运行 `bun run db:seed`
    seed: "bun prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
