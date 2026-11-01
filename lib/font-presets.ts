/**
 * 字体注册表。
 *
 * 设计目标:
 * - 默认完全使用系统字体, 不发起任何字体请求;
 * - 字体文件按需加载 (FontFace API), 用户不切换就不下载;
 * - 一个字体角色 (sans / heading / mono) 可以独立切换;
 * - 只处理拉丁字形, 中文继续走 globals.css 里的系统字体栈。
 *
 * 新增字体时:
 * 1. 把字体文件放到 public/fonts/;
 * 2. 在 FONT_LIBRARY 里登记 family / file / weight / format;
 * 3. 在 FONT_OPTIONS 里追加 id;
 * 4. 在 messages 的 ThemeCustomizer.fonts 下补文案。
 */

export const FONT_ROLES = ["sans", "heading", "mono"] as const;

export type FontRole = (typeof FONT_ROLES)[number];

export const FONT_OPTIONS = {
  sans: ["system", "neosanspro", "erasmd"],
  heading: ["system", "din"],
  mono: ["system", "notosansmono"],
} as const;

export type SansFontId = (typeof FONT_OPTIONS.sans)[number];
export type HeadingFontId = (typeof FONT_OPTIONS.heading)[number];
export type MonoFontId = (typeof FONT_OPTIONS.mono)[number];

export type FontSettings = {
  sans: SansFontId;
  heading: HeadingFontId;
  mono: MonoFontId;
};

export const DEFAULT_FONT_SETTINGS: FontSettings = {
  sans: "system",
  heading: "system",
  mono: "system",
};

export const FONT_STORAGE_KEY = "hucky-font-settings";

/** 每个角色对应的 CSS 变量, 由 FontProvider 在运行时覆盖 */
export const FONT_CSS_VARIABLES: Record<FontRole, string> = {
  sans: "--font-latin-sans",
  heading: "--font-latin-heading",
  mono: "--font-latin-mono",
};

/** 自定义字体后面紧跟的系统兜底栈, 和 globals.css 里的 --font-system-* 对应 */
export const FONT_SYSTEM_FALLBACK: Record<FontRole, string> = {
  sans: "var(--font-system-sans)",
  heading: "var(--font-system-heading)",
  mono: "var(--font-system-mono)",
};

export type FontFormat = "truetype" | "opentype";

export type FontSpec = {
  /** FontFace 使用的 family 名, 带 Hucky 前缀避免和系统已安装字体重名 */
  family: string;
  /** public/ 下的绝对路径 */
  file: string;
  /** 静态字体只有单个字重 */
  weight: string;
  format: FontFormat;
};

type LocalFontId<R extends FontRole> = Exclude<FontSettings[R], "system">;

export const FONT_LIBRARY: {
  [R in FontRole]: Record<LocalFontId<R>, FontSpec>;
} = {
  sans: {
    neosanspro: {
      family: "Hucky Neo Sans",
      file: "/fonts/NeoSansPro-Regular.ttf",
      weight: "400",
      format: "truetype",
    },
    erasmd: {
      family: "Hucky Eras",
      file: "/fonts/ERASMD.ttf",
      weight: "400",
      format: "truetype",
    },
  },
  heading: {
    din: {
      family: "Hucky DIN",
      file: "/fonts/din-1451-mittelschrift.otf",
      weight: "500",
      format: "opentype",
    },
  },
  mono: {
    notosansmono: {
      family: "Hucky Noto Mono",
      file: "/fonts/NotoSansMono-Regular.ttf",
      weight: "400",
      format: "truetype",
    },
  },
};

/** 取某个字体角色的本地字体配置; system 或未知 id 返回 null */
export function getFontSpec(role: FontRole, id: string): FontSpec | null {
  if (id === "system") return null;
  const library = FONT_LIBRARY[role] as Record<string, FontSpec | undefined>;
  return library[id] ?? null;
}

export function isFontSettings(value: unknown): value is FontSettings {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Record<FontRole, unknown>>;

  return FONT_ROLES.every((role) =>
    (FONT_OPTIONS[role] as readonly unknown[]).includes(candidate[role]),
  );
}
