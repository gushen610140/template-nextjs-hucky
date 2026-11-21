import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { listUserArticles } from "@/lib/rss/service";
import { RssReadClient } from "./rss-read-client";

const PAGE_SIZE = 10;

function todayLocalDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function normalizeDate(value: string | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return todayLocalDate();
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? todayLocalDate() : value;
}

export default async function RssReadPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string; date?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.rssOwn);
  const {
    filter: rawFilter,
    page: rawPage,
    date: rawDate,
  } = await searchParams;

  const filter =
    rawFilter === "unread" || rawFilter === "saved" ? rawFilter : "all";
  const date = normalizeDate(rawDate);
  const requestedPage = Number(rawPage ?? "1");
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const result = await listUserArticles(user.id, {
    filter,
    date,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <RssReadClient
      rows={result.rows}
      total={result.total}
      unread={result.unread}
      filter={filter}
      date={date}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
}
