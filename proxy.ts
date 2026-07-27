import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// intl 国际化重定向组件构造
const intlMiddleware = createMiddleware(routing);

const publicRoutes = ["/"];
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
  // 国际化路径重写
  const intlResponse = intlMiddleware(request);

  // 发现重定向状态直接放行
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  const pathname = request.nextUrl.pathname;

  // 放行公共路由
  if (isPublicRoute(pathname)) {
    return intlResponse;
  }

  // 保护非公共路由
  // TODO: 登录状态验证
  const token = "";
  return intlResponse;
}

// 排除 api, 静态产物, 带拓展名文件
export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
