"use client";

import { ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RssAdminArticleRow } from "@/lib/rss/types";

function formatTime(value: string | null, locale: string): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function RssArticlesClient({
  rows,
  total,
  page,
  pageSize,
}: {
  rows: RssAdminArticleRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const t = useTranslations("Rss");
  const locale = useLocale();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const base = `/${locale}/dashboard/rss/articles`;
  const pageHref = (target: number) =>
    target > 1 ? `${base}?page=${target}` : base;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading font-medium text-xl">
            {t("articlesTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("articlesDescription")}
          </p>
        </div>
        <span className="text-muted-foreground text-xs">
          {t("read.total", { count: total })}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("article")}</TableHead>
              <TableHead>{t("source")}</TableHead>
              <TableHead>{t("author")}</TableHead>
              <TableHead>{t("publishedAt")}</TableHead>
              <TableHead>{t("fetchedAt")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("articlesEmpty")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[420px]">
                    <Link
                      href={`${base}/${row.id}`}
                      className="flex items-start gap-2 hover:underline"
                    >
                      <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="grid gap-0.5">
                        <span className="line-clamp-1 font-medium">
                          {row.title}
                        </span>
                        {row.summary && (
                          <span className="line-clamp-1 text-muted-foreground text-xs">
                            {row.summary}
                          </span>
                        )}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-[220px] flex-wrap gap-1">
                      <Badge variant="outline">{row.siteName}</Badge>
                      {row.channels.slice(0, 2).map((channel) => (
                        <Badge key={channel} variant="secondary">
                          {channel}
                        </Badge>
                      ))}
                      {row.channels.length > 2 && (
                        <Badge variant="outline">
                          +{row.channels.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.author ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatTime(row.publishedAt, locale)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatTime(row.fetchedAt, locale)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`${base}/${row.id}`}>
                        {t("view")}
                        <ChevronRight />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-muted-foreground text-xs">
            {t("read.page", { page })} / {pageCount}
          </span>
          <Button asChild size="sm" variant="outline" disabled={page <= 1}>
            <Link href={pageHref(page - 1)}>{t("read.prev")}</Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            disabled={page >= pageCount}
          >
            <Link href={pageHref(page + 1)}>{t("read.next")}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
