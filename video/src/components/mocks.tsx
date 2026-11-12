import { fonts, palette } from "../theme";

const appear = (frame: number, at: number, span = 16) =>
  Math.min(1, Math.max(0, (frame - at) / span));

/** 文件列表 mock：避开真实文件名，同时保留上传、预览、权限的真实结构。 */
export const FileListMock = ({
  frame,
  width = 900,
  height = 470,
}: {
  frame: number;
  width?: number;
  height?: number;
}) => {
  const rows = [
    {
      icon: "PDF",
      name: "产品需求文档.pdf",
      meta: "application/pdf",
      size: "248 KB",
    },
    {
      icon: "PPT",
      name: "架构设计评审.pptx",
      meta: "presentationml.presentation",
      size: "3.1 MB",
    },
    {
      icon: "XLS",
      name: "数据导入模板.xlsx",
      meta: "spreadsheetml.sheet",
      size: "86 KB",
    },
    {
      icon: "DOC",
      name: "接口约定.docx",
      meta: "wordprocessingml.document",
      size: "132 KB",
    },
    { icon: "MMD", name: "请求链路.mmd", meta: "text/plain", size: "4 KB" },
  ];

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        backgroundColor: "rgba(16,19,18,0.96)",
        overflow: "hidden",
        boxShadow: "0 40px 110px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          padding: "18px 24px",
          borderBottom: `1px solid ${palette.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 24,
              fontWeight: 600,
              color: palette.text,
            }}
          >
            我的文件
          </div>
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 15,
              color: palette.textDim,
            }}
          >
            上传、下载、重命名和删除自己的文件。
          </div>
        </div>
        <div
          style={{
            padding: "9px 16px",
            borderRadius: 10,
            backgroundColor: palette.mint,
            color: palette.bg,
            fontFamily: fonts.sans,
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          上传文件
        </div>
      </div>

      <div style={{ padding: "10px 24px" }}>
        <div
          style={{
            display: "flex",
            gap: 22,
            fontFamily: fonts.sans,
            fontSize: 13,
            color: palette.textDim,
            padding: "8px 0 10px",
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
          <span style={{ flex: 1 }}>名称</span>
          <span style={{ width: 90 }}>大小</span>
          <span style={{ width: 150 }}>上传时间</span>
        </div>

        {rows.map((row, index) => {
          const on = appear(frame, 20 + index * 14);
          const highlight = index === 0;
          return (
            <div
              key={row.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "11px 12px",
                margin: "2px -12px",
                borderRadius: 10,
                backgroundColor: highlight
                  ? "rgba(94,233,181,0.06)"
                  : "transparent",
                opacity: on,
                transform: `translateY(${(1 - on) * 10}px)`,
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  color: highlight ? palette.mint : palette.textMuted,
                  border: `1px solid ${highlight ? "rgba(94,233,181,0.35)" : palette.border}`,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  flexShrink: 0,
                }}
              >
                {row.icon}
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 17,
                    color: palette.text,
                  }}
                >
                  {row.name}
                </div>
                <div
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    color: palette.textDim,
                  }}
                >
                  {row.meta}
                </div>
              </div>
              <span
                style={{
                  width: 90,
                  fontFamily: fonts.sans,
                  fontSize: 15,
                  color: palette.textMuted,
                }}
              >
                {row.size}
              </span>
              <span
                style={{
                  width: 150,
                  fontFamily: fonts.sans,
                  fontSize: 15,
                  color: palette.textMuted,
                }}
              >
                2026年11月{12 - index}日
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** 流式对话 mock：文字逐字出现，复刻对话页的消息流与引用来源。 */
export const ChatMock = ({
  frame,
  width = 980,
  height = 470,
}: {
  frame: number;
  width?: number;
  height?: number;
}) => {
  const question = "这个项目的鉴权为什么要分两层？";
  const answer =
    "中间件只做 token 形态的乐观校验，避免每个请求都查库；真正的会话与权限校验放在服务端组件里，并用 React cache 在单次请求内去重。\n检索链路也是同样的思路：先向量化取回分块，再把引用与用量一起写回消息记录。";
  const answerVisible = Math.max(0, Math.floor((frame - 60) * 1.6));

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        backgroundColor: "rgba(16,19,18,0.96)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 40px 110px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          height: 52,
          padding: "0 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${palette.border}`,
        }}
      >
        <span
          style={{ fontFamily: fonts.sans, fontSize: 18, color: palette.text }}
        >
          鉴权设计
        </span>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 13,
            color: palette.textDim,
          }}
        >
          DeepSeek-V4.1-Flash · SSE
        </span>
      </div>

      <div
        style={{
          padding: "20px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          flex: 1,
        }}
      >
        <div
          style={{
            alignSelf: "flex-end",
            maxWidth: 560,
            opacity: appear(frame, 14),
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              backgroundColor: palette.mint,
              color: palette.bg,
              fontFamily: fonts.sans,
              fontSize: 18,
              lineHeight: 1.5,
            }}
          >
            {question}
          </div>
        </div>

        <div
          style={{
            alignSelf: "flex-start",
            maxWidth: 720,
            opacity: appear(frame, 46),
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 14,
              border: `1px solid ${palette.border}`,
              backgroundColor: "rgba(255,255,255,0.045)",
              fontFamily: fonts.sans,
              fontSize: 18,
              lineHeight: 1.65,
              color: palette.text,
            }}
          >
            {answer
              .slice(0, answerVisible)
              .split("\n")
              .map((line, index) => (
                <div
                  key={`${index}-${line.slice(0, 8)}`}
                  style={{ marginTop: index === 0 ? 0 : 8 }}
                >
                  {line}
                </div>
              ))}
            {answerVisible < answer.length ? (
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 18,
                  backgroundColor: palette.mint,
                }}
              />
            ) : null}
          </div>
          <div
            style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            {[
              "引用来源 (2)",
              "认证规范",
              "中间件设计",
              "tool · qdrant.search ✓ 2 chunks",
            ].map((chip) => (
              <span
                key={chip}
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(94,233,181,0.25)",
                  backgroundColor: "rgba(94,233,181,0.08)",
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  color: palette.mint,
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 22px 18px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "0 4px 10px",
            fontFamily: fonts.mono,
            fontSize: 12,
            color: palette.textDim,
          }}
        >
          <span>input 1,284 · output 316 tokens</span>
          <span style={{ color: palette.mint }}>COMPLETED</span>
        </div>
        <div
          style={{
            height: 52,
            borderRadius: 12,
            border: `1px solid ${palette.border}`,
            backgroundColor: "rgba(255,255,255,0.03)",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            fontFamily: fonts.sans,
            fontSize: 16,
            color: palette.textDim,
          }}
        >
          输入消息，Enter 发送
        </div>
      </div>
    </div>
  );
};

