import { notFound } from "next/navigation";
import { ChatShell } from "@/components/chat/chat-shell";
import { getConversation, listConversations } from "@/lib/ai/chat/service";
import { getActiveCatalog } from "@/lib/ai/models";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";

export default async function ChatConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(PERMISSIONS.aiOwn);

  const [catalog, conversations, active] = await Promise.all([
    getActiveCatalog(),
    listConversations(user.id),
    getConversation(user.id, id),
  ]);

  if (!active) notFound();

  return (
    <ChatShell
      key={active.id}
      catalog={catalog}
      conversations={conversations}
      active={active}
    />
  );
}
