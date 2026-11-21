import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { listAdminChannelTree } from "@/lib/rss/service";
import { RssChannelsClient } from "./rss-channels-client";

export default async function RssChannelsPage() {
  await requirePermission(PERMISSIONS.rssManage);
  const sites = await listAdminChannelTree();

  return <RssChannelsClient sites={sites} />;
}
