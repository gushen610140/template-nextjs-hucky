"use client";

import { RefreshCw, Rss, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RssArticleRow } from "@/lib/rss/types";
import { cn } from "@/lib/utils";
import { refreshAllSubscriptions } from "../actions";

type Filter = "all" | "unread" | "saved";

function formatTime(value: string | null, locale: string): string {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function RssReadClient({
  rows,
  total,
  unread,
  filter,
  page,
  pageSize,
}: {
  rows: RssArticleRow[];
  total: number;
  unread: number;
  filter: Filter;
  page: number;
  pageSize: number;
}) {
  const t = useTranslations("Rss");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const base = `/${locale}/dashboard/rss/read`;
  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: t("read.all") },
    { key: "unread", label: t("read.unread") },
    { key: "saved", label: t("read.saved") },
  ];
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function refreshAll() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await refreshAllSubscriptions();
      if (!result.ok) {
        setError(t(`errors.${result.error}` as never));
        return;
      }
      setNotice(t("newArticles", { count: result.newArticles ?? 0 }));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading font-medium text-xl">
            {t("read.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("read.description")} · {t("read.unreadCount", { count: unread })}
          </p>
        </div>
        <Button variant="outline" disabled={pending} onClick={refreshAll}>
          <RefreshCw className={pending ? "animate-spin" : undefined} />
          {pending ? t("refreshing") : t("refreshAll")}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {filters.map((item) => (
            <Button
              key={item.key}
              asChild
              size="sm"
              variant={filter === item.key ? "secondary" : "ghost"}
            >
              <Link
                href={item.key === "all" ? base : `${base}?filter=${item.key}`}
              >
                {item.label}
              </Link>
            </Button>
          ))}
        </div>
        <span className="text-muted-foreground text-xs">
          {t("read.total", { count: total })}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground text-sm">
          <Rss className="mx-auto mb-3 size-6" />
          <p>{t("read.empty")}</p>
          <Button asChild size="sm" variant="outline" className="mt-4">
            <Link href={`/${locale}/dashboard/rss`}>{t("title")}</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`${base}/${row.id}`}
                className="flex gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <span
                  className={cn(
                    "mt-2 size-2 shrink-0 rounded-full",
                    row.isRead ? "bg-transparent" : "bg-primary",
                  )}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start gap-2">
                    <h2
                      className={cn(
                        "line-clamp-2 flex-1 text-sm",
                        row.isRead
                          ? "text-muted-foreground"
                          : "font-medium text-foreground",
                      )}
                    >
                      {row.title}
                    </h2>
                    {row.isSaved && (
                      <Star className="mt-0.5 size-3.5 shrink-0 fill-current text-amber-500" />
                    )}
                  </div>
                  {row.summary && (
                    <p className="line-clamp-1 text-muted-foreground text-xs">
                      {row.summary}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                    <Badge variant="outline">{row.siteName}</Badge>
                    <span>{row.channelName}</span>
                    {row.author && <span>· {row.author}</span>}
                    <span>· {formatTime(row.publishedAt, locale)}</span>
                  </div>
                </div>
                {row.imageUrl && (
                  // biome-ignore lint/performance/noImgElement: 远端文章封面，尺寸固定且无布局偏移
                  <img
                    src={row.imageUrl}
                    alt=""
                    loading="lazy"
                    className="hidden size-16 shrink-0 rounded-md object-cover sm:block"
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <Button asChild size="sm" variant="outline" disabled={page <= 1}>
            <Link
              href={`${base}?filter=${filter}&page=${Math.max(1, page - 1)}`}
            >
              {t("read.prev")}
            </Link>
          </Button>
          <span className="text-muted-foreground text-xs">
            {t("read.page", { page })} / {pageCount}
          </span>
          <Button
            asChild
            size="sm"
            variant="outline"
            disabled={page >= pageCount}
          >
            <Link
              href={`${base}?filter=${filter}&page=${Math.min(pageCount, page + 1)}`}
            >
              {t("read.next")}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
