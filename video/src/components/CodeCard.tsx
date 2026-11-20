import { interpolate, useCurrentFrame } from "remotion";
import { fonts, palette } from "../theme";

type Tone = "plain" | "key" | "str" | "com" | "num" | "tag";

type Line = { text: string; tone?: Tone; highlight?: boolean };

const toneColor: Record<Tone, string> = {
  plain: palette.textMuted,
  key: palette.mint,
  str: "#a5d6ff",
  com: palette.textDim,
  num: "#f0b37e",
  tag: "#c7b6ff",
};

/**
 * 代码卡片：按行淡入 + 可选高亮行，用等宽字体渲染。
 * 不做语法解析，靠调用方标注 tone，避免引入高亮库拖慢打包。
 */
export const CodeCard = ({
  lines,
  width = 760,
  title,
  delay = 0,
  fontSize = 21,
  padding = 26,
}: {
  lines: Line[];
  width?: number;
  title?: string;
  delay?: number;
  fontSize?: number;
  padding?: number;
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        width,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        backgroundColor: "rgba(13,16,15,0.94)",
        boxShadow: "0 40px 110px rgba(0,0,0,0.55)",
        overflow: "hidden",
      }}
    >
      {title ? (
        <div
          style={{
            height: 40,
            display: "flex",
            alignItems: "center",
            padding: "0 18px",
            borderBottom: `1px solid ${palette.border}`,
            fontFamily: fonts.mono,
            fontSize: 14,
            letterSpacing: "0.06em",
            color: palette.textDim,
          }}
        >
          {title}
        </div>
      ) : null}
      <div style={{ padding: `${padding}px 0` }}>
        {lines.map((line, index) => {
          const start = delay + index * 2.2;
          const opacity = interpolate(frame, [start, start + 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={`${index}-${line.text}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: `2px ${padding}px 2px 0`,
                opacity,
                backgroundColor: line.highlight
                  ? "rgba(94,233,181,0.10)"
                  : "transparent",
                borderLeft: `3px solid ${line.highlight ? palette.mint : "transparent"}`,
              }}
            >
              <span
                style={{
                  width: padding - 3,
                  textAlign: "right",
                  fontFamily: fonts.mono,
                  fontSize: fontSize - 4,
                  color: palette.textDim,
                  opacity: 0.6,
                }}
              >
                {line.highlight ? "→" : index + 1}
              </span>
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize,
                  lineHeight: 1.55,
                  whiteSpace: "pre",
                  color: toneColor[line.tone ?? "plain"],
                }}
              >
                {line.text || " "}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
