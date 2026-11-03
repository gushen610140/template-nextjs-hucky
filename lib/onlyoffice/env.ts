export type OnlyOfficeSettings = {
  /** 浏览器和 Document Server 都能访问的地址 */
  dsUrl: string;
  /** 应用自己的公网地址, 用于拼 callbackUrl */
  appBaseUrl: string;
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

/**
 * 延迟读取环境变量: 构建阶段不校验, 只有真正打开编辑页 / 处理回调时才要求齐全。
 */
export function getOnlyOfficeSettings(): OnlyOfficeConfigResult {
  const dsUrl = process.env.ONLYOFFICE_DS_URL?.trim();
  const jwtSecret = process.env.ONLYOFFICE_JWT_SECRET?.trim();
  const appBaseUrl = (
    process.env.APP_BASE_URL?.trim() || process.env.LOGTO_BASE_URL?.trim()
  )?.trim();
  const internalUrl = process.env.ONLYOFFICE_INTERNAL_URL?.trim();

  const missing = [
    ["ONLYOFFICE_DS_URL", dsUrl],
    ["ONLYOFFICE_JWT_SECRET", jwtSecret],
    ["APP_BASE_URL", appBaseUrl],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name as string);

  if (missing.length > 0) return { ok: false, missing };

  return {
    ok: true,
    value: {
      dsUrl: trimTrailingSlash(dsUrl as string),
      appBaseUrl: trimTrailingSlash(appBaseUrl as string),
      jwtSecret: jwtSecret as string,
      internalUrl: internalUrl ? trimTrailingSlash(internalUrl) : undefined,
    },
  };
}
