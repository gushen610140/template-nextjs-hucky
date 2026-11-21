import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { listAdminArticles } from "@/lib/rss/service";
import { RssArticlesClient } from "./rss-articles-client";

const PAGE_SIZE = 20;

export default async function RssArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePermission(PERMISSIONS.rssManage);
  const { page: rawPage } = await searchParams;
  const requested = Number(rawPage ?? "1");
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;

  const result = await listAdminArticles({ page, pageSize: PAGE_SIZE });

  return (
    <RssArticlesClient
      rows={result.rows}
      total={result.total}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
}
