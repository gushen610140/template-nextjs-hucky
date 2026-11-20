import { Config } from "@remotion/cli/config";

// 静帧用 jpeg 可以显著加快编码；画面没有大面积渐变噪点，95 质量肉眼无损。
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer("angle");
