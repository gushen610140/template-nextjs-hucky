import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { getSessionUser, SESSION_COOKIE } from "./lib/session";

// intl 国际化重定向组件构造
const intlMiddleware = createMiddleware(routing);

const publicRoutes = ["/", "/login", "/register", "/docs"];
function isPublicRoute(pathname: string) {
  // 去除路径中的语言前缀再做匹配
  const pathWithoutLocale =
    pathname.replace(new RegExp(`^/(${routing.locales.join("|")})`), "") || "/";

  return publicRoutes.some(
    (route) =>
      pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`),
  );
}

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Logto 回调不带 locale 前缀, 直接交给 app/callback/route.ts。
  // 必须在 intlMiddleware 之前放行, 否则会被重写/重定向到 /<locale>/callback 而 404。
  if (pathname === "/callback") {
    return NextResponse.next();
  }

  // 国际化路径重写
  const intlResponse = intlMiddleware(request);

  // 发现重定向状态直接放行
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  // 放行公共路由
  if (isPublicRoute(pathname)) {
    return intlResponse;
  }

  // 保护非公共路由: 校验 httpOnly session cookie
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);

  if (!user) {
    const locale =
      routing.locales.find((l) => pathname.startsWith(`/${l}`)) ??
      routing.defaultLocale;
    // 直接跳到带 locale 的 login, 避免 next-intl 的 locale 补全跳转把 query 重新编码成 %2F
    // RFC 3986 允许 query 中出现原始 "/", 直接拼接即可
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.search = `next=${pathname}`;
    return NextResponse.redirect(loginUrl);
  }

  return intlResponse;
}

// 排除 api, 静态产物, 带拓展名文件
export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
