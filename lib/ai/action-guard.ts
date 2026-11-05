import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";

type AiActionGuard =
  | { ok: true; user: SessionUser }
  | { ok: false; error: "unauthorized" | "forbidden" };

/** AI 管理端 Server Action 的授权入口 (ai:manage)。 */
export async function guardAiAction(): Promise<AiActionGuard> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  if (!(await hasPermission(user.id, PERMISSIONS.aiManage))) {
    return { ok: false, error: "forbidden" };
  }

  return { ok: true, user };
}
