import { getCurrentUser } from "@/lib/auth";
import { getUserPermissions } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";

export type FileGuard =
  | { ok: true; user: SessionUser; canManage: boolean }
  | { ok: false; error: "unauthorized" | "forbidden" };

/**
 * 文件相关 Server Action 的授权入口。
 *
 * 两级权限:
 * - `file:own`:    只能操作 ownerId 等于自己的记录 (普通用户)
 * - `file:manage`: 可以操作全站记录 (管理员)
 *
 * 两者都没有时直接拒绝; 具体某条记录能否操作, 用 `canAccessFile()` 判断。
 */
export async function guardFileAction(): Promise<FileGuard> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const permissions = await getUserPermissions(user.id);
  const canManage = permissions.has(PERMISSIONS.fileManage);
  const canOwn = permissions.has(PERMISSIONS.fileOwn);

  if (!canManage && !canOwn) return { ok: false, error: "forbidden" };

  return { ok: true, user, canManage };
}

/** 管理员可操作任意文件, 普通用户只能操作自己的文件。 */
export function canAccessFile(
  guard: Extract<FileGuard, { ok: true }>,
  ownerId: string,
): boolean {
  return guard.canManage || guard.user.id === ownerId;
}
