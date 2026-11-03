import { headers } from "next/headers";

export type OnlyOfficeSettings = {
  /** 浏览器和 Document Server 都能访问的地址 */
  dsUrl: string;
  jwtSecret: string;
  /** DS 回调返回的内部地址 (可选), 用于校验编辑后文件 URL */
  internalUrl?: string;
};

export type OnlyOfficeConfigResult =
  | { ok: true; value: OnlyOfficeSettings }
  | { ok: false; missing: string[] };

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function isLocalHost(host: string): boolean {
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.") ||
    host.startsWith("[::1]")
  );
}

/**
 * 回调地址的应用侧基地址。
 *
 * 优先显式 APP_BASE_URL; 未配置时使用当前请求的 host,
 * 这样预览部署 / 多域名部署不需要为每个地址改环境变量。
 * 反向代理必须覆盖 x-forwarded-host / x-forwarded-proto。
 */
export async function resolveAppBaseUrl(): Promise<string | null> {
  const explicit = process.env.APP_BASE_URL?.trim();
  if (explicit) return trimTrailingSlash(explicit);

  const requestHeaders = await headers();
  const forwardedHost = requestHeaders
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost ?? requestHeaders.get("host");
  if (host) {
    const proto =
      requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
      (isLocalHost(host) ? "http" : "https");
    return `${proto}://${host}`;
  }

  const fallback = process.env.LOGTO_BASE_URL?.trim();
  return fallback ? trimTrailingSlash(fallback) : null;
}

/**
 * 延迟读取环境变量: 构建阶段不校验, 只有真正打开编辑页 / 处理回调时才要求齐全。
 */
export function getOnlyOfficeSettings(): OnlyOfficeConfigResult {
  const dsUrl = process.env.ONLYOFFICE_DS_URL?.trim();
  const jwtSecret = process.env.ONLYOFFICE_JWT_SECRET?.trim();
  const internalUrl = process.env.ONLYOFFICE_INTERNAL_URL?.trim();

  const missing = [
    ["ONLYOFFICE_DS_URL", dsUrl],
    ["ONLYOFFICE_JWT_SECRET", jwtSecret],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name as string);

  if (missing.length > 0) return { ok: false, missing };

  return {
    ok: true,
    value: {
      dsUrl: trimTrailingSlash(dsUrl as string),
      jwtSecret: jwtSecret as string,
      internalUrl: internalUrl ? trimTrailingSlash(internalUrl) : undefined,
    },
  };
}
