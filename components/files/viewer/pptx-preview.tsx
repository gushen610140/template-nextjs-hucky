"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PPTXViewer as PPTXViewerType } from "pptxviewjs";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type LoadState = "loading" | "ready" | "error";

/**
 * PPTX 单页预览。
 *
 * pptxviewjs 负责解析和 Canvas 绘制; 这里只提供翻页、计数和错误状态。
 * 单页渲染比一次铺完所有幻灯片更轻, 也符合简单预览的定位。
 */
export function PptxPreview({ url, name }: { url: string; name: string }) {
  const t = useTranslations("FileViewer");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<PPTXViewerType | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt 是重试计数器
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setState("loading");
      setSlideIndex(0);
      setSlideCount(0);

      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to fetch presentation: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        const { PPTXViewer } = await import("pptxviewjs");
        if (cancelled || !canvasRef.current) return;

        const viewer = new PPTXViewer({
          canvas: canvasRef.current,
          slideSizeMode: "fit",
          backgroundColor: "transparent",
          enableThumbnails: false,
        });
        viewerRef.current = viewer;
        await viewer.loadFile(buffer);
        if (cancelled) return;

        const count = viewer.getSlideCount();
        setSlideCount(count);
        await viewer.render(canvasRef.current);
        if (!cancelled) setState("ready");
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        console.error("pptx preview failed:", error);
        setState("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [url, attempt]);

  async function goTo(index: number) {
    const viewer = viewerRef.current;
    if (!viewer || index < 0 || index >= slideCount) return;
    setSlideIndex(index);
    try {
      await viewer.goToSlide(index, canvasRef.current);
    } catch (error) {
      console.error("pptx slide render failed:", error);
      setState("error");
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-muted/30">
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          aria-label={name}
          className="block h-full w-full object-contain"
        />
      </div>

      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/80 text-muted-foreground text-sm">
          <Loader2 className="animate-spin" />
          {t("rendering")}
        </div>
      )}

      {state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90 p-6">
          <Alert variant="destructive" className="max-w-md">
            <AlertDescription>{t("renderFailed")}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            {t("retry")}
          </Button>
        </div>
      )}

      {state === "ready" && (
        <div className="absolute right-2 bottom-2 z-10 flex items-center gap-1 rounded-lg border bg-background/90 p-1 shadow-sm">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={slideIndex <= 0}
            onClick={() => void goTo(slideIndex - 1)}
            aria-label={t("prevSlide")}
          >
            <ChevronLeft />
          </Button>
          <span className="px-1.5 text-muted-foreground text-xs tabular-nums">
            {t("slideOf", { current: slideIndex + 1, total: slideCount })}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={slideIndex >= slideCount - 1}
            onClick={() => void goTo(slideIndex + 1)}
            aria-label={t("nextSlide")}
          >
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
