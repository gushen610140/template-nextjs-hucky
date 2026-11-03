"use client";

import { Loader2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * 用 pdf.js 自己渲染, 而不是把 PDF 丢给浏览器内置查看器。
 *
 * 内置查看器的滚动条在浏览器扩展 / 插件文档里, 页面 CSS 无法触及;
 * 自己渲染后滚动容器就是普通 DOM, 能复用站点的滚动条样式。
 */
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const MIN_PAGE_WIDTH = 240;
const PAGE_GAP_REM = 1;
const PAGE_PADDING_PX = 48;

function PdfPage({ pageNumber, width }: { pageNumber: number; width: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || visible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "800px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      className="w-fit overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-border"
      style={{ minHeight: Math.round(width * Math.SQRT2) }}
    >
      {visible && (
        <Page
          pageNumber={pageNumber}
          width={width}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          loading={null}
        />
      )}
    </div>
  );
}

export function PdfPreview({ url, name }: { url: string; name: string }) {
  const t = useTranslations("FileViewer");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(element);
    setContainerWidth(element.clientWidth);

    return () => observer.disconnect();
  }, []);

  const pageWidth = Math.max(
    MIN_PAGE_WIDTH,
    Math.floor((containerWidth - PAGE_PADDING_PX) * zoom),
  );

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-xl border bg-muted/30">
      <div
        ref={scrollerRef}
        className="absolute inset-0 overflow-auto py-6"
        data-lenis-prevent
      >
        <div
          className="mx-auto flex w-fit flex-col items-center"
          style={{ gap: `${PAGE_GAP_REM}rem` }}
        >
          {failed ? (
            <div className="flex min-h-60 flex-col items-center justify-center gap-3 p-6">
              <Alert variant="destructive" className="max-w-md">
                <AlertDescription>{t("renderFailed")}</AlertDescription>
              </Alert>
              <Button
                variant="outline"
                onClick={() => {
                  setFailed(false);
                  setReloadKey((key) => key + 1);
                }}
              >
                {t("retry")}
              </Button>
            </div>
          ) : (
            <Document
              key={reloadKey}
              file={url}
              onLoadSuccess={({ numPages: pages }) => {
                setNumPages(pages);
                setFailed(false);
              }}
              onLoadError={() => setFailed(true)}
              loading={
                <div className="flex min-h-60 items-center justify-center gap-2 p-6 text-muted-foreground text-sm">
                  <Loader2 className="animate-spin" />
                  {t("rendering")}
                </div>
              }
            >
              {Array.from({ length: numPages }, (_, index) => (
                <PdfPage
                  // biome-ignore lint/suspicious/noArrayIndexKey: 页码本身就是稳定索引
                  key={index}
                  pageNumber={index + 1}
                  width={pageWidth}
                />
              ))}
            </Document>
          )}
        </div>
      </div>

      <span className="sr-only">{name}</span>

      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-lg border bg-background/90 p-1 shadow-sm">
        {numPages > 0 && (
          <span className="px-1.5 text-muted-foreground text-xs tabular-nums">
            {t("pdfPages", { count: numPages })}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setZoom((value) => Math.max(0.5, value - 0.2))}
          aria-label={t("zoomOut")}
        >
          <ZoomOut />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setZoom((value) => Math.min(3, value + 0.2))}
          aria-label={t("zoomIn")}
        >
          <ZoomIn />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setZoom(1)}
          aria-label={t("resetZoom")}
        >
          <RotateCcw />
        </Button>
      </div>
    </div>
  );
}
