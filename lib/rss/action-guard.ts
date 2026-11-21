import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";
import type { RssActionResult } from "./types";

/** Server Action 的鉴权入口：默认要求 rss:own，管理操作额外要求 rss:manage */
export async function guardRssAction(options?: {
  manage?: boolean;
}): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  const user = await requireUser();
  const permission = options?.manage
    ? PERMISSIONS.rssManage
    : PERMISSIONS.rssOwn;
  if (!(await hasPermission(user.id, permission))) {
    return { ok: false, error: "forbidden" };
  }
  return { ok: true, user };
}

export function toRssResult(error: unknown): RssActionResult {
  const message = error instanceof Error ? error.message : "unknown";
  const known = new Set([
    "channel_not_found",
    "channel_disabled",
    "forbidden",
    "article_not_found",
  ]);
  if (known.has(message)) return { ok: false, error: message };
  if (message.startsWith("unknown_rss_adapter")) {
    return { ok: false, error: "adapter_unavailable" };
  }
  console.error("RSS action failed:", error);
  return { ok: false, error: "unknown" };
}
