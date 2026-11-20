import { useCurrentFrame } from "remotion";
import { fonts, palette } from "../theme";

export type TermLine = {
  at: number;
  kind?: "cmd" | "out" | "ok" | "warn";
  text: string;
};

const CHAR_PER_FRAME = 1.6;

/**
 * 终端打字机。每行按 at 帧开始逐字出现，光标跟随最后一行。
 * 不依赖 monospace 之外的字形，渲染结果稳定。
 */
export const Terminal = ({
  lines,
  width = 900,
  title = "zsh — bun",
  fontSize = 22,
}: {
  lines: TermLine[];
  width?: number;
  title?: string;
  fontSize?: number;
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        width,
        borderRadius: 18,
        overflow: "hidden",
        border: `1px solid ${palette.border}`,
        backgroundColor: "#0d100f",
        boxShadow: "0 40px 100px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          height: 42,
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "0 16px",
          backgroundColor: "#151918",
          borderBottom: `1px solid ${palette.border}`,
        }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((color) => (
          <span
            key={color}
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              backgroundColor: color,
            }}
          />
        ))}
        <span
          style={{
            marginLeft: 12,
            fontFamily: fonts.mono,
            fontSize: 15,
            color: palette.textDim,
          }}
        >
          {title}
        </span>
      </div>
      <div
        style={{
          padding: "22px 26px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {lines.map((line, index) => {
          const visible = frame >= line.at;
          if (!visible) return null;
          const chars = Math.max(
            0,
            Math.floor((frame - line.at) * CHAR_PER_FRAME),
          );
          const text = line.text.slice(0, chars);
          const done = text.length === line.text.length;
          const isLastVisible =
            lines.findLastIndex((item) => frame >= item.at) === index;
          const color =
            line.kind === "ok"
              ? palette.mint
              : line.kind === "warn"
                ? "#fbbf24"
                : line.kind === "cmd"
                  ? palette.text
                  : palette.textMuted;

          return (
            <div
              key={`${line.at}-${line.text}`}
              style={{
                display: "flex",
                gap: 12,
                fontFamily: fonts.mono,
                fontSize,
                lineHeight: 1.45,
                color,
                whiteSpace: "pre",
              }}
            >
              {line.kind === "cmd" ? (
                <span style={{ color: palette.emerald }}>$</span>
              ) : null}
              <span>
                {text}
                {isLastVisible && !done ? (
                  <span
                    style={{ backgroundColor: palette.mint, color: palette.bg }}
                  >
                    &nbsp;
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
