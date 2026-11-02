import dotenv from "dotenv";
import {
  getPermissionModule,
  PERMISSIONS,
  type PermissionName,
  ROLES,
  type RoleName,
} from "@/lib/permissions";
import { createPrismaClient } from "@/lib/prisma-client";

// 与 prisma.config.ts 保持一致: 按 NODE_ENV 读取 .env.<NODE_ENV>
// 这样直接运行 `bun prisma/seed.ts` 也能拿到数据库连接串。
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: envFile, quiet: true });

/**
 * 内置角色与权限的映射。
 *
 * 内置角色被视为“代码拥有的系统数据”: 每次 seed 都会把它们的权限
 * 完全对齐到这里的定义。用户自建的角色不会被触碰。
 */
const SYSTEM_ROLES: ReadonlyArray<{
  name: RoleName;
  description: string;
  permissions: readonly PermissionName[];
}> = [
  {
    name: ROLES.admin,
    description: "系统管理员，拥有全部权限",
    permissions: Object.values(PERMISSIONS),
  },
  {
    name: ROLES.user,
    description: "普通用户，默认无后台权限",
    permissions: [],
  },
];

async function main() {
  // seed 属于迁移/部署步骤, 使用直连地址; 本地只有一个连接串时回退到 DATABASE_URL。
  // 不要复用 lib/prisma.ts 的运行时单例, 否则会走 pooled 连接。
  const connectionString =
    process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("MIGRATE_DATABASE_URL or DATABASE_URL must be set.");
  }

  const prisma = createPrismaClient(connectionString);

  try {
    await prisma.$transaction(async (tx) => {
      const permissionIds = new Map<PermissionName, string>();

      // 只 upsert 当前权限目录, 不删除数据库里已有的其他权限,
      // 避免后台手工创建的权限被 seed 清掉。
      for (const name of Object.values(PERMISSIONS)) {
        const permission = await tx.permission.upsert({
          where: { name },
          update: { module: getPermissionModule(name) },
          create: { name, module: getPermissionModule(name) },
        });
        permissionIds.set(name, permission.id);
      }

      for (const role of SYSTEM_ROLES) {
        const row = await tx.role.upsert({
          where: { name: role.name },
          update: { description: role.description },
          create: {
            name: role.name,
            description: role.description,
          },
        });

        // 内置角色由代码定义, 先清空再重建, 保证和 PERMISSIONS 一致
        await tx.rolePermission.deleteMany({ where: { roleId: row.id } });

        if (role.permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: role.permissions.map((name) => {
              const permissionId = permissionIds.get(name);
              if (!permissionId) {
                throw new Error(`Permission "${name}" was not seeded.`);
              }
              return { roleId: row.id, permissionId };
            }),
          });
        }
      }
    });

    console.log("RBAC seed completed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("RBAC seed failed:", error);
  process.exitCode = 1;
});
