"use client";

import { useTranslations } from "next-intl";
import Papa from "papaparse";
import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MAX_TABLE_COLUMNS, MAX_TABLE_ROWS } from "@/lib/files/preview";
import { CodeSurface } from "./code-surface";

/** CSV / TSV: 表格预览 + 源码, 都只读; 编辑由外层切换到纯文本编辑器 */
export function CsvPreview({ content }: { content: string }) {
  const t = useTranslations("FileViewer");
  const [tab, setTab] = useState("table");

  const parsed = useMemo(
    () =>
      Papa.parse<string[]>(content, {
        skipEmptyLines: "greedy",
      }),
    [content],
  );

  const allRows = parsed.data;
  const rows = allRows.slice(0, MAX_TABLE_ROWS);
  const truncated = allRows.length > rows.length;
  const [header, ...body] = rows;
  const columnCount = Math.min(
    Math.max(header?.length ?? 0, ...rows.map((row) => row.length)),
    MAX_TABLE_COLUMNS,
  );

  return (
    <Tabs value={tab} onValueChange={setTab} className="h-full min-h-0 gap-3">
      <TabsList>
        <TabsTrigger value="table">{t("table")}</TabsTrigger>
        <TabsTrigger value="source">{t("source")}</TabsTrigger>
      </TabsList>

      <TabsContent
        value="table"
        className="min-h-0 overflow-auto"
        data-lenis-prevent
      >
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr>
                {(header ?? []).slice(0, columnCount).map((cell, index) => (
                  <th
                    // biome-ignore lint/suspicious/noArrayIndexKey: 表头来自文件内容, 没有稳定 id
                    key={index}
                    className="border px-2 py-1.5 text-left font-medium"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rowIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: 表格行没有稳定 id
                <tr key={rowIndex} className="even:bg-muted/30">
                  {Array.from({ length: columnCount }).map((_, cellIndex) => (
                    <td
                      // biome-ignore lint/suspicious/noArrayIndexKey: 单元格没有稳定 id
                      key={cellIndex}
                      className="max-w-80 truncate border px-2 py-1 tabular-nums"
                      title={row[cellIndex] ?? ""}
                    >
                      {row[cellIndex] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parsed.errors.length > 0 && (
          <p className="mt-2 text-muted-foreground text-xs">
            {parsed.errors[0]?.message}
          </p>
        )}
        {truncated && (
          <p className="mt-2 text-muted-foreground text-xs">
            {t("tableTruncated", { count: MAX_TABLE_ROWS })}
          </p>
        )}
      </TabsContent>

      <TabsContent value="source" className="min-h-0">
        <CodeSurface value={content} language={null} editable={false} />
      </TabsContent>
    </Tabs>
  );
}
