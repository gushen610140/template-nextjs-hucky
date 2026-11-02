import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";

type RbacActionGuard =
  | { ok: true; user: SessionUser }
  | { ok: false; error: "unauthorized" | "forbidden" };

/**
 * Server Action 的授权入口。
 *
 * 和页面里的 `requirePermission()` 不同, 这里返回错误码而不是抛 404,
 * 这样客户端可以把失败原因显示在表单里。
 *
 * 所有会修改用户 / 角色 / 权限的 action 都必须在第一行调用它。
 */
export async function guardRbacAction(): Promise<RbacActionGuard> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  if (!(await hasPermission(user.id, PERMISSIONS.basicManage))) {
    return { ok: false, error: "forbidden" };
  }

  return { ok: true, user };
}
