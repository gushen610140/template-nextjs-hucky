"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MAX_TABLE_COLUMNS, MAX_TABLE_ROWS } from "@/lib/files/preview";

type Sheet = {
  sheet: string;
  data: (string | number | boolean | Date | null)[][];
};

type LoadState = "loading" | "ready" | "error";

function formatCell(value: string | number | boolean | Date | null): string {
  if (value === null) return "";
  if (value instanceof Date) return value.toLocaleString();
  return String(value);
}

/** XLSX 只读预览: 首个 sheet 默认展开, 其余按需切换 */
export function XlsxPreview({ url, name }: { url: string; name: string }) {
  const t = useTranslations("FileViewer");
  const [state, setState] = useState<LoadState>("loading");
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt 是重试计数器, 需要在变化时重新拉取
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setState("loading");
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to fetch spreadsheet: ${response.status}`);
        }
        const blob = await response.blob();
        const { default: readXlsxFile } = await import(
          "read-excel-file/universal"
        );
        const result = await readXlsxFile(blob);
        if (cancelled) return;
        setSheets(result as Sheet[]);
        setState("ready");
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        console.error("xlsx preview failed:", error);
        setState("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url, attempt]);

  if (state === "loading") {
    return (
      <div className="h-full space-y-3 rounded-xl border bg-card p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[70%] w-full" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border bg-card p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{t("renderFailed")}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (sheets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border bg-card text-muted-foreground text-sm">
        {t("emptySheet")}
      </div>
    );
  }

  return (
    <Tabs defaultValue="0" className="h-full min-h-0 gap-3">
      <TabsList className="max-w-full overflow-x-auto">
        {sheets.map((sheet, index) => (
          <TabsTrigger key={sheet.sheet} value={String(index)}>
            {sheet.sheet || t("sheetFallback", { index: index + 1 })}
          </TabsTrigger>
        ))}
      </TabsList>

      {sheets.map((sheet, index) => {
        const rows = sheet.data.slice(0, MAX_TABLE_ROWS);
        const truncated = sheet.data.length > rows.length;
        const columnCount = Math.min(
          Math.max(0, ...rows.map((row) => row.length)),
          MAX_TABLE_COLUMNS,
        );
        const [header, ...body] = rows;

        return (
          <TabsContent
            key={sheet.sheet}
            value={String(index)}
            className="min-h-0 overflow-auto"
            data-lenis-prevent
          >
            <div className="overflow-hidden rounded-xl border bg-card">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr>
                    {Array.from({ length: columnCount }).map((_, cellIndex) => (
                      <th
                        // biome-ignore lint/suspicious/noArrayIndexKey: 表头来自文件内容
                        key={cellIndex}
                        className="border px-2 py-1.5 text-left font-medium"
                      >
                        {formatCell(header?.[cellIndex] ?? null)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, rowIndex) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: 表格行没有稳定 id
                    <tr key={rowIndex} className="even:bg-muted/30">
                      {Array.from({ length: columnCount }).map(
                        (_, cellIndex) => (
                          <td
                            // biome-ignore lint/suspicious/noArrayIndexKey: 单元格没有稳定 id
                            key={cellIndex}
                            className="max-w-80 truncate border px-2 py-1 tabular-nums"
                            title={formatCell(row[cellIndex] ?? null)}
                          >
                            {formatCell(row[cellIndex] ?? null)}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {truncated && (
              <p className="mt-2 text-muted-foreground text-xs">
                {t("tableTruncated", { count: MAX_TABLE_ROWS })}
              </p>
            )}
          </TabsContent>
        );
      })}
      <span className="sr-only">{name}</span>
    </Tabs>
  );
}
