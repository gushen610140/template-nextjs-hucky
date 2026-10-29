import { signIn } from "@logto/next/server-actions";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { logtoConfig } from "@/lib/logto";

export const runtime = "nodejs";

/**
 * 发起 Logto 登录。
 *
 * signIn 会写好 Logto 的临时会话 cookie 并直接 redirect 到授权页。
 * `next` 参数(登录后回跳的业务路径)临时存进 httpOnly cookie, 由 /callback 消费,
 * 因为 Logto 的 redirect_uri 必须与控制台注册的地址完全一致, 不能带 query。
 */
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next");

  if (next?.startsWith("/") && !next.startsWith("//")) {
    const cookieStore = await cookies();
    cookieStore.set("logto_next", next, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });
  }

  try {
    await signIn(logtoConfig);
  } catch (error) {
    // signIn 成功时靠抛出 NEXT_REDIRECT 完成跳转, 必须原样抛回给 Next
    unstable_rethrow(error);

    console.error("Failed to start Logto sign-in:", error);
    return NextResponse.redirect(
      new URL(
        `/${routing.defaultLocale}/login?error=logto`,
        logtoConfig.baseUrl,
      ),
    );
  }
}
