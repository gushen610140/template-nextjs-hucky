import { NextResponse } from "next/server";
import { getActiveAgents } from "@/lib/ai/agents/service";
import { withPermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";

export const runtime = "nodejs";

/** 普通用户可选的已启用智能体; 不包含提示词和任何密钥。 */
export const GET = withPermission(PERMISSIONS.aiOwn, async () => {
  return NextResponse.json({ agents: await getActiveAgents() });
});
