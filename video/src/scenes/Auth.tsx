import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CodeCard } from "../components/CodeCard";
import { Shot, sidebarRedact } from "../components/Shot";
import { Heading, Panel, Stage } from "../components/ui";
import { fonts, palette } from "../theme";

const nodes = [
  {
    tag: "01 · client",
    title: "浏览器",
    desc: "携带 Logto 会话 cookie",
    note: "任意受保护路由",
  },
  {
    tag: "02 · middleware",
    title: "乐观校验",
    desc: "只检查 token 形态与存在性",
    note: "0 次数据库往返",
    accent: true,
  },
  {
    tag: "03 · server component",
    title: "权威校验",
    desc: "服务端读取会话 + React cache",
    note: "同一请求只查一次",
    accent: true,
  },
  {
    tag: "04 · prisma",
    title: "权限数据",
    desc: "role → permission 关系",
    note: "action guard 复用",
  },
];

const guards = [
  "middleware 只验 token 形态，不做 DB 查询",
  "RSC 读会话 + cache，单请求内去重",
  "所有受保护接口挂 withPermission",
];

const appear = (frame: number, at: number, span = 18) =>
  Math.min(1, Math.max(0, (frame - at) / span));

export const Auth = () => {
  const frame = useCurrentFrame();
  const flowOut = interpolate(frame, [400, 460], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shotsIn = interpolate(frame, [440, 500], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const travel = ((frame - 180) % 80) / 80;

  return (
    <Stage style={{ flexDirection: "column", gap: 26 }}>
      <Heading
        kicker="authentication"
        title="登录、会话、权限，三层收紧"
        sub="把每个请求都要付的鉴权成本挪到该付的地方：中间件轻，服务端重，缓存复用。"
      />

      <div style={{ position: "relative", flex: 1 }}>
        <AbsoluteFill style={{ opacity: flowOut }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              paddingTop: 14,
            }}
          >
            {nodes.map((node, index) => (
              <div
                key={node.tag}
                style={{ display: "flex", alignItems: "center", flex: 1 }}
              >
                <Panel
                  padding={22}
                  style={{
                    flex: 1,
                    minHeight: 186,
                    borderColor: node.accent
                      ? "rgba(94,233,181,0.30)"
                      : palette.border,
                    backgroundColor: node.accent
                      ? "rgba(94,233,181,0.06)"
                      : "rgba(21,25,24,0.86)",
                    opacity: appear(frame, 50 + index * 18),
                    transform: `translateY(${(1 - appear(frame, 50 + index * 18)) * 26}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: 13,
                      letterSpacing: "0.18em",
                      color: node.accent ? palette.mint : palette.textDim,
                    }}
                  >
                    {node.tag}
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      fontFamily: fonts.sans,
                      fontSize: 30,
                      fontWeight: 600,
                      color: palette.text,
                    }}
                  >
                    {node.title}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontFamily: fonts.sans,
                      fontSize: 19,
                      lineHeight: 1.45,
                      color: palette.textMuted,
                    }}
                  >
                    {node.desc}
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      display: "inline-flex",
                      alignSelf: "flex-start",
                      padding: "5px 11px",
                      borderRadius: 999,
                      fontFamily: fonts.mono,
                      fontSize: 13,
                      color: node.accent ? palette.mint : palette.textDim,
                      backgroundColor: node.accent
                        ? "rgba(94,233,181,0.12)"
                        : "rgba(255,255,255,0.05)",
                    }}
                  >
                    {node.note}
                  </div>
                </Panel>
                {index < nodes.length - 1 ? (
                  <div
                    style={{
                      position: "relative",
                      width: 40,
                      height: 2,
                      backgroundColor: "rgba(255,255,255,0.14)",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: -3,
                        left: `${travel * 100}%`,
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: palette.mint,
                        boxShadow: `0 0 12px ${palette.mint}`,
                        opacity: frame > 180 ? 1 : 0,
                      }}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div
            style={{
              position: "absolute",
              top: 268,
              left: 0,
              right: 0,
              display: "flex",
              gap: 30,
            }}
          >
            <CodeCard
              width={820}
              title="proxy.ts → server component"
              lines={[
                { text: "// middleware：只看 token 形态", tone: "com" },
                {
                  text: 'if (!token || !isJwtShape(token)) return redirect("/login")',
                  tone: "plain",
                },
                { text: "", tone: "plain" },
                { text: "// RSC：权威校验 + 单请求去重", tone: "com" },
                {
                  text: "const session = await getSession()      // cache()",
                  tone: "key",
                  highlight: true,
                },
                {
                  text: 'const ok = await can(session, "ai:own")',
                  tone: "key",
                  highlight: true,
                },
              ]}
              delay={90}
              fontSize={18}
              padding={22}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                paddingTop: 6,
              }}
            >
              {guards.map((text, index) => (
                <div
                  key={text}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    maxWidth: 560,
                    fontFamily: fonts.sans,
                    fontSize: 22,
                    lineHeight: 1.5,
                    color: palette.textMuted,
                    opacity: appear(frame, 260 + index * 14),
                  }}
                >
                  <span
                    style={{
                      color: palette.mint,
                      fontSize: 22,
                      lineHeight: 1.5,
                    }}
                  >
                    ✓
                  </span>
                  {text}
                </div>
              ))}
            </div>
          </div>
        </AbsoluteFill>

        <AbsoluteFill style={{ opacity: shotsIn }}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 16,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: palette.textDim,
              paddingTop: 6,
            }}
          >
            role · permission · route guard
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
            <Shot
              name="roles"
              width={800}
              height={430}
              url="hucky.dev/dashboard/roles"
              delay={30}
              zoom={[1, 1.05]}
              focus={["20%", "10%"]}
              redact={sidebarRedact}
            />
            <Shot
              name="permissions"
              width={800}
              height={430}
              url="hucky.dev/dashboard/permissions"
              delay={46}
              zoom={[1, 1.05]}
              focus={["30%", "10%"]}
              redact={sidebarRedact}
            />
          </div>
        </AbsoluteFill>
      </div>
    </Stage>
  );
};
