import { type NextRequest, NextResponse } from "next/server";
import {
  deleteConversation,
  getConversation,
  renameConversation,
  updateConversationAgent,
} from "@/lib/ai/chat/service";
import { withPermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withPermission<RouteContext>(
  PERMISSIONS.aiOwn,
  async (_request: NextRequest, context, user) => {
    const { id } = await context.params;
    const conversation = await getConversation(user.id, id);
    if (!conversation) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ conversation });
  },
);

export const PATCH = withPermission<RouteContext>(
  PERMISSIONS.aiOwn,
  async (request: NextRequest, context, user) => {
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as {
      title?: unknown;
      agentId?: unknown;
    } | null;

    const title = typeof body?.title === "string" ? body.title : null;
    const agentId = typeof body?.agentId === "string" ? body.agentId : null;

    if (!title && !agentId) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    let conversation = await getConversation(user.id, id);
    if (!conversation) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (agentId) {
      const updated = await updateConversationAgent(user.id, id, agentId);
      if (!updated) {
        return NextResponse.json(
          { error: "agent_unavailable" },
          { status: 400 },
        );
      }
      conversation = { ...conversation, ...updated };
    }

    if (title) {
      const updated = await renameConversation(user.id, id, title);
      if (!updated) {
        return NextResponse.json({ error: "invalid_title" }, { status: 400 });
      }
      conversation = { ...conversation, ...updated };
    }

    return NextResponse.json({ conversation });
  },
);

export const DELETE = withPermission<RouteContext>(
  PERMISSIONS.aiOwn,
  async (_request: NextRequest, context, user) => {
    const { id } = await context.params;
    const deleted = await deleteConversation(user.id, id);
    if (!deleted) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  },
);
