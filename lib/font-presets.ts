/**
 * 字体注册表。
 *
 * 设计目标:
 * - 默认完全使用系统字体, 不发起任何字体请求;
 * - 字体文件按需加载 (FontFace API), 用户不切换就不下载;
 * - 一个字体角色 (sans / heading / mono / cjk) 可以独立切换;
 * - 拉丁角色 (sans / heading / mono) 只决定拉丁字形, 中文字形交给 cjk 角色;
 * - cjk 角色是正文字体, 在字体栈里排在拉丁字体之后, 因此不会覆盖英文观感。
 *
 * 新增字体时:
 * 1. 把字体文件放到 public/fonts/;
 * 2. 在 FONT_LIBRARY 里登记 family / file / weight / format;
 * 3. 在 FONT_OPTIONS 里追加 id;
 * 4. 在 messages 的 ThemeCustomizer.fonts 下补文案。
 */

export const FONT_ROLES = ["sans", "heading", "mono", "cjk"] as const;

export type FontRole = (typeof FONT_ROLES)[number];

export const FONT_OPTIONS = {
  sans: ["system", "neosanspro", "erasmd"],
  heading: ["system", "din"],
  mono: ["system", "notosansmono"],
  cjk: ["system", "zhoufangriming"],
} as const;

export type SansFontId = (typeof FONT_OPTIONS.sans)[number];
export type HeadingFontId = (typeof FONT_OPTIONS.heading)[number];
export type MonoFontId = (typeof FONT_OPTIONS.mono)[number];
export type CjkFontId = (typeof FONT_OPTIONS.cjk)[number];

/**
 * 正文可选字体。
 *
 * 无衬线 (sans) 和中文正文 (cjk) 最终都落在同一个 --font-sans 栈里，
 * 所以面板上合并成一个「正文」选项：选拉丁字体时中文回落系统字体，
 * 选中文 webfont 时拉丁回落系统字体。
 */
export const BODY_FONT_OPTIONS = [
  ...FONT_OPTIONS.sans,
  ...FONT_OPTIONS.cjk.filter((id) => id !== "system"),
] as const;

export type BodyFontId = (typeof BODY_FONT_OPTIONS)[number];

export type FontSettings = {
  sans: SansFontId;
  heading: HeadingFontId;
  mono: MonoFontId;
  cjk: CjkFontId;
};

export const DEFAULT_FONT_SETTINGS: FontSettings = {
  sans: "system",
  heading: "system",
  mono: "system",
  cjk: "system",
};

export const FONT_STORAGE_KEY = "hucky-font-settings";

/** 每个角色对应的 CSS 变量, 由 FontProvider 在运行时覆盖 */
export const FONT_CSS_VARIABLES: Record<FontRole, string> = {
  sans: "--font-latin-sans",
  heading: "--font-latin-heading",
  mono: "--font-latin-mono",
  cjk: "--font-cjk-sans",
};

/** 自定义字体后面紧跟的系统兜底栈, 和 globals.css 里的 --font-system-* 对应 */
export const FONT_SYSTEM_FALLBACK: Record<FontRole, string> = {
  sans: "var(--font-system-sans)",
  heading: "var(--font-system-heading)",
  mono: "var(--font-system-mono)",
  cjk: "var(--font-system-cjk-sans)",
};

export type FontFormat = "truetype" | "opentype";

/**
 * 中文码位范围: 部首、汉字、注音、假名、CJK 标点、全角/半角形式以及扩展区。
 *
 * 中文 webfont 通常自带拉丁字形, 用这个范围把字体限制在中文码位,
 * 这样即使把它排在字体栈最前面, 英文和数字也不会被替换。
 */
export const CJK_UNICODE_RANGE =
  "U+2E80-2EFF, U+2F00-2FDF, U+3000-303F, U+3040-30FF, U+3100-312F, " +
  "U+31C0-31EF, U+3200-32FF, U+3400-4DBF, U+4E00-9FFF, U+F900-FAFF, " +
  "U+FE30-FE4F, U+FF00-FFEF, U+20000-2FFFF";

export type FontSpec = {
  /** FontFace 使用的 family 名, 带 Hucky 前缀避免和系统已安装字体重名 */
  family: string;
  /** public/ 下的绝对路径 */
  file: string;
  /** 静态字体只有单个字重 */
  weight: string;
  format: FontFormat;
  /** 可选的 unicode-range, 用来把字体限制在特定码位 */
  unicodeRange?: string;
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
  cjk: {
    zhoufangriming: {
      family: "Hucky ZhouFangRiMing",
      file: "/fonts/ZhouFangRiMing-Regular.otf",
      weight: "400",
      format: "opentype",
      unicodeRange: CJK_UNICODE_RANGE,
    },
  },
};

/** 取某个字体角色的本地字体配置; system 或未知 id 返回 null */
export function getFontSpec(role: FontRole, id: string): FontSpec | null {
  if (id === "system") return null;
  const library = FONT_LIBRARY[role] as Record<string, FontSpec | undefined>;
  return library[id] ?? null;
}

/**
 * 把 sans / cjk 两个存储字段折叠成面板上的单个「正文」值。
 * 中文 webfont 优先，因为它是用户最近一次显式选择的中文字体。
 */
export function getBodyFontId(settings: FontSettings): BodyFontId {
  return settings.cjk === "system" ? settings.sans : settings.cjk;
}

/** 「正文」选项实际对应的字体角色。 */
export function getBodyFontRole(id: BodyFontId): "sans" | "cjk" {
  return FONT_OPTIONS.cjk.includes(id as CjkFontId) ? "cjk" : "sans";
}

/** 把「正文」选择展开回 sans / cjk 两个角色。 */
export function getBodyFontSettings(
  id: BodyFontId,
): Pick<FontSettings, "sans" | "cjk"> {
  const isCjk = FONT_OPTIONS.cjk.includes(id as CjkFontId);

  return {
    sans: isCjk ? "system" : (id as SansFontId),
    cjk: isCjk ? (id as CjkFontId) : "system",
  };
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
 *
 * 按角色逐个校验并补齐默认值, 旧的存储 (例如只有 sans / heading / mono)
 * 升级后不会被整份丢弃, 新增角色直接落到 system。
 */
export function parseFontSettings(value: unknown): FontSettings | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Record<FontRole, unknown>>;

  return {
    sans: pickFontId("sans", candidate.sans),
    heading: pickFontId("heading", candidate.heading),
    mono: pickFontId("mono", candidate.mono),
    cjk: pickFontId("cjk", candidate.cjk),
  };
}
