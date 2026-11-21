import { hasPermission, requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { listCatalog } from "@/lib/rss/service";
import { RssCatalogClient } from "./rss-catalog-client";

export default async function RssCatalogPage() {
  const user = await requirePermission(PERMISSIONS.rssOwn);
  const canManage = await hasPermission(user.id, PERMISSIONS.rssManage);
  const sites = await listCatalog(user.id, { includeDisabled: canManage });

  return <RssCatalogClient sites={sites} canManage={canManage} />;
}
