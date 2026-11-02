import { notFound } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";
import { cache } from "react";
import { getCurrentUser, requireUser } from "@/lib/auth";
import type { PermissionName } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";

/**
 * 当前用户的全部权限。
 *
 * 用 React `cache` 做请求内去重: 同一次渲染里多个页面 / 组件调用
 * 只会查一次数据库。它不是跨请求缓存, 请求结束即失效。
 */
export const getUserPermissions = cache(async (userId: string) => {
  const rows = await prisma.rolePermission.findMany({
    where: { role: { users: { some: { userId } } } },
    select: { permission: { select: { name: true } } },
  });

  return new Set(rows.map((row) => row.permission.name));
});

export async function hasPermission(
  userId: string,
  permission: PermissionName,
): Promise<boolean> {
  return (await getUserPermissions(userId)).has(permission);
}

/**
 * 页面级授权。
 *
 * 当前页面暂未接入, 保留给后续需要限制的页面。无权限时返回 404,
 * 不暴露后台模块是否存在。
 */
export async function requirePermission(
  permission: PermissionName,
): Promise<SessionUser> {
  const user = await requireUser();
  if (!(await hasPermission(user.id, permission))) {
    notFound();
  }
  return user;
}

type RouteContext = unknown;
type AuthorizedHandler<TContext> = (
  request: NextRequest,
  context: TContext,
  user: SessionUser,
) => Response | Promise<Response>;

/**
 * 只要求登录, 不要求权限。新 API 的默认包装。
 */
export function withAuth<TContext = RouteContext>(
  handler: AuthorizedHandler<TContext>,
) {
  return async (request: NextRequest, context: TContext): Promise<Response> => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(request, context, user);
  };
}

/**
 * 要求登录 + 指定权限。需要限制的 API 使用。
 */
export function withPermission<TContext = RouteContext>(
  permission: PermissionName,
  handler: AuthorizedHandler<TContext>,
) {
  return async (request: NextRequest, context: TContext): Promise<Response> => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await hasPermission(user.id, permission))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(request, context, user);
  };
}
