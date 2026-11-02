import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PermissionsClient } from "./permissions-client";

const BUILTIN_PERMISSION_NAMES = new Set<string>(Object.values(PERMISSIONS));

export default async function PermissionsPage() {
  await requirePermission(PERMISSIONS.basicManage);

  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      module: true,
      _count: { select: { roles: true } },
    },
  });

  return (
    <PermissionsClient
      permissions={permissions.map((permission) => ({
        id: permission.id,
        name: permission.name,
        description: permission.description,
        module: permission.module,
        isSystem: BUILTIN_PERMISSION_NAMES.has(permission.name),
        roleCount: permission._count.roles,
      }))}
    />
  );
}
