export type OnlyOfficeSettings = {
  /** 浏览器和 Document Server 都能访问的地址 */
  dsUrl: string;
  jwtSecret: string;
  /**
   * 保存回调完整 URL。未配置或指向 loopback 时编辑器仍可打开,
   * 但 OnlyOffice 无法回调保存, UI 会提示用户。
   */
  saveCallbackUrl?: string;
};

export type OnlyOfficeConfigResult =
  | { ok: true; value: OnlyOfficeSettings }
  | { ok: false; missing: string[] };

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * 回调地址支持两种写法:
 * - https://app.example.com/api/onlyoffice/callback
 * - https://app.example.com
 * 只写域名时自动补全路径, 避免回调 404。
 */
function normalizeCallbackUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.pathname.endsWith("/api/onlyoffice/callback")) {
      url.pathname = `${trimTrailingSlash(url.pathname)}/api/onlyoffice/callback`;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function isLoopbackCallback(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".localhost")
  );
}

/**
 * 延迟读取环境变量: 构建阶段不校验, 只有真正打开编辑页 / 处理回调时才要求齐全。
 *
 * `ONLYOFFICE_SAVE_CALLBACK_URL` 是可选配置: 本地开发不填时仍允许打开
 * 编辑器, 只是保存不可用。
 */
export function getOnlyOfficeSettings(): OnlyOfficeConfigResult {
  const dsUrl = process.env.ONLYOFFICE_DS_URL?.trim();
  const jwtSecret = process.env.ONLYOFFICE_JWT_SECRET?.trim();
  const rawCallbackUrl = process.env.ONLYOFFICE_SAVE_CALLBACK_URL?.trim();
  const parsedCallbackUrl = rawCallbackUrl
    ? normalizeCallbackUrl(rawCallbackUrl)
    : null;
  const saveCallbackUrl =
    parsedCallbackUrl && !isLoopbackCallback(new URL(parsedCallbackUrl))
      ? parsedCallbackUrl
      : undefined;

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
      saveCallbackUrl,
    },
  };
}
