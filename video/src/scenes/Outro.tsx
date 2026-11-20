import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Chip } from "../components/ui";
import { fonts, palette } from "../theme";

export const Outro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 8, fps, config: { damping: 200 } });
  const fade = interpolate(frame, [250, 300], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 28,
        opacity: fade,
      }}
    >
      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 128,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          color: palette.text,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 24}px)`,
        }}
      >
        Hucky
      </div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 20,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: palette.mint,
          opacity: enter,
        }}
      >
        next.js full-stack template
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
        {["认证", "数据", "文件", "AI", "发布"].map((item, index) => (
          <Chip key={item} delay={40 + index * 8} muted>
            {item}
          </Chip>
        ))}
      </div>

      <div
        style={{
          marginTop: 26,
          fontFamily: fonts.sans,
          fontSize: 34,
          color: palette.textMuted,
          opacity: Math.min(1, Math.max(0, (frame - 110) / 22)),
        }}
      >
        克隆之后，直接开始写业务
      </div>

      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 18,
          color: palette.textDim,
          opacity: Math.min(1, Math.max(0, (frame - 150) / 22)),
        }}
      >
        template-nextjs-hucky
      </div>
    </AbsoluteFill>
  );
};
