"use server";

import { prisma } from "@/lib/prisma";
import { isUniqueConstraintError } from "@/lib/prisma-errors";
import { guardRbacAction } from "@/lib/rbac-action-guard";
import { countActiveManagers, LastManagerError } from "@/lib/rbac-guards";
import { revalidateRbacPages } from "@/lib/rbac-revalidate";
import type { RbacActionResult } from "@/lib/rbac-types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX_LENGTH = 80;

function normalizeRoleIds(roleIds: string[]): string[] {
  return [...new Set(roleIds.filter((roleId) => roleId.length > 0))];
}

async function rolesExist(roleIds: string[]): Promise<boolean> {
  if (roleIds.length === 0) return true;

  const count = await prisma.role.count({
    where: { id: { in: roleIds } },
  });

  return count === roleIds.length;
}

export async function createUser(input: {
  email: string;
  name: string;
  isActive: boolean;
  roleIds: string[];
}): Promise<RbacActionResult> {
  const guard = await guardRbacAction();
  if (!guard.ok) return guard;

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "invalid_email" };
  }

  const name = input.name.trim();
  if (name.length > NAME_MAX_LENGTH) {
    return { ok: false, error: "invalid_name" };
  }

  const roleIds = normalizeRoleIds(input.roleIds);
  if (!(await rolesExist(roleIds))) {
    return { ok: false, error: "not_found" };
  }

  try {
    await prisma.user.create({
      data: {
        email,
        name: name || null,
        isActive: Boolean(input.isActive),
        roles:
          roleIds.length > 0
            ? {
                create: roleIds.map((roleId) => ({
                  role: { connect: { id: roleId } },
                })),
              }
            : undefined,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "email_taken" };
    }
    console.error("createUser failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateRbacPages();
  return { ok: true };
}

export async function updateUser(input: {
  id: string;
  name: string;
  isActive: boolean;
  roleIds: string[];
}): Promise<RbacActionResult> {
  const guard = await guardRbacAction();
  if (!guard.ok) return guard;

  const name = input.name.trim();
  if (name.length > NAME_MAX_LENGTH) {
    return { ok: false, error: "invalid_name" };
  }

  const roleIds = normalizeRoleIds(input.roleIds);
  if (!(await rolesExist(roleIds))) {
    return { ok: false, error: "not_found" };
  }

  const target = await prisma.user.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      roles: { select: { roleId: true } },
    },
  });
  if (!target) return { ok: false, error: "not_found" };

  const currentRoleIds = new Set(target.roles.map(({ roleId }) => roleId));
  const nextRoleIds = new Set(roleIds);
  const rolesChanged =
    currentRoleIds.size !== nextRoleIds.size ||
    [...currentRoleIds].some((roleId) => !nextRoleIds.has(roleId));

  // 防止管理员把自己锁在系统外
  if (target.id === guard.user.id) {
    if (!input.isActive) return { ok: false, error: "self_deactivate" };
    if (rolesChanged) return { ok: false, error: "self_roles" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: target.id },
        data: {
          name: name || null,
          isActive: Boolean(input.isActive),
        },
      });

      if (rolesChanged) {
        await tx.userRole.deleteMany({ where: { userId: target.id } });
        if (roleIds.length > 0) {
          await tx.userRole.createMany({
            data: roleIds.map((roleId) => ({ userId: target.id, roleId })),
          });
        }
      }

      // 事务内复查, 防止并发修改把最后一个管理员也移除
      const managers = await countActiveManagers(tx);
      if (managers === 0) throw new LastManagerError();
    });
  } catch (error) {
    if (error instanceof LastManagerError) {
      return { ok: false, error: "last_admin" };
    }
    console.error("updateUser failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateRbacPages();
  return { ok: true };
}

export async function deleteUser(id: string): Promise<RbacActionResult> {
  const guard = await guardRbacAction();
  if (!guard.ok) return guard;

  if (id === guard.user.id) {
    return { ok: false, error: "self_delete" };
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "not_found" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id: target.id } });

      // 事务内复查, 防止删掉最后一个启用中的管理员
      const managers = await countActiveManagers(tx);
      if (managers === 0) throw new LastManagerError();
    });
  } catch (error) {
    if (error instanceof LastManagerError) {
      return { ok: false, error: "last_admin" };
    }
    console.error("deleteUser failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateRbacPages();
  return { ok: true };
}
