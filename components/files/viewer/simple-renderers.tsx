"use client";

import { FileQuestion, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";

type PreviewSourceProps = {
  url: string;
  name: string;
};

export function ImagePreview({ url, name }: PreviewSourceProps) {
  const t = useTranslations("FileViewer");

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-xl border bg-muted/30">
      <TransformWrapper
        minScale={0.2}
        maxScale={8}
        centerOnInit
        doubleClick={{ disabled: false }}
        wheel={{ step: 0.15 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute top-2 right-2 z-10 flex gap-1 rounded-lg border bg-background/90 p-1 shadow-sm">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => zoomIn()}
                aria-label={t("zoomIn")}
              >
                <ZoomIn />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => zoomOut()}
                aria-label={t("zoomOut")}
              >
                <ZoomOut />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => resetTransform()}
                aria-label={t("resetZoom")}
              >
                <RotateCcw />
              </Button>
            </div>
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* biome-ignore lint/performance/noImgElement: 预签名地址是运行时生成的, next/image 的优化器无法访问私有 bucket */}
              <img
                src={url}
                alt={name}
                draggable={false}
                className="max-h-full max-w-full select-none object-contain"
              />
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}

export function PdfPreview({ url, name }: PreviewSourceProps) {
  return (
    <iframe
      src={url}
      title={name}
      className="h-full min-h-0 w-full rounded-xl border bg-card"
    />
  );
}

export function MediaPreview({
  url,
  name,
  kind,
}: PreviewSourceProps & { kind: "audio" | "video" }) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center rounded-xl border bg-muted/30 p-4">
      {kind === "video" ? (
        // biome-ignore lint/a11y/useMediaCaption: 用户上传的视频没有字幕轨
        <video
          src={url}
          controls
          className="max-h-full max-w-full rounded-lg bg-black"
        />
      ) : (
        // biome-ignore lint/a11y/useMediaCaption: 用户上传的音频没有字幕轨
        <audio src={url} controls className="w-full max-w-xl" />
      )}
      <span className="sr-only">{name}</span>
    </div>
  );
}

export function UnsupportedPreview({
  name,
  onDownload,
}: {
  name: string;
  onDownload: () => void;
}) {
  const t = useTranslations("FileViewer");

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 rounded-xl border bg-card p-6 text-center">
      <FileQuestion className="size-10 text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-medium">{t("unsupportedTitle")}</p>
        <p className="max-w-md text-muted-foreground text-sm">
          {t("unsupportedDescription", { name })}
        </p>
      </div>
      <Button variant="outline" onClick={onDownload}>
        {t("download")}
      </Button>
    </div>
  );
}
