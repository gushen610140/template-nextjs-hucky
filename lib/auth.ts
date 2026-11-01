import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { cache } from "react";
import { PATHNAME_HEADER } from "@/lib/request-headers";
import {
  getSessionUser,
  SESSION_COOKIE,
  type SessionUser,
} from "@/lib/session";

/**
 * 认证的权威校验层。
 *
 * 分工:
 * - `proxy.ts` 只做乐观检查（cookie 是否存在、格式是否像本应用签发的 token），
 *   这样每个请求都不会先查一次数据库。
 * - 本模块负责权威检查（token 哈希查库 + 过期 / 禁用判断），
 *   必须在真正需要用户身份的地方（layout / page / Server Action）调用。
 *
 * 只依赖 proxy 的乐观检查是不安全的：伪造一个格式正确的 cookie 就能通过。
 */

/**
 * 当前请求的登录用户；未登录、会话过期或用户被禁用时返回 null。
 *
 * 用 React `cache` 做**请求内**去重：同一次渲染里 layout、page、组件
 * 多次调用只会查一次数据库。它不是跨请求缓存，请求结束即失效。
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getSessionUser(token);
});

/**
 * 要求登录，未登录时跳转到当前语言的登录页。
 *
 * 返回的用户对象可以安全地传给页面组件（不含 `logtoSub` 等内部字段）。
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (user) return user;

  const [locale, pathname] = await Promise.all([
    getLocale(),
    currentPathname(),
  ]);
  // 只带站内路径; login 页面会再次校验, 防止开放重定向
  const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
  redirect(`/${locale}/login${next}`);
}

/** 读取 proxy 注入的原始路径；缺失时回退为不带 next 的登录页 */
async function currentPathname(): Promise<string | null> {
  const pathname = (await headers()).get(PATHNAME_HEADER);
  return pathname?.startsWith("/") ? pathname : null;
}
