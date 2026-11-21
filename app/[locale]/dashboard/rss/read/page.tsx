import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { listUserArticles } from "@/lib/rss/service";
import { RssReadClient } from "./rss-read-client";

const PAGE_SIZE = 20;

export default async function RssReadPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.rssOwn);
  const { filter: rawFilter, page: rawPage } = await searchParams;

  const filter =
    rawFilter === "unread" || rawFilter === "saved" ? rawFilter : "all";
  const requestedPage = Number(rawPage ?? "1");
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const result = await listUserArticles(user.id, {
    filter,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <RssReadClient
      rows={result.rows}
      total={result.total}
      unread={result.unread}
      filter={filter}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
}
