"use client";

import { CloudCheck, CloudDownload, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useFont } from "@/providers/font-provider";

/**
 * 字体选项右侧的状态图标:
 * - 已经在 Cache Storage 里: 云朵勾选, 点击立即生效;
 * - 未缓存: 云朵下载, 点击后从 COS 下载并缓存;
 * - 下载中: 旋转图标。
 */
export function FontCacheIcon({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const t = useTranslations("ThemeCustomizer.fontDownload");
  const { cachedIds, download } = useFont();

  if (download?.id === id && download.status === "downloading") {
    return (
      <Loader2
        aria-label={t("downloading")}
        role="img"
        className={cn("size-3.5 shrink-0 animate-spin", className)}
      />
    );
  }

  if (cachedIds.has(id)) {
    return (
      <CloudCheck
        aria-label={t("cached")}
        role="img"
        className={cn("size-3.5 shrink-0 text-primary", className)}
      />
    );
  }

  return (
    <CloudDownload
      aria-label={t("notCached")}
      role="img"
      className={cn("size-3.5 shrink-0 text-muted-foreground", className)}
    />
  );
}
