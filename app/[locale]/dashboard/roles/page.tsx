import { requirePermission } from "@/lib/authz";
import { PERMISSIONS, ROLES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { RolesClient } from "./roles-client";

const SYSTEM_ROLE_NAMES = new Set<string>(Object.values(ROLES));

export default async function RolesPage() {
  await requirePermission(PERMISSIONS.basicManage);

  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { users: true } },
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                name: true,
                module: true,
                description: true,
              },
            },
          },
        },
      },
    }),
    prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        module: true,
        description: true,
      },
    }),
  ]);

  return (
    <RolesClient
      permissions={permissions}
      roles={roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: SYSTEM_ROLE_NAMES.has(role.name),
        userCount: role._count.users,
        permissions: role.permissions.map(({ permission }) => permission),
      }))}
    />
  );
}
