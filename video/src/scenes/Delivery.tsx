import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Heading, Stage } from "../components/ui";
import { fonts, palette } from "../theme";

const pipeline = [
  "install",
  "prisma",
  "next build",
  "COS upload",
  "CDN refresh",
];

export const Delivery = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const before = spring({
    frame: frame - 90,
    fps,
    config: { damping: 200, mass: 1.2 },
  });
  const after = spring({
    frame: frame - 150,
    fps,
    config: { damping: 200, mass: 1.2 },
  });
  const seconds = interpolate(frame, [150, 240], [18, 9.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Stage
      style={{ flexDirection: "column", gap: 30, justifyContent: "center" }}
    >
      <Heading
        kicker="delivery"
        title="发布链路：18 分钟 → 10 秒"
        sub="产物交给对象存储 + CDN 全球加速，构建与分发彻底解耦。"
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 22,
          padding: "34px 40px",
          borderRadius: 26,
          border: `1px solid ${palette.border}`,
          backgroundColor: "rgba(21,25,24,0.82)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 210,
              fontFamily: fonts.mono,
              fontSize: 16,
              letterSpacing: "0.14em",
              color: palette.textDim,
            }}
          >
            BEFORE
          </div>
          <div
            style={{
              position: "relative",
              flex: 1,
              height: 54,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.05)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${before * 100}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.10), rgba(255,255,255,0.22))",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                paddingLeft: 20,
                fontFamily: fonts.mono,
                fontSize: 22,
                color: palette.textMuted,
              }}
            >
              GitHub Actions → 构建 → 打包 → 上传
            </div>
          </div>
          <div
            style={{
              width: 190,
              textAlign: "right",
              fontFamily: fonts.sans,
              fontSize: 38,
              fontWeight: 700,
              color: palette.textMuted,
            }}
          >
            18:00
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 210,
              fontFamily: fonts.mono,
              fontSize: 16,
              letterSpacing: "0.14em",
              color: palette.mint,
            }}
          >
            AFTER
          </div>
          <div
            style={{
              position: "relative",
              flex: 1,
              height: 54,
              borderRadius: 12,
              backgroundColor: "rgba(94,233,181,0.07)",
            }}
          >
            <div
              style={{
                width: `${Math.max(2.2, after * 3)}%`,
                height: "100%",
                borderRadius: 12,
                backgroundColor: palette.mint,
                boxShadow: `0 0 40px rgba(94,233,181,0.55)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${Math.max(2.2, after * 3) + 2}%`,
                display: "flex",
                alignItems: "center",
                fontFamily: fonts.mono,
                fontSize: 21,
                color: palette.mint,
                whiteSpace: "nowrap",
              }}
            >
              构建产物直接进 COS，CDN 全网刷新
            </div>
          </div>
          <div
            style={{
              width: 190,
              textAlign: "right",
              fontFamily: fonts.sans,
              fontSize: 54,
              fontWeight: 700,
              color: palette.mint,
              textShadow: `0 0 40px rgba(94,233,181,0.45)`,
            }}
          >
            {seconds.toFixed(1)}s
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {pipeline.map((step, index) => (
          <div
            key={step}
            style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}
          >
            <div
              style={{
                flex: 1,
                padding: "16px 20px",
                borderRadius: 14,
                border: `1px solid ${palette.border}`,
                backgroundColor: "rgba(255,255,255,0.035)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: fonts.mono,
                fontSize: 19,
                color: palette.textMuted,
                opacity: Math.min(
                  1,
                  Math.max(0, (frame - 250 - index * 16) / 18),
                ),
              }}
            >
              {step}
              <span style={{ color: palette.mint }}>✓</span>
            </div>
            {index < pipeline.length - 1 ? (
              <span style={{ color: palette.textDim, fontSize: 22 }}>→</span>
            ) : null}
          </div>
        ))}
      </div>
    </Stage>
  );
};
