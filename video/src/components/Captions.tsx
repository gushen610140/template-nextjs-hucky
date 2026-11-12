import { interpolate, useCurrentFrame } from "remotion";
import { palette } from "../theme";

export type CaptionLine = { from: number; to: number; text: string };

type Props = {
  lines: CaptionLine[];
  tint?: string;
};

/**
 * 全片字幕：一条时间轴，按当前帧取命中行，6 帧淡入淡出。
 * 放在 Composition 根部，因此 from/to 都是全片绝对帧号。
 */
export const Captions = ({ lines, tint = palette.mint }: Props) => {
  const frame = useCurrentFrame();
  const line = lines.find((item) => frame >= item.from && frame < item.to);
  if (!line) return null;

  const local = frame - line.from;
  const remaining = line.to - frame;
  const opacity =
    Math.min(
      interpolate(local, [0, 6], [0, 1], { extrapolateRight: "clamp" }),
      interpolate(remaining, [0, 6], [0, 1], { extrapolateRight: "clamp" }),
    ) || 0;
  const y = interpolate(local, [0, 10], [14, 0], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 74,
        display: "flex",
        justifyContent: "center",
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "18px 34px 18px 28px",
          borderRadius: 999,
          backgroundColor: "rgba(10,10,10,0.72)",
          border: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(18px)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
        }}
      >
        <span
          style={{
            width: 4,
            height: 30,
            borderRadius: 999,
            backgroundColor: tint,
            boxShadow: `0 0 16px ${tint}`,
          }}
        />
        <span
          style={{
            fontFamily:
              '"Segoe UI", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif',
            fontSize: 30,
            lineHeight: 1.35,
            letterSpacing: "0.01em",
            color: palette.text,
            whiteSpace: "nowrap",
          }}
        >
          {line.text}
        </span>
      </div>
    </div>
  );
};
