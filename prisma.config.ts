import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// 主要是本地 prisma migrate dev 的时候加载文件要选择一下
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: envFile, quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
