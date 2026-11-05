import { redirect } from "next/navigation";
import { ChatShell } from "@/components/chat/chat-shell";
import { listConversations } from "@/lib/ai/chat/service";
import { getActiveCatalog } from "@/lib/ai/models";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";

export default async function ChatIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requirePermission(PERMISSIONS.aiOwn);

  const [catalog, conversations] = await Promise.all([
    getActiveCatalog(),
    listConversations(user.id),
  ]);

  const latest = conversations[0];
  if (latest) {
    redirect(`/${locale}/dashboard/chat/${latest.id}`);
  }

  return (
    <ChatShell
      key="new"
      catalog={catalog}
      conversations={conversations}
      active={null}
    />
  );
}
