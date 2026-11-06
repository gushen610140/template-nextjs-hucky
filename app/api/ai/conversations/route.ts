import { type NextRequest, NextResponse } from "next/server";
import { createConversation, listConversations } from "@/lib/ai/chat/service";
import { withPermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";

export const runtime = "nodejs";

export const GET = withPermission(
  PERMISSIONS.aiOwn,
  async (_request: NextRequest, _context: unknown, user) => {
    return NextResponse.json({
      conversations: await listConversations(user.id),
    });
  },
);

export const POST = withPermission(
  PERMISSIONS.aiOwn,
  async (request: NextRequest, _context: unknown, user) => {
    const body = (await request.json().catch(() => null)) as {
      agentId?: unknown;
      title?: unknown;
    } | null;

    const agentId = typeof body?.agentId === "string" ? body.agentId : "";
    const title = typeof body?.title === "string" ? body.title : undefined;

    if (!agentId) {
      return NextResponse.json({ error: "agent_required" }, { status: 400 });
    }

    const conversation = await createConversation(user.id, { agentId, title });
    if (!conversation) {
      return NextResponse.json({ error: "agent_unavailable" }, { status: 400 });
    }

    return NextResponse.json({ conversation }, { status: 201 });
  },
);
