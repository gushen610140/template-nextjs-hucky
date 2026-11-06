import { NextResponse } from "next/server";
import { processNextRagJob } from "@/lib/ai/rag/service";
import { withPermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 处理一个向量化批次; 客户端轮询直到 remaining 为 0。 */
export const POST = withPermission(PERMISSIONS.aiManage, async () => {
  try {
    const result = await processNextRagJob();
    return NextResponse.json(result);
  } catch (error) {
    console.error("RAG worker failed:", error);
    return NextResponse.json(
      { error: "worker_failed", processed: false, remaining: 0 },
      { status: 500 },
    );
  }
});
