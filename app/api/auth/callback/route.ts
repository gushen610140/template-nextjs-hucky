import { getLogtoContext, handleSignIn } from "@logto/next/server-actions";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { ensureBootstrapAdmin } from "@/lib/bootstrap-admin";
import { LOGTO_CALLBACK_PATH, logtoConfig } from "@/lib/logto";
import { upsertLogtoUser } from "@/lib/logto-user";
import {
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

// 需要 Prisma / node:crypto, 固定使用 Node.js runtime
export const runtime = "nodejs";

/** 读取 next-intl 记录的语言, 非法值回退到默认语言 */
function resolveLocale(locale: string | undefined): string {
  return routing.locales.includes(locale as (typeof routing.locales)[number])
    ? (locale as string)
    : routing.defaultLocale;
}

function loginErrorUrl(): URL {
  return new URL(
    `/${routing.defaultLocale}/login?error=logto`,
    logtoConfig.baseUrl,
  );
}

/**
 * Logto OAuth 回调。
 *
 * 流程: 用 code 换取 token(写入 Logto 自己的 cookie) → 读取 claims →
 * upsert 本地 User → 建立本应用的不透明 session。
 * 这样受保护路由只需要处理本应用的 session, 不必为 Logto 增加特殊分支。
 */
export async function GET(request: NextRequest) {
  try {
    // 必须显式传入新的回调 URL: SDK 默认值是 `${baseUrl}/callback`,
    // 而 handleSignInCallback 会校验 callbackUri 与 signIn 时的 redirectUri 一致。
    await handleSignIn(
      logtoConfig,
      new URL(
        `${LOGTO_CALLBACK_PATH}?${request.nextUrl.searchParams.toString()}`,
        logtoConfig.baseUrl,
      ),
    );
  } catch (error) {
    console.error("Logto sign-in callback failed:", error);
    return NextResponse.redirect(loginErrorUrl());
  }

  const { isAuthenticated, claims } = await getLogtoContext(logtoConfig);
  if (!isAuthenticated || !claims) {
    console.error(
      "[Logto] callback finished without an authenticated context",
      {
        isAuthenticated,
        hasClaims: Boolean(claims),
      },
    );
    return NextResponse.redirect(loginErrorUrl());
  }

  let user: Awaited<ReturnType<typeof upsertLogtoUser>>;
  try {
    user = await upsertLogtoUser(claims);
  } catch (error) {
    console.error("Failed to bridge Logto user:", error);
    return NextResponse.redirect(loginErrorUrl());
  }

  if (!user.isActive) {
    return NextResponse.redirect(loginErrorUrl());
  }

  // 首次部署引导: 白名单邮箱在系统还没有管理员时自动获得 admin 角色。
  // 引导失败不应阻塞登录, 用户可以下次登录重试。
  try {
    await ensureBootstrapAdmin({ id: user.id, email: user.email });
  } catch (error) {
    console.error("Failed to bootstrap admin role:", error);
  }

  const token = await createSession(user.id);

  const cookieStore = await cookies();
  const next = cookieStore.get("logto_next")?.value;
  cookieStore.delete("logto_next");
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions);

  const locale = resolveLocale(cookieStore.get("NEXT_LOCALE")?.value);
  // 只接受站内绝对路径, 防开放重定向
  const target =
    next?.startsWith("/") && !next.startsWith("//")
      ? next
      : `/${locale}/dashboard`;

  return NextResponse.redirect(new URL(target, logtoConfig.baseUrl));
}
