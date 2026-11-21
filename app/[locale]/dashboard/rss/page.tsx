import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { listCatalog } from "@/lib/rss/service";
import { RssCatalogClient } from "./rss-catalog-client";

export default async function RssCatalogPage() {
  const user = await requirePermission(PERMISSIONS.rssOwn);
  const sites = await listCatalog(user.id);

  return <RssCatalogClient sites={sites} />;
}
