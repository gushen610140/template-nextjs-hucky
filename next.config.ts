import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const withMDX = createMDX();

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // 构建/预渲染阶段限制为单 worker，压低内存峰值以适配 EdgeOne 等小内存构建容器。
    // 代价是构建变慢。
    cpus: 1,
    workerThreads: false,
    // 默认每个 worker 同时渲染 8 个页面，压到 1 可避免多页面的依赖图同时驻留。
    staticGenerationMaxConcurrency: 1,
  },
  // 这些包体量大且被多个服务端入口共用，外置后共享同一份运行时，
  // 避免被分别打进各路由的 server chunk。
  serverExternalPackages: [
    "@langchain/anthropic",
    "@langchain/core",
    "@langchain/google-genai",
    "@langchain/langgraph",
    "@langchain/openai",
    "@langchain/qdrant",
    "@langchain/textsplitters",
    "langchain",
  ],
  async headers() {
    return [
      {
        // 字体文件更新频率低，这里按文件名长期缓存；更新字体时请换文件名或加版本号。
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default withMDX(withNextIntl(nextConfig));