/** 知识库 mock，替代带真实姓名的 RAG 列表截图。 */
export const RagMock = ({
  frame,
  width = 900,
}: {
  frame: number;
  width?: number;
}) => {
  const libraries = [
    { name: "产品文档库", files: 12, status: "已向量化" },
    { name: "接口规范库", files: 8, status: "已向量化" },
    { name: "客户案例库", files: 5, status: "向量化中" },
  ];

  return (
    <div
      style={{
        width,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        backgroundColor: "rgba(16,19,18,0.96)",
        overflow: "hidden",
        boxShadow: "0 40px 110px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          padding: "18px 24px",
          borderBottom: `1px solid ${palette.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 24,
              fontWeight: 600,
              color: palette.text,
            }}
          >
            RAG 知识库
          </div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 13,
              color: palette.textDim,
            }}
          >
            Qdrant · 1024d · cosine
          </div>
        </div>
        <div
          style={{ fontFamily: fonts.mono, fontSize: 13, color: palette.mint }}
        >
          3 个知识库
        </div>
      </div>

      <div style={{ padding: "12px 24px 18px" }}>
        {libraries.map((library, index) => (
          <div
            key={library.name}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 0",
              borderBottom:
                index < libraries.length - 1
                  ? `1px solid ${palette.border}`
                  : "none",
              opacity: appear(frame, 20 + index * 18),
              transform: `translateX(${(1 - appear(frame, 20 + index * 18)) * 14}px)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor:
                    library.status === "已向量化" ? palette.mint : "#fbbf24",
                }}
              />
              <div>
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 19,
                    color: palette.text,
                  }}
                >
                  {library.name}
                </div>
                <div
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    color: palette.textDim,
                  }}
                >
                  Qwen-3.7-Embedding · {library.files} 个文件
                </div>
              </div>
            </div>
            <span
              style={{
                padding: "5px 11px",
                borderRadius: 999,
                fontFamily: fonts.sans,
                fontSize: 13,
                color: library.status === "已向量化" ? palette.mint : "#fbbf24",
                border: `1px solid ${
                  library.status === "已向量化"
                    ? "rgba(94,233,181,0.25)"
                    : "rgba(251,191,36,0.25)"
                }`,
                backgroundColor:
                  library.status === "已向量化"
                    ? "rgba(94,233,181,0.08)"
                    : "rgba(251,191,36,0.08)",
              }}
            >
              {library.status}
            </span>
          </div>
        ))}

        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: `1px solid ${palette.border}`,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: fonts.mono,
            fontSize: 13,
            color: palette.textDim,
          }}
        >
          <span>collection: template-nextjs-hucky-prod</span>
          <span>cosine · 1024d · 双写快照</span>
        </div>
      </div>
    </div>
  );
};
