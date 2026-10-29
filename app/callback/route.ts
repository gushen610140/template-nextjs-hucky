import { getLogtoContext, handleSignIn } from "@logto/next/server-actions";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { logtoConfig } from "@/lib/logto";
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
 * 这样 proxy.ts 和 /api/auth/me 完全不用改, Logto 只是多了一种登录方式。
 */
export async function GET(request: NextRequest) {
  try {
    await handleSignIn(logtoConfig, request.nextUrl.searchParams);
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
