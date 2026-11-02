import { ROLES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * 首次部署引导: 把 `BOOTSTRAP_ADMIN_EMAILS` 中的邮箱提升为管理员。
 *
 * 规则:
 * - 只在该邮箱已验证 (调用方保证) 且系统里还没有任何管理员时生效。
 * - 幂等: 重复登录不会重复写入。
 * - 系统已有管理员后自动失效, 环境变量可以保留也可以删除。
 *
 * 这样新环境不需要手动跑 SQL 或写入固定管理员账号, 也不会因为忘记删
 * 环境变量而永久保留一个提权入口。
 */
export async function ensureBootstrapAdmin(user: {
  id: string;
  email: string;
}): Promise<void> {
  const allowlist = (process.env.BOOTSTRAP_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) return;
  if (!allowlist.includes(user.email.toLowerCase())) return;

  const adminRole = await prisma.role.findUnique({
    where: { name: ROLES.admin },
    select: { id: true },
  });
  if (!adminRole) return;

  const existingAdmin = await prisma.userRole.count({
    where: {
      roleId: adminRole.id,
      // 只把启用中的管理员算作“已有管理员”，全部被禁用时仍允许引导恢复
      user: { isActive: true },
    },
  });
  if (existingAdmin > 0) return;

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: user.id, roleId: adminRole.id },
    },
    update: {},
    create: { userId: user.id, roleId: adminRole.id },
  });

  console.info(
    `[bootstrap] Granted "${ROLES.admin}" role to ${user.email} (${user.id}).`,
  );
}
