/**
 * 视觉 token 直接取自 app/[locale]/globals.css：
 * oklch(0.845 0.143 165) 主色、oklch(0.145 0 0) 背景。
 * 视频里统一用十六进制，避免不同渲染环境对 oklch 的支持差异。
 */
export const palette = {
  bg: "#0a0a0a",
  bgSoft: "#101312",
  card: "#151918",
  cardHover: "#1b201e",
  border: "rgba(255,255,255,0.10)",
  borderStrong: "rgba(255,255,255,0.18)",
  text: "#fafafa",
  textMuted: "#a3ada9",
  textDim: "#6c7672",
  mint: "#5ee9b5",
  emerald: "#00bc7d",
  green: "#009966",
  deep: "#006045",
  danger: "#f87171",
} as const;

export const fonts = {
  /**
   * 项目默认走系统字体栈，headless Chrome 在 Windows 上会命中
   * Segoe UI + Microsoft YaHei，与截图里的页面保持一致。
   */
  sans: '"Segoe UI", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif',
  mono: '"Noto Sans Mono", Consolas, "Courier New", monospace',
} as const;

export const video = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 6000,
} as const;

/** 顶部章节标记用的名字，和场景一一对应。 */
export const chapters = [
  "overview",
  "foundation",
  "auth",
  "files",
  "ai",
  "agent-ops",
  "delivery",
  "outro",
] as const;
