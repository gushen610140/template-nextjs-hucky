import { useCurrentFrame } from "remotion";
import { FileListMock } from "../components/mocks";
import { Heading, Panel, Stage } from "../components/ui";
import { fonts, palette } from "../theme";

const steps = [
  { label: "client", title: "选择文件", desc: "请求一次性上传凭证" },
  {
    label: "server",
    title: "签发预签名 URL",
    desc: "限定 key、大小与过期时间",
  },
  { label: "rustfs", title: "直传对象存储", desc: "S3 兼容，应用不中转字节" },
];

const formats = ["PDF", "DOCX", "XLSX", "PPTX", "MD", "CSV", "Mermaid", "Code"];

export const Files = () => {
  const frame = useCurrentFrame();
  const appear = (at: number) => Math.min(1, Math.max(0, (frame - at) / 18));

  return (
    <Stage style={{ flexDirection: "column", gap: 34 }}>
      <Heading
        kicker="files"
        title="文件直传，预览不掉链子"
        sub="上传走预签名地址，下载走权限校验；格式交给前端渲染，Office 文档可选在线编辑。"
      />

      <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
        <div
          style={{
            width: 560,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {steps.map((step, index) => (
            <div
              key={step.label}
              style={{
                opacity: appear(60 + index * 22),
                transform: `translateY(${(1 - appear(60 + index * 22)) * 24}px)`,
              }}
            >
              <Panel
                padding={22}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  borderColor:
                    index === 2 ? "rgba(94,233,181,0.28)" : palette.border,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: fonts.mono,
                    fontSize: 18,
                    color: palette.mint,
                    backgroundColor: "rgba(94,233,181,0.10)",
                    border: "1px solid rgba(94,233,181,0.24)",
                    flexShrink: 0,
                  }}
                >
                  0{index + 1}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: 13,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: palette.textDim,
                    }}
                  >
                    {step.label}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontFamily: fonts.sans,
                      fontSize: 27,
                      fontWeight: 600,
                      color: palette.text,
                    }}
                  >
                    {step.title}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontFamily: fonts.sans,
                      fontSize: 19,
                      color: palette.textMuted,
                    }}
                  >
                    {step.desc}
                  </div>
                </div>
              </Panel>
              {index < steps.length - 1 ? (
                <div
                  style={{
                    margin: "6px 0 6px 42px",
                    width: 2,
                    height: 16,
                    backgroundColor: "rgba(255,255,255,0.12)",
                  }}
                />
              ) : null}
            </div>
          ))}

          <div
            style={{
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 18px",
              borderRadius: 14,
              backgroundColor: "rgba(94,233,181,0.07)",
              border: "1px solid rgba(94,233,181,0.22)",
              fontFamily: fonts.sans,
              fontSize: 20,
              color: palette.mint,
              opacity: appear(200),
            }}
          >
            虚拟文件夹 + 软删除，权限边界跟随上传者
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <FileListMock frame={frame} width={980} height={470} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {formats.map((format, index) => (
              <div
                key={format}
                style={{
                  padding: "9px 16px",
                  borderRadius: 10,
                  fontFamily: fonts.mono,
                  fontSize: 19,
                  color: index < 4 ? palette.text : palette.textMuted,
                  backgroundColor:
                    index < 4
                      ? "rgba(94,233,181,0.10)"
                      : "rgba(255,255,255,0.04)",
                  border: `1px solid ${index < 4 ? "rgba(94,233,181,0.22)" : palette.border}`,
                  opacity: appear(300 + index * 8),
                  transform: `translateY(${(1 - appear(300 + index * 8)) * 14}px)`,
                }}
              >
                {format}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Stage>
  );
};
