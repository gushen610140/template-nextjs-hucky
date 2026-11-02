"use server";

import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isUniqueConstraintError } from "@/lib/prisma-errors";
import { guardRbacAction } from "@/lib/rbac-action-guard";
import { revalidateRbacPages } from "@/lib/rbac-revalidate";
import type { RbacActionResult } from "@/lib/rbac-types";

const PERMISSION_NAME_PATTERN = /^[a-z][a-z0-9]*(?::[a-z][a-z0-9-]*)+$/;
const MODULE_PATTERN = /^[a-z][a-z0-9-]*$/;
const NAME_MAX_LENGTH = 64;
const MODULE_MAX_LENGTH = 40;
const DESCRIPTION_MAX_LENGTH = 300;
const BUILTIN_PERMISSION_NAMES = new Set<string>(Object.values(PERMISSIONS));

function resolveModule(name: string, module: string): string | null {
  const trimmed = module.trim();
  if (trimmed) return trimmed;

  const derived = name.split(":")[0]?.trim();
  return derived || null;
}

export async function createPermission(input: {
  name: string;
  module: string;
  description: string;
}): Promise<RbacActionResult> {
  const guard = await guardRbacAction();
  if (!guard.ok) return guard;

  const name = input.name.trim();
  if (name.length > NAME_MAX_LENGTH || !PERMISSION_NAME_PATTERN.test(name)) {
    return { ok: false, error: "invalid_permission_name" };
  }

  const module = resolveModule(name, input.module);
  if (
    !module ||
    module.length > MODULE_MAX_LENGTH ||
    !MODULE_PATTERN.test(module)
  ) {
    return { ok: false, error: "invalid_permission_module" };
  }

  const description = input.description.trim();
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return { ok: false, error: "invalid_description" };
  }

  try {
    await prisma.permission.create({
      data: {
        name,
        module,
        description: description || null,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "permission_name_taken" };
    }
    console.error("createPermission failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateRbacPages();
  return { ok: true };
}

export async function updatePermission(input: {
  id: string;
  name: string;
  module: string;
  description: string;
}): Promise<RbacActionResult> {
  const guard = await guardRbacAction();
  if (!guard.ok) return guard;

  const target = await prisma.permission.findUnique({
    where: { id: input.id },
    select: { id: true, name: true, module: true },
  });
  if (!target) return { ok: false, error: "not_found" };

  const isBuiltin = BUILTIN_PERMISSION_NAMES.has(target.name);

  const name = input.name.trim();
  if (name.length > NAME_MAX_LENGTH || !PERMISSION_NAME_PATTERN.test(name)) {
    return { ok: false, error: "invalid_permission_name" };
  }

  // 代码内置权限的标识和模块由代码决定, 只允许改描述
  if (isBuiltin && name !== target.name) {
    return { ok: false, error: "system_permission" };
  }

  const module = isBuiltin ? target.module : resolveModule(name, input.module);
  if (
    !module ||
    module.length > MODULE_MAX_LENGTH ||
    !MODULE_PATTERN.test(module)
  ) {
    return { ok: false, error: "invalid_permission_module" };
  }

  const description = input.description.trim();
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return { ok: false, error: "invalid_description" };
  }

  try {
    await prisma.permission.update({
      where: { id: target.id },
      data: {
        name: isBuiltin ? target.name : name,
        module,
        description: description || null,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "permission_name_taken" };
    }
    console.error("updatePermission failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateRbacPages();
  return { ok: true };
}

export async function deletePermission(id: string): Promise<RbacActionResult> {
  const guard = await guardRbacAction();
  if (!guard.ok) return guard;

  const target = await prisma.permission.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!target) return { ok: false, error: "not_found" };

  if (BUILTIN_PERMISSION_NAMES.has(target.name)) {
    return { ok: false, error: "system_permission" };
  }

  try {
    // RolePermission 有 onDelete: Cascade, 引用它的角色会自动失去该权限
    await prisma.permission.delete({ where: { id: target.id } });
  } catch (error) {
    console.error("deletePermission failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateRbacPages();
  return { ok: true };
}
