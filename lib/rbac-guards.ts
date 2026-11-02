import type { Prisma } from "@/lib/generated/prisma/client";
import { PERMISSIONS } from "@/lib/permissions";

/**
 * 后台管理员的判定条件: 启用中且通过角色拥有 `basic:manage`。
 *
 * 这里故意用权限而不是角色名判断, 这样以后给自定义角色授予
 * `basic:manage` 时, 防锁死逻辑依然成立。
 */
const ACTIVE_MANAGER_WHERE = {
  isActive: true,
  roles: {
    some: {
      role: {
        permissions: {
          some: { permission: { name: PERMISSIONS.basicManage } },
        },
      },
    },
  },
};

/** 事务内回滚用: 修改后系统里没有管理员了。 */
export class LastManagerError extends Error {
  constructor() {
    super("last_admin");
    this.name = "LastManagerError";
  }
}

/** 当前仍可管理后台的用户数量; 可排除正在被修改的用户。 */
export async function countActiveManagers(
  db: Prisma.TransactionClient,
  excludeUserId?: string,
): Promise<number> {
  return db.user.count({
    where: {
      ...ACTIVE_MANAGER_WHERE,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}
