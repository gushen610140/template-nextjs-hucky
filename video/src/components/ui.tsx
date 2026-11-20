import type { ReactNode } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fonts, palette } from "../theme";

export const Panel = ({
  children,
  style,
  padding = 32,
  glow = false,
}: {
  children: ReactNode;
  style?: React.CSSProperties;
  padding?: number;
  glow?: boolean;
}) => (
  <div
    style={{
      padding,
      borderRadius: 26,
      backgroundColor: "rgba(21,25,24,0.86)",
      border: `1px solid ${palette.border}`,
      boxShadow: glow
        ? "0 40px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(94,233,181,0.12) inset"
        : "0 30px 90px rgba(0,0,0,0.45)",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Kicker = ({
  children,
  tint = palette.mint,
}: {
  children: ReactNode;
  tint?: string;
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      fontFamily: fonts.mono,
      fontSize: 20,
      letterSpacing: "0.28em",
      textTransform: "uppercase",
      color: tint,
    }}
  >
    <span
      style={{ width: 28, height: 1, backgroundColor: tint, opacity: 0.8 }}
    />
    {children}
  </div>
);

export const Heading = ({
  kicker,
  title,
  sub,
  align = "left",
  delay = 0,
}: {
  kicker?: string;
  title: ReactNode;
  sub?: ReactNode;
  align?: "left" | "center";
  delay?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = (offset: number) =>
    spring({
      frame: frame - delay - offset,
      fps,
      config: { damping: 200, mass: 0.6 },
    });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        alignItems: align === "center" ? "center" : "flex-start",
        textAlign: align,
      }}
    >
      {kicker ? (
        <div
          style={{
            opacity: enter(0),
            transform: `translateY(${(1 - enter(0)) * 18}px)`,
          }}
        >
          <Kicker>{kicker}</Kicker>
        </div>
      ) : null}
      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 74,
          fontWeight: 650,
          lineHeight: 1.16,
          letterSpacing: "-0.025em",
          color: palette.text,
          opacity: enter(5),
          transform: `translateY(${(1 - enter(5)) * 26}px)`,
        }}
      >
        {title}
      </div>
      {sub ? (
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 30,
            lineHeight: 1.5,
            color: palette.textMuted,
            maxWidth: 1180,
            opacity: enter(10),
            transform: `translateY(${(1 - enter(10)) * 20}px)`,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
};

export const Chip = ({
  children,
  active = false,
  delay = 0,
  muted = false,
}: {
  children: ReactNode;
  active?: boolean;
  delay?: number;
  muted?: boolean;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, mass: 0.5 },
  });

  return (
    <div
      style={{
        padding: "14px 24px",
        borderRadius: 14,
        fontFamily: fonts.sans,
        fontSize: 26,
        fontWeight: 500,
        color: active ? palette.bg : muted ? palette.textMuted : palette.text,
        backgroundColor: active ? palette.mint : "rgba(255,255,255,0.045)",
        border: `1px solid ${active ? palette.mint : palette.border}`,
        transform: `translateY(${(1 - enter) * 24}px) scale(${0.94 + enter * 0.06})`,
        opacity: enter,
        boxShadow: active ? `0 0 40px rgba(94,233,181,0.35)` : "none",
      }}
    >
      {children}
    </div>
  );
};

export const Fade = ({
  children,
  from = 0,
  to,
  style,
}: {
  children: ReactNode;
  from?: number;
  to?: number;
  style?: React.CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [from, to ?? from + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <div style={{ opacity, ...style }}>{children}</div>;
};

/** 居中容器，场景主体内容统一留出上下 chrome 的安全区。 */
export const Stage = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: React.CSSProperties;
}) => (
  <AbsoluteFill
    style={{
      padding: "150px 120px 140px",
      display: "flex",
      justifyContent: "center",
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);
