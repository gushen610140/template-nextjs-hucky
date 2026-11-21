import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { listAdminSiteCards } from "@/lib/rss/service";
import { RssChannelsClient } from "./rss-channels-client";

export default async function RssChannelsPage() {
  await requirePermission(PERMISSIONS.rssManage);
  const sites = await listAdminSiteCards();

  return <RssChannelsClient sites={sites} />;
}
