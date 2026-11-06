import { redirect } from "next/navigation";
import { ChatShell } from "@/components/chat/chat-shell";
import { getActiveAgents } from "@/lib/ai/agents/service";
import { listConversations } from "@/lib/ai/chat/service";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";

export default async function ChatIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requirePermission(PERMISSIONS.aiOwn);

  const [agents, conversations] = await Promise.all([
    getActiveAgents(),
    listConversations(user.id),
  ]);

  const latest = conversations[0];
  if (latest) {
    redirect(`/${locale}/dashboard/chat/${latest.id}`);
  }

  return (
    <ChatShell
      key="new"
      agents={agents}
      conversations={conversations}
      active={null}
    />
  );
}
