"use client";

import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type RenderState = "loading" | "ready" | "error";

const DOCX_STYLE = `
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
  }
  .docx-wrapper {
    background: transparent !important;
    padding: 0 !important;
  }
  .docx-wrapper > section.docx {
    width: 100% !important;
    min-height: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
  }
`;

/**
 * DOCX 近似还原。
 *
 * 渲染目标仍然是 `sandbox="allow-same-origin"` 的 iframe, 文档脚本不会执行;
 * 但 iframe 本身不滚动, 高度跟随文档内容, 由外层滚动容器负责滚动,
 * 这样滚动条和 PDF / 其他预览一样使用站点的全局样式。
 */
export function DocxPreview({ url, name }: { url: string; name: string }) {
  const t = useTranslations("FileViewer");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<RenderState>("loading");
  const [frameHeight, setFrameHeight] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt 是重试计数器
  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    const controller = new AbortController();

    async function render() {
      setState("loading");

      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.status}`);
        }
        const blob = await response.blob();
        const { renderAsync } = await import("docx-preview");
        if (cancelled) return;

        const doc = iframeRef.current?.contentDocument;
        if (!doc) throw new Error("Preview iframe is not ready");

        doc.head.innerHTML = '<meta charset="utf-8">';
        doc.body.replaceChildren();
        doc.body.style.margin = "0";
        doc.body.style.padding = "0";
        doc.body.style.background = "transparent";
        doc.body.style.overflow = "hidden";
        doc.documentElement.style.overflow = "hidden";

        await renderAsync(blob, doc.body, doc.head, {
          className: "docx",
          inWrapper: true,
          ignoreWidth: true,
          ignoreHeight: true,
          breakPages: true,
          useBase64URL: true,
          experimental: true,
        });

        // 覆盖 docx-preview 注入的灰色 wrapper 背景和留白
        const style = doc.createElement("style");
        style.textContent = DOCX_STYLE;
        doc.head.appendChild(style);

        if (cancelled) return;

        const syncHeight = () => {
          const height = Math.max(
            doc.body.scrollHeight,
            doc.documentElement.scrollHeight,
          );
          if (height > 0) setFrameHeight(height);
        };

        syncHeight();
        resizeObserver = new ResizeObserver(syncHeight);
        resizeObserver.observe(doc.body);
        resizeObserver.observe(doc.documentElement);
        setState("ready");
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        console.error("docx preview failed:", error);
        setState("error");
      }
    }

    void render();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      controller.abort();
    };
  }, [url, attempt]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-xl border bg-background">
      <div className="absolute inset-0 overflow-auto" data-lenis-prevent>
        <div
          className="mx-auto"
          style={{
            width: `${zoom * 100}%`,
            height: frameHeight > 0 ? `${frameHeight * zoom}px` : "100%",
          }}
        >
          <iframe
            ref={iframeRef}
            title={name}
            sandbox="allow-same-origin"
            scrolling="no"
            className="block border-0 bg-transparent"
            style={{
              width: `${100 / zoom}%`,
              height: frameHeight > 0 ? `${frameHeight}px` : "100%",
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          />
        </div>
      </div>

      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-lg border bg-background/90 p-1 shadow-sm">
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

      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-muted-foreground text-sm">
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
    </div>
  );
}
