"use client";

import { enUS, zhCN } from "date-fns/locale";
import { CalendarDays, RefreshCw, Rss, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

function toDateParam(value: Date): string {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function filterHref(
  base: string,
  filter: Filter,
  date: string,
  page?: number,
): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  params.set("date", date);
  if (page && page > 1) params.set("page", String(page));
  return `${base}?${params.toString()}`;
}

export function RssReadClient({
  rows,
  total,
  unread,
  filter,
  date,
  page,
  pageSize,
}: {
  rows: RssArticleRow[];
  total: number;
  unread: number;
  filter: Filter;
  date: string;
  page: number;
  pageSize: number;
}) {
  const t = useTranslations("Rss");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const base = `/${locale}/dashboard/rss/read`;
  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: t("read.all") },
    { key: "unread", label: t("read.unread") },
    { key: "saved", label: t("read.saved") },
  ];
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const selectedDate = new Date(`${date}T00:00:00`);
  const calendarLocale = locale.startsWith("zh") ? zhCN : enUS;

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
              variant={filter === item.key ? "default" : "ghost"}
            >
              <Link href={filterHref(base, item.key, date)}>{item.label}</Link>
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {t("read.date")}
          </span>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <CalendarDays />
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                }).format(selectedDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                defaultMonth={selectedDate}
                locale={calendarLocale}
                onSelect={(next) => {
                  if (!next) return;
                  router.push(filterHref(base, filter, toDateParam(next)));
                  setCalendarOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-xs">
            {t("read.total", { count: total })}
          </span>
        </div>
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
          {rows.map((row, index) => (
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
                    <Badge variant="secondary">{row.channelName}</Badge>
                    <span>{formatTime(row.publishedAt, locale)}</span>
                  </div>
                </div>
                {row.imageUrl && (
                  // biome-ignore lint/performance/noImgElement: 远端文章封面，尺寸固定且无布局偏移
                  <img
                    src={row.imageUrl}
                    alt=""
                    loading={index < 4 ? "eager" : "lazy"}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    className="hidden h-16 w-24 shrink-0 rounded-md border bg-muted object-contain sm:block"
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {total > 0 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-muted-foreground text-xs">
            {t("read.page", { page })} / {pageCount}
          </span>
          <Button asChild size="sm" variant="outline" disabled={page <= 1}>
            <Link href={filterHref(base, filter, date, page - 1)}>
              {t("read.prev")}
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            disabled={page >= pageCount}
          >
            <Link href={filterHref(base, filter, date, page + 1)}>
              {t("read.next")}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
