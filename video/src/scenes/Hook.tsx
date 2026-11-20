import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fonts, palette } from "../theme";

/**
 * 开场 11 秒：品牌字标 + 核心卖点。
 * 不做花哨转场，靠字距、光晕和计数建立第一印象。
 */
export const Hook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const markIn = spring({
    frame: frame - 6,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const subtitleIn = spring({
    frame: frame - 34,
    fps,
    config: { damping: 200 },
  });
  const metricIn = spring({ frame: frame - 92, fps, config: { damping: 200 } });
  const rule = interpolate(frame, [26, 62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sweep = interpolate(frame, [48, 110], [-40, 160], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 34,
        paddingTop: 40,
      }}
    >
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 22,
          letterSpacing: "0.44em",
          textTransform: "uppercase",
          color: palette.mint,
          opacity: interpolate(frame, [0, 18], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        full-stack template
      </div>

      <div
        style={{
          position: "relative",
          fontFamily: fonts.sans,
          fontSize: 210,
          fontWeight: 700,
          letterSpacing: "-0.05em",
          lineHeight: 1,
          color: palette.text,
          transform: `scale(${1.05 - markIn * 0.05})`,
          opacity: markIn,
          filter: `blur(${(1 - markIn) * 14}px)`,
        }}
      >
        <span
          style={{
            backgroundImage: `linear-gradient(100deg, ${palette.text} 30%, ${palette.mint} 55%, ${palette.text} 80%)`,
            backgroundSize: "260% 100%",
            backgroundPosition: `${sweep}% 0`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Hucky
        </span>
      </div>

      <div
        style={{
          height: 2,
          width: 560 * rule,
          background: `linear-gradient(90deg, transparent, ${palette.mint}, transparent)`,
          opacity: 0.8,
        }}
      />

      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 40,
          letterSpacing: "0.02em",
          color: palette.textMuted,
          opacity: subtitleIn,
          transform: `translateY(${(1 - subtitleIn) * 22}px)`,
        }}
      >
        Next.js 全栈模板 · 认证 / 数据 / 文件 / AI / 发布
      </div>

      <div
        style={{
          marginTop: 26,
          display: "flex",
          alignItems: "center",
          gap: 34,
          opacity: metricIn,
          transform: `translateY(${(1 - metricIn) * 30}px)`,
        }}
      >
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 58,
            color: palette.textDim,
            textDecoration: "line-through",
            textDecorationThickness: 2,
          }}
        >
          几周
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              style={{
                width: 34,
                height: 4,
                borderRadius: 999,
                backgroundColor: palette.mint,
                opacity: interpolate(
                  frame,
                  [110 + index * 8, 122 + index * 8],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                ),
              }}
            />
          ))}
        </div>
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 86,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: palette.mint,
            textShadow: `0 0 60px rgba(94,233,181,0.45)`,
          }}
        >
          1 小时
        </div>
      </div>
    </AbsoluteFill>
  );
};
