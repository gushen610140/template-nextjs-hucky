export type OnlyOfficeSettings = {
  /** 浏览器和 Document Server 都能访问的地址 */
  dsUrl: string;
  jwtSecret: string;
  /** Document Server 保存时回调的完整 URL, 必须是公网可访问地址 */
  saveCallbackUrl: string;
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

/**
 * 延迟读取环境变量: 构建阶段不校验, 只有真正打开编辑页 / 处理回调时才要求齐全。
 */
export function getOnlyOfficeSettings(): OnlyOfficeConfigResult {
  const dsUrl = process.env.ONLYOFFICE_DS_URL?.trim();
  const jwtSecret = process.env.ONLYOFFICE_JWT_SECRET?.trim();
  const rawCallbackUrl = process.env.ONLYOFFICE_SAVE_CALLBACK_URL?.trim();
  const saveCallbackUrl = rawCallbackUrl
    ? normalizeCallbackUrl(rawCallbackUrl)
    : null;

  const missing = [
    ["ONLYOFFICE_DS_URL", dsUrl],
    ["ONLYOFFICE_JWT_SECRET", jwtSecret],
    ["ONLYOFFICE_SAVE_CALLBACK_URL", saveCallbackUrl],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name as string);

  if (missing.length > 0) return { ok: false, missing };

  return {
    ok: true,
    value: {
      dsUrl: trimTrailingSlash(dsUrl as string),
      jwtSecret: jwtSecret as string,
      saveCallbackUrl: saveCallbackUrl as string,
    },
  };
}
