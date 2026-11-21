import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { getSiteWithChannels } from "@/lib/rss/service";
import { RssSiteClient } from "./rss-site-client";

export default async function RssSitePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const user = await requirePermission(PERMISSIONS.rssOwn);
  const canManage = await hasPermission(user.id, PERMISSIONS.rssManage);
  const data = await getSiteWithChannels(user.id, siteId);

  if (!data) notFound();

  return (
    <RssSiteClient
      site={data.site}
      channels={data.channels}
      canManage={canManage}
    />
  );
}
