import { useCurrentFrame } from "remotion";
import { Terminal, type TermLine } from "../components/Terminal";
import { Chip, Heading, Panel, Stage } from "../components/ui";
import { fonts, palette } from "../theme";

const termLines: TermLine[] = [
  { at: 40, kind: "cmd", text: "bun ci" },
  { at: 78, kind: "out", text: "installed 1,204 packages · lockfile 未改动" },
  { at: 132, kind: "cmd", text: "bun run db:setup" },
  { at: 176, kind: "out", text: "prisma generate  ✓" },
  { at: 208, kind: "out", text: "prisma migrate deploy  ✓" },
  { at: 244, kind: "out", text: "prisma db seed  ✓" },
  { at: 292, kind: "cmd", text: "bun dev" },
  { at: 326, kind: "ok", text: "▲ Next.js ready on http://localhost:3000" },
];

const groups = [
  {
    label: "data",
    items: ["PostgreSQL", "Prisma 7", "RustFS", "Qdrant"],
    delay: 90,
  },
  {
    label: "auth",
    items: ["Logto SSO", "Local Session", "RBAC"],
    delay: 130,
  },
  {
    label: "toolchain",
    items: ["Bun", "Biome", "Fumadocs", "Playwright"],
    delay: 170,
  },
];

export const Foundation = () => {
  const frame = useCurrentFrame();
  const badge = Math.min(1, Math.max(0, (frame - 300) / 20));
  const pulse = 0.5 + 0.5 * Math.sin(frame / 14);

  return (
    <Stage style={{ flexDirection: "column", gap: 46 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 40,
        }}
      >
        <Heading
          kicker="foundation"
          title="一条命令，把整条底座拉起来"
          sub={
            <>
              全栈依赖、数据库迁移、对象存储与向量库接入，全部落在仓库里，
              <span style={{ color: palette.text }}>不靠口头交接</span>。
            </>
          }
        />
        <Panel
          padding={26}
          style={{
            minWidth: 250,
            opacity: badge,
            transform: `translateY(${(1 - badge) * 24}px)`,
            backgroundColor: "rgba(94,233,181,0.08)",
            borderColor: "rgba(94,233,181,0.28)",
          }}
        >
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 15,
              letterSpacing: "0.2em",
              color: palette.mint,
            }}
          >
            TIME TO CODE
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: fonts.sans,
              fontSize: 62,
              fontWeight: 700,
              lineHeight: 1,
              color: palette.text,
            }}
          >
            ≈ 60
            <span
              style={{ fontSize: 28, marginLeft: 8, color: palette.textMuted }}
            >
              min
            </span>
          </div>
        </Panel>
      </div>

      <div style={{ display: "flex", gap: 48, alignItems: "flex-start" }}>
        <Terminal lines={termLines} width={830} title="hucky — bun" />

        <div
          style={{ display: "flex", flexDirection: "column", gap: 26, flex: 1 }}
        >
          {groups.map((group) => (
            <div
              key={group.label}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 15,
                  letterSpacing: "0.26em",
                  textTransform: "uppercase",
                  color: palette.textDim,
                }}
              >
                {group.label}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {group.items.map((item, index) => (
                  <Chip
                    key={item}
                    delay={group.delay + index * 6}
                    active={frame > 620 && item === "Qdrant"}
                  >
                    {item}
                  </Chip>
                ))}
              </div>
            </div>
          ))}

          <div
            style={{
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontFamily: fonts.sans,
              fontSize: 22,
              color: palette.textMuted,
              opacity: Math.min(1, Math.max(0, (frame - 420) / 26)),
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                backgroundColor: palette.mint,
                opacity: 0.45 + pulse * 0.55,
              }}
            />
            第三方服务全部本地部署，离线也能跑通全链路
          </div>
        </div>
      </div>
    </Stage>
  );
};
