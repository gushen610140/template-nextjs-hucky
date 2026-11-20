"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFont } from "@/providers/font-provider";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

/**
 * 字体下载弹窗。挂在主题设置页和右侧定制面板里, 共享 FontProvider 的下载状态。
 * 进度来自 fetch 流读取的字节数; COS 不返回 Content-Length 时降级为不确定态。
 */
export function FontDownloadDialog() {
  const t = useTranslations("ThemeCustomizer.fontDownload");
  const tFonts = useTranslations("ThemeCustomizer.fonts");
  const { download, cancelDownload } = useFont();

  const failed = download?.status === "error";
  const percent =
    download && download.total > 0
      ? Math.min(100, Math.round((download.loaded / download.total) * 100))
      : null;

  return (
    <Dialog
      open={download !== null}
      onOpenChange={(open) => {
        if (!open) cancelDownload();
      }}
    >
      <DialogContent showCloseButton={!failed} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {failed
              ? t("errorTitle")
              : t("title", { name: download ? tFonts(download.id) : "" })}
          </DialogTitle>
          <DialogDescription>
            {failed ? t("errorDescription") : t("description")}
          </DialogDescription>
        </DialogHeader>

        {download ? (
          failed ? (
            <p className="text-muted-foreground text-xs">
              {download.message || t("errorDescription")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                {percent === null ? (
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
                ) : (
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-150"
                    style={{ width: `${percent}%` }}
                  />
                )}
              </div>
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>
                  {download.total > 0
                    ? t("progress", {
                        loaded: formatBytes(download.loaded),
                        total: formatBytes(download.total),
                      })
                    : t("preparing")}
                </span>
                {percent !== null && <span>{percent}%</span>}
              </div>
            </div>
          )
        ) : null}

        <DialogFooter>
          {failed ? (
            <Button type="button" onClick={cancelDownload}>
              {t("close")}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={cancelDownload}>
              {t("cancel")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
