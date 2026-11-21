import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { getAdminSiteWithChannels } from "@/lib/rss/service";
import { RssChannelDetailClient } from "./rss-channel-detail-client";

export default async function RssChannelDetailPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  await requirePermission(PERMISSIONS.rssManage);
  const data = await getAdminSiteWithChannels(siteId);

  if (!data) notFound();

  return <RssChannelDetailClient site={data.site} channels={data.channels} />;
}
