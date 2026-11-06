import { NextResponse } from "next/server";
import { listRagLibraries } from "@/lib/ai/rag/service";
import { withPermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";

export const runtime = "nodejs";

/** 二级侧边栏和面包屑使用的知识库目录; 仅 ai:manage 可见。 */
export const GET = withPermission(PERMISSIONS.aiManage, async () => {
  return NextResponse.json({ libraries: await listRagLibraries() });
});
