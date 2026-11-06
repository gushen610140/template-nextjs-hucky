import { notFound } from "next/navigation";
import { ChatShell } from "@/components/chat/chat-shell";
import { getActiveAgents } from "@/lib/ai/agents/service";
import { getConversation, listConversations } from "@/lib/ai/chat/service";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";

export default async function ChatConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(PERMISSIONS.aiOwn);

  const [agents, conversations, active] = await Promise.all([
    getActiveAgents(),
    listConversations(user.id),
    getConversation(user.id, id),
  ]);

  if (!active) notFound();

  return (
    <ChatShell
      key={active.id}
      agents={agents}
      conversations={conversations}
      active={active}
    />
  );
}
