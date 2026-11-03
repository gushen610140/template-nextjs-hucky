"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OfficeEditorConfig } from "@/lib/onlyoffice/types";

type DocsEditor = {
  destroyEditor: () => void;
};

type DocsApi = {
  DocEditor: new (id: string, config: Record<string, unknown>) => DocsEditor;
};

type OnlyOfficeWindow = Window & { DocsAPI?: DocsApi };

let scriptPromise: Promise<void> | null = null;
let scriptUrl: string | null = null;

/** 多次进出编辑页只加载一次 api.js */
function loadOnlyOfficeApi(dsUrl: string): Promise<void> {
  const url = `${dsUrl}/web-apps/apps/api/documents/api.js`;

  if (scriptUrl === url && scriptPromise) return scriptPromise;

  scriptUrl = url;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${url}"]`,
    );
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }

    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = url;
      script.async = true;
      document.body.appendChild(script);
    }

    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => {
      script.remove();
      scriptPromise = null;
      scriptUrl = null;
      reject(new Error(`Failed to load ONLYOFFICE api from ${url}`));
    });
  });

  return scriptPromise;
}

type EditorState = "loading" | "ready" | "error";

export function OfficeEditor({
  dsUrl,
  config,
  fileName,
  previewHref,
}: {
  dsUrl: string;
  config: OfficeEditorConfig;
  fileName: string;
  previewHref: string;
}) {
  const t = useTranslations("OfficeEditor");
  const router = useRouter();
  const configRef = useRef(config);
  const editorRef = useRef<DocsEditor | null>(null);
  const [state, setState] = useState<EditorState>("loading");
  const [dirty, setDirty] = useState(false);
  const [attempt, setAttempt] = useState(0);

  configRef.current = config;

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt 是重试计数器, config 通过 ref 读取
  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setDirty(false);

    loadOnlyOfficeApi(dsUrl)
      .then(() => {
        if (cancelled) return;
        const api = (window as OnlyOfficeWindow).DocsAPI;
        if (!api) throw new Error("DocsAPI is not available");

        editorRef.current = new api.DocEditor("onlyoffice-editor", {
          ...configRef.current,
          events: {
            onDocumentStateChange: (event: { data?: boolean }) => {
              setDirty(Boolean(event?.data));
            },
            onRequestClose: () => {
              router.push(previewHref);
            },
            onError: (event: {
              data?: { code?: number; description?: string };
            }) => {
              console.error("onlyoffice editor error:", event?.data);
              setState("error");
            },
          },
        });
        setState("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("onlyoffice: failed to start editor:", error);
        setState("error");
      });

    return () => {
      cancelled = true;
      try {
        editorRef.current?.destroyEditor();
      } catch (error) {
        console.error("onlyoffice: failed to destroy editor:", error);
      }
      editorRef.current = null;
    };
  }, [dsUrl, previewHref, router, attempt]);

  return (
    <div className="absolute inset-x-0 top-16 bottom-0 flex min-h-0 flex-col gap-3 overflow-hidden bg-background p-4 pt-0">
      <header className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push(previewHref)}
          aria-label={t("back")}
        >
          <ArrowLeft />
        </Button>
        <div className="grid min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-medium">{fileName}</span>
            {dirty && (
              <span
                className="size-2 shrink-0 rounded-full bg-amber-500"
                title={t("unsaved")}
              />
            )}
          </div>
          <span className="truncate text-muted-foreground text-xs">
            {t("hint")}
          </span>
        </div>
        <Badge variant="outline">{t("online")}</Badge>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border bg-card">
        <div id="onlyoffice-editor" className="h-full w-full" />

        {state === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/80 text-muted-foreground text-sm">
            <Loader2 className="animate-spin" />
            {t("loading")}
          </div>
        )}

        {state === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90 p-6">
            <Alert variant="destructive" className="max-w-md">
              <AlertDescription>{t("error")}</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setAttempt((n) => n + 1)}
              >
                {t("retry")}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(previewHref)}
              >
                {t("back")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
