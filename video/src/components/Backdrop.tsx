import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { palette } from "../theme";

/**
 * 全片统一背景：近黑底 + 极淡网格 + 两团缓慢漂移的品牌色光晕。
 * 光晕用 interpolate 做长周期位移，避免出现可察觉的循环接缝。
 */
export const Backdrop = () => {
  const frame = useCurrentFrame();
  const driftX = interpolate(frame, [0, 6000], [-120, 140]);
  const driftY = interpolate(frame, [0, 6000], [40, -80]);
  const driftX2 = interpolate(frame, [0, 6000], [90, -160]);
  const driftY2 = interpolate(frame, [0, 6000], [-60, 110]);

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg }}>
      <AbsoluteFill
        style={{
          backgroundImage: [
            "linear-gradient(to right, rgba(255,255,255,0.028) 1px, transparent 1px)",
            "linear-gradient(to bottom, rgba(255,255,255,0.028) 1px, transparent 1px)",
          ].join(","),
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(circle at 50% 45%, rgba(0,0,0,0.9), transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 45%, rgba(0,0,0,0.9), transparent 78%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 260 + driftX,
          top: -220 + driftY,
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(94,233,181,0.16), transparent 62%)`,
          filter: "blur(20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -180 + driftX2,
          bottom: -320 + driftY2,
          width: 1000,
          height: 1000,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(0,188,125,0.12), transparent 62%)`,
          filter: "blur(24px)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
