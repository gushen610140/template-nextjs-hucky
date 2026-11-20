import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

/**
 * 只自托管等宽字体：终端、代码、指标数字都靠它。
 * 正文使用系统字体栈（Segoe UI / PingFang SC / Microsoft YaHei），
 * 与页面截图保持一致的观感，也省掉 20 MB 的中文字体文件。
 */
const mono = loadFont({
  family: "Noto Sans Mono",
  url: staticFile("fonts/NotoSansMono-Regular.ttf"),
  weight: "400",
});

export const loadVideoFonts = () => mono;
