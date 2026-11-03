"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type RenderState = "loading" | "ready" | "error";

/**
 * iframe 是独立文档, 继承不到站点的滚动条 CSS, 只能把同一套样式注入进去。
 * 数值对应 globals.css 里的 4px 细滚动条 + 悬停显形。
 */
function scrollbarStyle(dark: boolean): string {
  const hover = dark ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.35)";
  const active = dark ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.5)";

  return `
    html { color-scheme: ${dark ? "dark" : "light"}; }
    @supports not selector(::-webkit-scrollbar) {
      html, body {
        scrollbar-width: thin;
        scrollbar-color: ${hover} transparent;
      }
    }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: transparent; border-radius: 9999px; }
    body:hover::-webkit-scrollbar-thumb { background: ${hover}; }
    ::-webkit-scrollbar-thumb:hover,
    ::-webkit-scrollbar-thumb:active { background: ${active}; }
    ::-webkit-scrollbar-corner { background: transparent; }
  `;
}

/**
 * DOCX 近似还原。
 *
 * 渲染目标是一个 `sandbox="allow-same-origin"` 的 iframe:
 * 父页面可以写入 DOM, 但文档里的脚本 / 事件处理器不会执行。
 */
export function DocxPreview({ url, name }: { url: string; name: string }) {
  const t = useTranslations("FileViewer");
  const { resolvedTheme } = useTheme();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<RenderState>("loading");
  const [attempt, setAttempt] = useState(0);
  const dark = resolvedTheme === "dark";

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt 是重试计数器, dark 变化时需重绘滚动条和背景
  useEffect(() => {
    let cancelled = false;
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

        doc.head.innerHTML = `<meta charset="utf-8"><style>${scrollbarStyle(dark)}</style>`;
        doc.body.replaceChildren();
        doc.body.style.margin = "0";
        doc.body.style.padding = "24px";
        doc.body.style.background = dark ? "#18181b" : "#e5e7eb";

        await renderAsync(blob, doc.body, doc.head, {
          className: "docx",
          inWrapper: true,
          ignoreWidth: true,
          ignoreHeight: true,
          breakPages: true,
          useBase64URL: true,
          experimental: true,
        });

        if (!cancelled) setState("ready");
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        console.error("docx preview failed:", error);
        setState("error");
      }
    }

    void render();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url, attempt, dark]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-xl border bg-muted/30">
      <iframe
        ref={iframeRef}
        title={name}
        sandbox="allow-same-origin"
        className="h-full w-full bg-transparent"
      />

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
