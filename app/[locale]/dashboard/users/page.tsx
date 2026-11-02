import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const actor = await requirePermission(PERMISSIONS.basicManage);

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        roles: {
          select: {
            role: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <UsersClient
      currentUserId={actor.id}
      roles={roles}
      users={users.map((user) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
        roles: user.roles.map(({ role }) => role),
      }))}
    />
  );
}
