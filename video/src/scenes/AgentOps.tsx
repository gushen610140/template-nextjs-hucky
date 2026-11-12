import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CodeCard } from "../components/CodeCard";
import { Shot } from "../components/Shot";
import { Terminal } from "../components/Terminal";
import { Heading, Panel, Stage } from "../components/ui";
import { hasShot } from "../data/shots";
import { fonts, palette } from "../theme";

const appear = (frame: number, at: number, span = 18) =>
  Math.min(1, Math.max(0, (frame - at) / span));

const beatOpacity = (frame: number, from: number, to: number) =>
  Math.min(
    interpolate(frame, [from, from + 28], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(frame, [to, to + 24], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

const loop = [
  { title: "会话空闲", desc: "stop 事件后进入待续跑" },
  { title: "自动续跑", desc: "按会话开关，注入下一步提示" },
  { title: "执行校验", desc: "lint / typecheck / 测试闭环" },
  { title: "完成或中断", desc: "随时可停，全程留痕" },
];

const feishuSteps = [
  { title: "检测分支提交", desc: "git 钩子感知推送" },
  { title: "生成改动总结", desc: "提交范围 + diff 摘要" },
  { title: "无头浏览器截图", desc: "回推群聊，客户直接看" },
  { title: "需求写回主机", desc: "文本落到 requirements/" },
];

const skills = [
  "browser-screenshot",
  "reverse-engineer-anything",
  "shadcn",
  "prisma",
  "report",
  "caveman-commit",
];

export const AgentOps = () => {
  const frame = useCurrentFrame();
  const beatA = beatOpacity(frame, 0, 320);
  const beatB = beatOpacity(frame, 310, 700);
  const beatC = beatOpacity(frame, 690, 1050);
  const lock = appear(frame, 70, 20);

  return (
    <Stage style={{ flexDirection: "column", gap: 22 }}>
      <Heading
        kicker="agent ops"
        title="把 AI 编码变成工程约束"
        sub="行为可复现、长任务可续跑、客户反馈可回流，三件事都落在仓库里。"
      />

      <div style={{ position: "relative", flex: 1 }}>
        <AbsoluteFill style={{ opacity: beatA }}>
          <div
            style={{
              display: "flex",
              gap: 34,
              alignItems: "flex-start",
              paddingTop: 14,
            }}
          >
            <CodeCard
              width={800}
              title="skills-lock.json"
              lines={[
                { text: "{", tone: "plain" },
                { text: '  "skills": {', tone: "key" },
                { text: '    "browser-screenshot": {', tone: "str" },
                { text: '      "source": "github.com/…",', tone: "plain" },
                { text: '      "hash": "sha256:9f2c…41ab"', tone: "num" },
                { text: "    }", tone: "plain" },
                {
                  text: '    "shadcn": { "hash": "sha256:7d10…c8e2" }',
                  tone: "plain",
                },
                { text: "  }", tone: "key" },
                { text: "}", tone: "plain" },
              ]}
              delay={10}
              fontSize={20}
            />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  opacity: lock,
                }}
              >
                <svg
                  width="34"
                  height="34"
                  viewBox="0 0 24 24"
                  fill="none"
                  role="img"
                  aria-label="锁定"
                >
                  <rect
                    x="4.5"
                    y="10"
                    width="15"
                    height="11"
                    rx="3"
                    stroke={palette.mint}
                    strokeWidth="1.6"
                  />
                  <path
                    d="M8 10V7.5a4 4 0 0 1 8 0V10"
                    stroke={palette.mint}
                    strokeWidth="1.6"
                  />
                  <circle cx="12" cy="15.5" r="1.7" fill={palette.mint} />
                </svg>
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 26,
                    color: palette.text,
                  }}
                >
                  来源与哈希锁定，团队拉到的行为一致
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {skills.map((skill, index) => (
                  <div
                    key={skill}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 10,
                      fontFamily: fonts.mono,
                      fontSize: 17,
                      color: palette.textMuted,
                      backgroundColor: "rgba(255,255,255,0.04)",
                      border: `1px solid ${palette.border}`,
                      opacity: appear(frame, 110 + index * 9),
                      transform: `translateY(${(1 - appear(frame, 110 + index * 9)) * 14}px)`,
                    }}
                  >
                    {skill}
                  </div>
                ))}
              </div>
              <Panel
                padding={20}
                style={{
                  backgroundColor: "rgba(94,233,181,0.06)",
                  borderColor: "rgba(94,233,181,0.24)",
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 20,
                    color: palette.textMuted,
                    lineHeight: 1.5,
                  }}
                >
                  新增 skill 只改锁文件，不靠本机缓存；
                  <span style={{ color: palette.mint }}>
                    {" "}
                    提示词漂移从流程里消失
                  </span>
                  。
                </div>
              </Panel>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
            {[
              { value: "6", label: "个 Skill 锁定来源与哈希" },
              { value: "sha256", label: "拉取时校验一致性" },
              { value: "0", label: "次提示词漂移" },
            ].map((stat, index) => (
              <div
                key={stat.label}
                style={{
                  flex: 1,
                  padding: "20px 24px",
                  borderRadius: 18,
                  border: `1px solid ${palette.border}`,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  opacity: appear(frame, 190 + index * 16),
                  transform: `translateY(${(1 - appear(frame, 190 + index * 16)) * 16}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 34,
                    color: palette.mint,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: fonts.sans,
                    fontSize: 18,
                    color: palette.textMuted,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </AbsoluteFill>

        <AbsoluteFill style={{ opacity: beatB }}>
          <div style={{ display: "flex", gap: 20, paddingTop: 40 }}>
            {loop.map((item, index) => (
              <div
                key={item.title}
                style={{ flex: 1, display: "flex", alignItems: "center" }}
              >
                <Panel
                  padding={24}
                  style={{
                    flex: 1,
                    minHeight: 176,
                    opacity: appear(frame, 340 + index * 22),
                    transform: `translateY(${(1 - appear(frame, 340 + index * 22)) * 24}px)`,
                    borderColor:
                      index === 1 ? "rgba(94,233,181,0.30)" : palette.border,
                  }}
                >
                  <div
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: 13,
                      letterSpacing: "0.2em",
                      color: palette.textDim,
                    }}
                  >
                    step 0{index + 1}
                  </div>
                  <div
                    style={{
                      marginTop: 14,
                      fontFamily: fonts.sans,
                      fontSize: 30,
                      fontWeight: 600,
                      color: palette.text,
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      fontFamily: fonts.sans,
                      fontSize: 19,
                      lineHeight: 1.45,
                      color: palette.textMuted,
                    }}
                  >
                    {item.desc}
                  </div>
                </Panel>
                {index < loop.length - 1 ? (
                  <div
                    style={{
                      width: 34,
                      display: "flex",
                      justifyContent: "center",
                      color: palette.textDim,
                      fontSize: 24,
                    }}
                  >
                    →
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22, display: "flex", gap: 14 }}>
            {["按会话开关", "随时可中断", "执行记录可审计", "失败自动回退"].map(
              (text, index) => (
                <div
                  key={text}
                  style={{
                    padding: "12px 20px",
                    borderRadius: 12,
                    border: `1px solid ${palette.border}`,
                    backgroundColor: "rgba(255,255,255,0.04)",
                    fontFamily: fonts.sans,
                    fontSize: 21,
                    color: palette.textMuted,
                    opacity: appear(frame, 470 + index * 12),
                  }}
                >
                  {text}
                </div>
              ),
            )}
          </div>

          <div style={{ marginTop: 14, opacity: appear(frame, 500) }}>
            <Terminal
              width={1180}
              title="opencode · auto-continue"
              fontSize={18}
              lines={[
                {
                  at: 500,
                  kind: "cmd",
                  text: 'opencode run "修复列表页导出按钮"',
                },
                { at: 540, kind: "out", text: "session idle → stop 事件" },
                {
                  at: 570,
                  kind: "ok",
                  text: "auto-continue: on · 注入下一步提示",
                },
                { at: 600, kind: "out", text: "lint ✓  typecheck ✓  test ✓" },
                { at: 632, kind: "ok", text: "continue: 提交并生成变更说明" },
              ]}
            />
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
                width: 620,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {feishuSteps.map((step, index) => (
                <div
                  key={step.title}
                  style={{ opacity: appear(frame, 720 + index * 26) }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "16px 18px",
                      borderRadius: 16,
                      border: `1px solid ${palette.border}`,
                      backgroundColor: "rgba(21,25,24,0.86)",
                    }}
                  >
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: fonts.mono,
                        fontSize: 16,
                        color: palette.mint,
                        backgroundColor: "rgba(94,233,181,0.10)",
                        border: "1px solid rgba(94,233,181,0.22)",
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
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
                  {index < feishuSteps.length - 1 ? (
                    <div
                      style={{
                        width: 2,
                        height: 8,
                        marginLeft: 34,
                        backgroundColor: "rgba(255,255,255,0.12)",
                      }}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            {hasShot("feishu-chat") ? (
              <Shot
                name="feishu-chat"
                width={900}
                url="飞书 · 产品交付群"
                zoom={[1, 1.04]}
                delay={20}
              />
            ) : (
              <MockChat frame={frame} />
            )}
          </div>
        </AbsoluteFill>
      </div>
    </Stage>
  );
};

/** 飞书群聊 mock：没有真实截图时用它兜底，视觉上仍是产品级界面。 */
const MockChat = ({ frame }: { frame: number }) => (
  <div
    style={{
      width: 900,
      borderRadius: 20,
      border: `1px solid ${palette.border}`,
      backgroundColor: "rgba(16,19,18,0.96)",
      overflow: "hidden",
      boxShadow: "0 40px 110px rgba(0,0,0,0.5)",
    }}
  >
    <div
      style={{
        height: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        borderBottom: `1px solid ${palette.border}`,
        fontFamily: fonts.sans,
        fontSize: 19,
        color: palette.text,
      }}
    >
      <span>产品交付群</span>
      <span
        style={{ fontFamily: fonts.mono, fontSize: 14, color: palette.textDim }}
      >
        bot · opencode
      </span>
    </div>
    <div
      style={{
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        minHeight: 360,
      }}
    >
      {[
        {
          who: "客户",
          text: "列表页导出按钮点了没反应，能看下吗？",
          at: 780,
          accent: false,
        },
        {
          who: "bot",
          text: "已定位：feat/export 分支修复中，2 分钟后给你看效果。",
          at: 850,
          accent: true,
        },
      ].map((message) => (
        <div
          key={message.who}
          style={{
            alignSelf: message.accent ? "flex-end" : "flex-start",
            maxWidth: 620,
            opacity: appear(frame, message.at),
            transform: `translateY(${(1 - appear(frame, message.at)) * 12}px)`,
          }}
        >
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 13,
              color: palette.textDim,
              marginBottom: 6,
            }}
          >
            {message.who}
          </div>
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 14,
              fontFamily: fonts.sans,
              fontSize: 21,
              lineHeight: 1.5,
              color: message.accent ? palette.bg : palette.text,
              backgroundColor: message.accent
                ? palette.mint
                : "rgba(255,255,255,0.06)",
              border: `1px solid ${message.accent ? palette.mint : palette.border}`,
            }}
          >
            {message.text}
          </div>
        </div>
      ))}

      <div
        style={{
          alignSelf: "flex-end",
          width: 460,
          marginTop: 4,
          borderRadius: 14,
          border: `1px solid ${palette.border}`,
          overflow: "hidden",
          opacity: appear(frame, 900),
        }}
      >
        <div
          style={{
            height: 26,
            backgroundColor: "#1b201e",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 10px",
          }}
        >
          {["#ff5f57", "#febc2e", "#28c840"].map((color) => (
            <span
              key={color}
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                backgroundColor: color,
              }}
            />
          ))}
        </div>
        <div
          style={{
            height: 210,
            background:
              "linear-gradient(160deg, rgba(94,233,181,0.22), rgba(0,153,102,0.10) 45%, rgba(255,255,255,0.04))",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 18,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.14)",
              backgroundColor: "rgba(10,10,10,0.6)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: 16,
            }}
          >
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: 12,
                color: palette.mint,
              }}
            >
              preview · screenshot
            </div>
            {[0.9, 0.6, 0.75].map((width, index) => (
              <div
                key={width}
                style={{
                  height: 8,
                  width: `${width * 100}%`,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  marginTop: index === 0 ? 8 : 4,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
