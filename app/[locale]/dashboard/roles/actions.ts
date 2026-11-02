"use server";

import { ROLES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isUniqueConstraintError } from "@/lib/prisma-errors";
import { guardRbacAction } from "@/lib/rbac-action-guard";
import { countActiveManagers, LastManagerError } from "@/lib/rbac-guards";
import { revalidateRbacPages } from "@/lib/rbac-revalidate";
import type { RbacActionResult } from "@/lib/rbac-types";

const ROLE_NAME_MAX_LENGTH = 50;
const DESCRIPTION_MAX_LENGTH = 300;
const SYSTEM_ROLE_NAMES = new Set<string>(Object.values(ROLES));

function normalizePermissionIds(permissionIds: string[]): string[] {
  return [...new Set(permissionIds.filter((id) => id.length > 0))];
}

async function permissionsExist(permissionIds: string[]): Promise<boolean> {
  if (permissionIds.length === 0) return true;

  const count = await prisma.permission.count({
    where: { id: { in: permissionIds } },
  });

  return count === permissionIds.length;
}

export async function createRole(input: {
  name: string;
  description: string;
  permissionIds: string[];
}): Promise<RbacActionResult> {
  const guard = await guardRbacAction();
  if (!guard.ok) return guard;

  const name = input.name.trim();
  if (name.length === 0 || name.length > ROLE_NAME_MAX_LENGTH) {
    return { ok: false, error: "invalid_role_name" };
  }

  const description = input.description.trim();
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return { ok: false, error: "invalid_description" };
  }

  const permissionIds = normalizePermissionIds(input.permissionIds);
  if (!(await permissionsExist(permissionIds))) {
    return { ok: false, error: "not_found" };
  }

  try {
    await prisma.role.create({
      data: {
        name,
        description: description || null,
        permissions:
          permissionIds.length > 0
            ? {
                create: permissionIds.map((permissionId) => ({
                  permission: { connect: { id: permissionId } },
                })),
              }
            : undefined,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "role_name_taken" };
    }
    console.error("createRole failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateRbacPages();
  return { ok: true };
}

export async function updateRole(input: {
  id: string;
  name: string;
  description: string;
  permissionIds: string[];
}): Promise<RbacActionResult> {
  const guard = await guardRbacAction();
  if (!guard.ok) return guard;

  const target = await prisma.role.findUnique({
    where: { id: input.id },
    select: { id: true, name: true },
  });
  if (!target) return { ok: false, error: "not_found" };

  // 内置角色的定义由 seed 维护, 后台不允许改名或改权限
  if (SYSTEM_ROLE_NAMES.has(target.name)) {
    return { ok: false, error: "system_role" };
  }

  const name = input.name.trim();
  if (name.length === 0 || name.length > ROLE_NAME_MAX_LENGTH) {
    return { ok: false, error: "invalid_role_name" };
  }

  const description = input.description.trim();
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return { ok: false, error: "invalid_description" };
  }

  const permissionIds = normalizePermissionIds(input.permissionIds);
  if (!(await permissionsExist(permissionIds))) {
    return { ok: false, error: "not_found" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id: target.id },
        data: { name, description: description || null },
      });

      await tx.rolePermission.deleteMany({ where: { roleId: target.id } });
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: target.id,
            permissionId,
          })),
        });
      }

      // 去掉 basic:manage 后如果没人能管理后台, 回滚整个事务
      const managers = await countActiveManagers(tx);
      if (managers === 0) throw new LastManagerError();
    });
  } catch (error) {
    if (error instanceof LastManagerError) {
      return { ok: false, error: "last_admin" };
    }
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "role_name_taken" };
    }
    console.error("updateRole failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateRbacPages();
  return { ok: true };
}

export async function deleteRole(id: string): Promise<RbacActionResult> {
  const guard = await guardRbacAction();
  if (!guard.ok) return guard;

  const target = await prisma.role.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!target) return { ok: false, error: "not_found" };

  if (SYSTEM_ROLE_NAMES.has(target.name)) {
    return { ok: false, error: "system_role" };
  }

  const assignedUsers = await prisma.userRole.count({
    where: { roleId: target.id },
  });
  if (assignedUsers > 0) {
    return { ok: false, error: "role_in_use" };
  }

  try {
    await prisma.role.delete({ where: { id: target.id } });
  } catch (error) {
    console.error("deleteRole failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateRbacPages();
  return { ok: true };
}
