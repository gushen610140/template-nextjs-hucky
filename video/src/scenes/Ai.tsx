import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CodeCard } from "../components/CodeCard";
import { ChatMock, RagMock } from "../components/mocks";
import { Shot, sidebarRedact } from "../components/Shot";
import { Heading, Panel, Stage } from "../components/ui";
import { fonts, palette } from "../theme";

const appear = (frame: number, at: number, span = 18) =>
  Math.min(1, Math.max(0, (frame - at) / span));

const beatOpacity = (frame: number, from: number, to: number) =>
  Math.min(
    interpolate(frame, [from, from + 30], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(frame, [to, to + 24], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

const sseEvents = [
  { name: "start", detail: "返回用户消息与 assistant 占位" },
  { name: "delta", detail: "增量 token 持续写入 SSE" },
  { name: "usage", detail: "输入 / 输出用量落库" },
  { name: "done", detail: "状态切 COMPLETED 并收尾" },
];

const ragSteps = [
  { label: "query", title: "用户提问", desc: "按会话选择智能体" },
  { label: "embed", title: "向量化", desc: "embedding 模型 1024 维" },
  { label: "qdrant", title: "相似检索", desc: "Cosine · 单集合" },
  { label: "citation", title: "带引用回答", desc: "文件 + 分块 + 相似度" },
];

export const Ai = () => {
  const frame = useCurrentFrame();
  const beatA = beatOpacity(frame, 0, 430);
  const beatB = beatOpacity(frame, 430, 900);
  const beatC = beatOpacity(frame, 890, 1380);

  return (
    <Stage style={{ flexDirection: "column", gap: 22 }}>
      <Heading
        kicker="ai"
        title="AI 不是外挂，是内置能力"
        sub="供应商、模型、会话、知识库、智能体都在同一套权限与数据模型里。"
      />

      <div style={{ position: "relative", flex: 1 }}>
        <AbsoluteFill style={{ opacity: beatA }}>
          <div
            style={{
              display: "flex",
              gap: 34,
              alignItems: "flex-start",
              paddingTop: 10,
            }}
          >
            <Shot
              name="models"
              width={800}
              height={430}
              url="hucky.dev/dashboard/models"
              zoom={[1, 1.05]}
              focus={["20%", "10%"]}
              redact={sidebarRedact}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <CodeCard
                width={760}
                title="GET /api/ai/catalog"
                lines={[
                  { text: '{ "providers": [', tone: "plain" },
                  { text: '    "openai", "anthropic", "google",', tone: "str" },
                  { text: '    "openai-compatible" ],', tone: "str" },
                  { text: '  "models": ["chat", "embedding"],', tone: "key" },
                  { text: '  "apiKey": "••••••••" }', tone: "com" },
                ]}
                delay={12}
                fontSize={20}
              />
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {["多供应商", "模型能力开关", "SSE 流式", "token 用量"].map(
                  (text, index) => (
                    <div
                      key={text}
                      style={{
                        padding: "10px 16px",
                        borderRadius: 10,
                        fontFamily: fonts.sans,
                        fontSize: 19,
                        color: palette.textMuted,
                        backgroundColor: "rgba(255,255,255,0.04)",
                        border: `1px solid ${palette.border}`,
                        opacity: appear(frame, 60 + index * 10),
                      }}
                    >
                      {text}
                    </div>
                  ),
                )}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { label: "对话模型", value: "CHAT" },
                  { label: "向量模型", value: "EMBEDDING" },
                  { label: "输入模态", value: "文本 / 图片" },
                  { label: "向量维度", value: "1024" },
                ].map((item, index) => (
                  <div
                    key={item.label}
                    style={{
                      flex: 1,
                      padding: "14px 16px",
                      borderRadius: 14,
                      border: `1px solid ${palette.border}`,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      opacity: appear(frame, 120 + index * 12),
                      transform: `translateY(${(1 - appear(frame, 120 + index * 12)) * 12}px)`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: fonts.sans,
                        fontSize: 15,
                        color: palette.textDim,
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontFamily: fonts.mono,
                        fontSize: 16,
                        color: palette.mint,
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AbsoluteFill>

        <AbsoluteFill style={{ opacity: beatB }}>
          <div
            style={{
              display: "flex",
              gap: 34,
              alignItems: "flex-start",
              paddingTop: 10,
            }}
          >
            <ChatMock frame={frame} width={980} height={470} />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                width: 640,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 16,
                  letterSpacing: "0.16em",
                  color: palette.mint,
                }}
              >
                POST /messages → text/event-stream
              </div>
              {sseEvents.map((event, index) => {
                const active = frame > 500 + index * 70;
                return (
                  <Panel
                    key={event.name}
                    padding={18}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      borderColor: active
                        ? "rgba(94,233,181,0.30)"
                        : palette.border,
                      backgroundColor: active
                        ? "rgba(94,233,181,0.07)"
                        : "rgba(21,25,24,0.86)",
                      opacity: appear(frame, 500 + index * 70),
                      transform: `translateX(${(1 - appear(frame, 500 + index * 70)) * 20}px)`,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: active
                          ? palette.mint
                          : palette.textDim,
                        boxShadow: active ? `0 0 12px ${palette.mint}` : "none",
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontFamily: fonts.mono,
                          fontSize: 20,
                          color: active ? palette.mint : palette.textMuted,
                        }}
                      >
                        {event.name}
                      </div>
                      <div
                        style={{
                          marginTop: 3,
                          fontFamily: fonts.sans,
                          fontSize: 18,
                          color: palette.textMuted,
                        }}
                      >
                        {event.detail}
                      </div>
                    </div>
                  </Panel>
                );
              })}
            </div>
          </div>
        </AbsoluteFill>

        <AbsoluteFill style={{ opacity: beatC }}>
          <div
            style={{
              display: "flex",
              gap: 34,
              alignItems: "flex-start",
              paddingTop: 6,
            }}
          >
            <div
              style={{
                width: 520,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {ragSteps.map((step, index) => (
                <div
                  key={step.label}
                  style={{ opacity: appear(frame, 920 + index * 24) }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "16px 18px",
                      borderRadius: 16,
                      border: `1px solid ${palette.border}`,
                      backgroundColor: "rgba(21,25,24,0.86)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: 12,
                        color: palette.textDim,
                        width: 70,
                      }}
                    >
                      {step.label}
                    </span>
                    <div>
                      <div
                        style={{
                          fontFamily: fonts.sans,
                          fontSize: 24,
                          fontWeight: 600,
                          color: palette.text,
                        }}
                      >
                        {step.title}
                      </div>
                      <div
                        style={{
                          fontFamily: fonts.sans,
                          fontSize: 18,
                          color: palette.textMuted,
                        }}
                      >
                        {step.desc}
                      </div>
                    </div>
                  </div>
                  {index < ragSteps.length - 1 ? (
                    <div
                      style={{
                        width: 2,
                        height: 10,
                        marginLeft: 40,
                        backgroundColor: "rgba(255,255,255,0.12)",
                      }}
                    />
                  ) : null}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <RagMock frame={frame} width={980} />
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  opacity: appear(frame, 980),
                }}
              >
                {["引用文件", "分块定位", "相似度", "智能体绑定知识库"].map(
                  (text) => (
                    <div
                      key={text}
                      style={{
                        padding: "9px 15px",
                        borderRadius: 10,
                        fontFamily: fonts.mono,
                        fontSize: 17,
                        color: palette.mint,
                        backgroundColor: "rgba(94,233,181,0.10)",
                        border: "1px solid rgba(94,233,181,0.22)",
                      }}
                    >
                      {text}
                    </div>
                  ),
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 14,
                  opacity: appear(frame, 1040),
                  transform: `translateY(${(1 - appear(frame, 1040)) * 14}px)`,
                }}
              >
                {[
                  {
                    file: "产品需求文档.pdf",
                    chunk: "chunk #12",
                    score: "0.87",
                  },
                  { file: "认证规范.docx", chunk: "chunk #04", score: "0.82" },
                ].map((citation) => (
                  <div
                    key={citation.file}
                    style={{
                      flex: 1,
                      padding: "14px 18px",
                      borderRadius: 14,
                      border: `1px solid ${palette.border}`,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: fonts.sans,
                          fontSize: 18,
                          color: palette.text,
                        }}
                      >
                        {citation.file}
                      </div>
                      <div
                        style={{
                          fontFamily: fonts.mono,
                          fontSize: 13,
                          color: palette.textDim,
                        }}
                      >
                        {citation.chunk} · 已用于本回答
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: 18,
                        color: palette.mint,
                      }}
                    >
                      {citation.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </div>
    </Stage>
  );
};
