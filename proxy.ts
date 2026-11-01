import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { PATHNAME_HEADER } from "./lib/request-headers";
import { isSessionTokenShape, SESSION_COOKIE } from "./lib/session-token";

// intl 国际化重定向组件构造
const intlMiddleware = createMiddleware(routing);

const publicRoutes = ["/", "/login", "/docs"];
function isPublicRoute(pathname: string) {
  // 去除路径中的语言前缀再做匹配
  const pathWithoutLocale =
    pathname.replace(new RegExp(`^/(${routing.locales.join("|")})`), "") || "/";

  return publicRoutes.some(
    (route) =>
      pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`),
  );
}

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 把原始路径透传给服务端组件, 供 requireUser() 拼登录回跳地址
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, pathname);

  // Logto 回调位于 /api/auth/callback, 已被下方 matcher 的 `api` 排除规则跳过,
  // 因此不会经过 intlMiddleware, 无需额外放行。
  // 传入带自定义请求头的副本, next-intl 会在这份 headers 基础上继续追加 locale。
  const intlResponse = intlMiddleware(
    new NextRequest(request, { headers: requestHeaders }),
  );

  // 发现重定向状态直接放行
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  // 放行公共路由
  if (isPublicRoute(pathname)) {
    return intlResponse;
  }

  /*
   * 乐观检查: 只看 cookie 是否存在、格式是否像本应用签发的 token，不查数据库。
   *
   * 这里挡不住伪造的 cookie，所以它不是安全边界。权威校验在
   * lib/auth.ts 的 requireUser() 里完成，由受保护路由的 layout 调用。
   * 这样做的收益: 每个请求（包括 prefetch 和 RSC 导航）不再先付一次 DB 往返；
   * 真正的会话校验只在渲染受保护页面时发生，并且同一请求内通过 React cache 去重。
   */
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!isSessionTokenShape(token)) {
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
