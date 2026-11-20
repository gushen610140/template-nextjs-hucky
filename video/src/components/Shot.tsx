import type { ReactNode } from "react";
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { shotSrc, shots } from "../data/shots";
import { fonts, palette } from "../theme";

export const BrowserFrame = ({
  url = "hucky.dev",
  width,
  height,
  children,
  opacity = 1,
}: {
  url?: string;
  width: number;
  height?: number;
  children: ReactNode;
  opacity?: number;
}) => (
  <div
    style={{
      width,
      borderRadius: 20,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.14)",
      backgroundColor: palette.card,
      boxShadow:
        "0 50px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
      opacity,
    }}
  >
    <div
      style={{
        height: 46,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 20px",
        backgroundColor: "#1b201e",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {["#ff5f57", "#febc2e", "#28c840"].map((color) => (
        <span
          key={color}
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            backgroundColor: color,
          }}
        />
      ))}
      <div
        style={{
          marginLeft: 18,
          flex: 1,
          height: 28,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          fontFamily: fonts.mono,
          fontSize: 15,
          color: palette.textDim,
        }}
      >
        {url}
      </div>
    </div>
    <div style={{ height, overflow: "hidden", position: "relative" }}>
      {children}
    </div>
  </div>
);

/** 侧边栏底部是登录账号，dashboard 截图统一盖住。 */
export const sidebarRedact = [{ x: 1.6, y: 90.2, w: 18.5, h: 8.2 }];

type ShotProps = {
  name: string;
  width: number;
  height?: number;
  url?: string;
  delay?: number;
  /** 镜头推进：起始/结束缩放，配合 focus 决定放大锚点。 */
  zoom?: [number, number];
  focus?: [string, string];
  lift?: number;
  label?: string;
  /** 脱敏区域，坐标为图片百分比；用毛玻璃盖住真实账号、密钥等。 */
  redact?: Array<{ x: number; y: number; w: number; h: number }>;
};

/**
 * 截图镜头。缩放在整个 Sequence 内线性推进，模仿真实运镜；
 * 没截到的图直接显示占位卡，不会让整个 render 失败。
 */
export const Shot = ({
  name,
  width,
  height,
  url,
  delay = 0,
  zoom = [1, 1.06],
  focus = ["50%", "0%"],
  lift = 0,
  label,
  redact = [],
}: ShotProps) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 26, mass: 0.9 },
  });
  const scale = interpolate(frame, [0, durationInFrames], zoom, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const src = shotSrc(name);
  const meta = shots[name];

  return (
    <div
      style={{
        opacity: Math.min(1, enter * 1.4),
        transform: `translateY(${(1 - enter) * 46 - lift}px)`,
      }}
    >
      <BrowserFrame
        url={url ?? `hucky.dev/${name}`}
        width={width}
        height={height}
      >
        {src ? (
          <div
            style={{
              position: "relative",
              transform: `scale(${scale})`,
              transformOrigin: `${focus[0]} ${focus[1]}`,
            }}
          >
            <Img
              src={staticFile(src)}
              style={{ width: "100%", display: "block" }}
            />
            {redact.map((area) => (
              <div
                key={`${area.x}-${area.y}`}
                style={{
                  position: "absolute",
                  left: `${area.x}%`,
                  top: `${area.y}%`,
                  width: `${area.w}%`,
                  height: `${area.h}%`,
                  borderRadius: 6,
                  backgroundColor: "rgba(10,10,10,0.55)",
                  backdropFilter: "blur(9px)",
                  WebkitBackdropFilter: "blur(9px)",
                }}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              height: height ?? 520,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              background:
                "repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0 14px, transparent 14px 28px)",
            }}
          >
            <span
              style={{
                fontFamily: fonts.mono,
                fontSize: 22,
                color: palette.textDim,
              }}
            >
              missing shot: {meta ? meta.file : name}
            </span>
            <span
              style={{
                fontFamily: fonts.sans,
                fontSize: 26,
                color: palette.textMuted,
              }}
            >
              {label ?? "运行 bun run video:shots 生成"}
            </span>
          </div>
        )}
      </BrowserFrame>
    </div>
  );
};
