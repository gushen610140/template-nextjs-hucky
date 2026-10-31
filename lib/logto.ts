import { type LogtoNextConfig, UserScope } from "@logto/next";

/**
 * Logto 配置。
 *
 * 官方示例把它放在 app/logto.ts, 但那只是文档的约定; SDK 不关心文件位置。
 * 项目里跨路由共享的服务端模块都放在 lib/, 所以这里也用 lib/logto.ts。
 *
 * 注意: 本文件包含 appSecret / cookieSecret, 只能在服务端使用。
 * 不要加 "use client", 也不要被客户端组件直接 import。
 */
/**
 * Logto 回调路径。
 *
 * SDK 默认使用 `${baseUrl}/callback`, 这里必须与 app/api/auth/callback/route.ts
 * 以及 Logto 控制台注册的 Redirect URI 保持一致。
 */
export const LOGTO_CALLBACK_PATH = "/api/auth/callback";

/** Logto 控制台注册的完整 Redirect URI */
export function getLogtoRedirectUri(): string {
  return new URL(LOGTO_CALLBACK_PATH, logtoConfig.baseUrl).toString();
}

export const logtoConfig: LogtoNextConfig = {
  endpoint: process.env.LOGTO_ENDPOINT ?? "",
  appId: process.env.LOGTO_APP_ID ?? "",
  appSecret: process.env.LOGTO_APP_SECRET ?? "",
  baseUrl: process.env.LOGTO_BASE_URL ?? "http://localhost:3000",
  // 至少 32 个字符, 否则 CookieStorage 会报 "Either sessionWrapper or encryptionKey must be provided"
  cookieSecret: process.env.LOGTO_COOKIE_SECRET ?? "",
  cookieSecure: process.env.NODE_ENV === "production",
  // SDK 默认只带 openid / profile / offline_access, 桥接本地 User 需要 email
  scopes: [UserScope.Email],
};
