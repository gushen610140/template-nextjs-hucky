import { NextResponse } from "next/server";
import { getActiveCatalog } from "@/lib/ai/models";
import { withPermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";

export const runtime = "nodejs";

/** 普通用户可选的已启用模型目录; 不包含任何密钥。 */
export const GET = withPermission(PERMISSIONS.aiOwn, async () => {
  return NextResponse.json(await getActiveCatalog());
});
