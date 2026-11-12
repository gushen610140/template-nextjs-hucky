import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { palette } from "../theme";

type Chapter = { label: string; start: number };

type Props = {
  brand?: string;
  chapters: Chapter[];
  tint?: string;
};

/**
 * 常驻的影片外框：左上品牌、右上级节、底部进度条。
 * 进度条用整段时长归一化，任何一秒截帧都能看出所处位置。
 */
export const Chrome = ({
  brand = "hucky · next.js template",
  chapters,
  tint = palette.mint,
}: Props) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const current =
    [...chapters].reverse().find((item) => frame >= item.start) ?? chapters[0];
  const progress = Math.min(1, frame / (durationInFrames - 1));
  const fadeIn = interpolate(frame, [0, 24], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: fadeIn,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 44,
          left: 64,
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontFamily: '"Noto Sans Mono", monospace',
          fontSize: 20,
          letterSpacing: "0.08em",
          color: palette.textDim,
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: 999,
            backgroundColor: tint,
            boxShadow: `0 0 14px ${tint}`,
          }}
        />
        {brand}
      </div>
      <div
        style={{
          position: "absolute",
          top: 44,
          right: 64,
          fontFamily: '"Noto Sans Mono", monospace',
          fontSize: 20,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: palette.textDim,
        }}
      >
        {current.label}
      </div>
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 38,
          height: 2,
          backgroundColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            backgroundColor: tint,
            boxShadow: `0 0 12px ${tint}`,
          }}
        />
      </div>
    </div>
  );
};
