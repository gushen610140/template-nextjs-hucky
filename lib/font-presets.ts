/**
 * 字体注册表。
 *
 * 设计目标:
 * - 默认完全使用系统字体, 不发起任何字体请求;
 * - 字体文件放在腾讯云 COS 的 fonts/ 目录, 平铺不嵌套;
 * - 文件扩展名固定 .ttf, 文件名去掉扩展名就是全局唯一的字体 id;
 * - 一个角色 (sans / heading / mono) 最多选一个自定义字体, 中英文共用同一个 family;
 * - 字体按需下载, 下载后写入浏览器 Cache Storage, 再次选择不再走网络。
 *
 * 新增字体时:
 * 1. 把 xxx.ttf 上传到 COS 的 fonts/ 目录;
 * 2. 在 FONT_LIBRARY 里登记 id 和字重;
 * 3. 在 FONT_OPTIONS 对应角色里追加 id;
 * 4. 在 messages 的 ThemeCustomizer.fonts 下补显示名。
 */

export const FONT_ROLES = ["sans", "heading", "mono"] as const;

export type FontRole = (typeof FONT_ROLES)[number];

/** COS 桶内固定目录, 文件平铺, 不建子目录 */
export const FONT_BUCKET_PREFIX = "fonts";

/** 字体文件统一格式; 新增字体必须是 ttf */
export const FONT_FILE_EXTENSION = "ttf";

/** 字体清单: key 即文件名去掉 .ttf, 同时是全局唯一 id */
export const FONT_LIBRARY = {
  "SarasaGothicSC-Regular": { weight: "400" },
  "SarasaMonoSC-Regular": { weight: "400" },
  "Yozai-Regular": { weight: "400" },
  "LXGWWenKai-Regular": { weight: "400" },
  "LXGWWenKaiMono-Regular": { weight: "400" },
  "DelaGothicOne-Regular": { weight: "400" },
  "LXGWNeoZhiSong": { weight: "400" },
  nzgrKangxi: { weight: "400" },
} as const satisfies Record<string, { weight: string }>;

export type FontId = keyof typeof FONT_LIBRARY;

/** 每个角色可选的字体; "system" 表示不加载 webfont */
export const FONT_OPTIONS = {
  sans: [
    "system",
    "SarasaGothicSC-Regular",
    "Yozai-Regular",
    "LXGWWenKai-Regular",
  ],
  heading: [
    "system",
    "DelaGothicOne-Regular",
    "LXGWNeoZhiSong",
    "nzgrKangxi",
  ],
  mono: [
    "system",
    "SarasaMonoSC-Regular",
    "LXGWWenKaiMono-Regular",
  ],
} as const satisfies Record<FontRole, readonly (FontId | "system")[]>;

export type FontOption<R extends FontRole> = (typeof FONT_OPTIONS)[R][number];

export type FontSettings = { [R in FontRole]: FontOption<R> };

export const DEFAULT_FONT_SETTINGS: FontSettings = {
  sans: "system",
  heading: "system",
  mono: "system",
};

export const FONT_STORAGE_KEY = "hucky-font-settings";

/** Cache Storage 里存放字体文件的桶名 */
export const FONT_CACHE_NAME = "hucky-fonts-v1";

/** 每个角色对应的 CSS 变量, 由 FontProvider 在运行时覆盖 */
export const FONT_CSS_VARIABLES: Record<FontRole, string> = {
  sans: "--font-custom-sans",
  heading: "--font-custom-heading",
  mono: "--font-custom-mono",
};

/** 自定义字体后面紧跟的系统兜底栈, 和 globals.css 里的 --font-system-* 对应 */
export const FONT_SYSTEM_FALLBACK: Record<FontRole, string> = {
  sans: "var(--font-system-sans)",
  heading: "var(--font-system-heading)",
  mono: "var(--font-system-mono)",
};

/** COS 对象 key: fonts/<id>.ttf */
export function getFontObjectKey(id: FontId): string {
  return `${FONT_BUCKET_PREFIX}/${id}.${FONT_FILE_EXTENSION}`;
}

/** FontFace 使用的 family 名, 带 Hucky 前缀避免和系统已安装字体重名 */
export function getFontFamily(id: FontId): string {
  return `Hucky ${id}`;
}

/** 浏览器缓存的 key, 和签名 URL 解耦, 保证同名字体只缓存一份 */
export function getFontCacheKey(id: FontId): string {
  return `/__fonts/${id}.${FONT_FILE_EXTENSION}`;
}

export function isFontId(value: string): value is FontId {
  return Object.hasOwn(FONT_LIBRARY, value);
}

/** 校验单个角色保存的值, 非法或缺失时回退到该角色的默认值 */
function pickFontId<R extends FontRole>(
  role: R,
  value: unknown,
): FontSettings[R] {
  const options: readonly unknown[] = FONT_OPTIONS[role];
  return options.includes(value)
    ? (value as FontSettings[R])
    : DEFAULT_FONT_SETTINGS[role];
}

/**
 * 解析 localStorage 里保存的字体设置。
 * 按角色逐个校验并补齐默认值, 已下线字体自动回落到 system。
 */
export function parseFontSettings(value: unknown): FontSettings | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Record<FontRole, unknown>>;

  return {
    sans: pickFontId("sans", candidate.sans),
    heading: pickFontId("heading", candidate.heading),
    mono: pickFontId("mono", candidate.mono),
  };
}
