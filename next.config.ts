import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const withMDX = createMDX();

const nextConfig: NextConfig = {
  reactCompiler: true,
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
