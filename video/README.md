# Intro Video

项目介绍视频，Remotion 4 + React 19，1920×1080 / 30fps / 200 秒。
独立子项目：有自己的 `package.json` 与 `bun.lock`，不参与根目录 `bun ci`、Next 构建与部署流水线。

## 命令

```bash
# 安装（每台机器一次）
bun run video:install

# 预览 / 调帧
bun run video:dev

# 首次截图前，登录一次并保存浏览器状态
bun run video:auth

# 批量截图并生成 src/generated/shots.json
bun run video:shots
bun run video:shots --only roles,permissions

# 渲染成片
bun run video:render
```

渲染产物在 `video/out/`（已忽略）。

## 结构

```
video/
  src/
    Intro.tsx          时间轴：8 段 + 12 帧交叉淡入
    Root.tsx           Composition 注册
    theme.ts           颜色与字体，对齐 app/[locale]/globals.css
    components/        Backdrop / Chrome / Captions / Shot / Terminal / mocks
    data/captions.ts   全片字幕（绝对帧号）
    data/shots.ts      截图清单读取
    scenes/            8 个场景
  public/
    music/bgm.mp3      配乐
    fonts/             等宽字体
    screenshots/       页面截图（生成物，随仓库提交）
```

## 截图与脱敏

- `scripts/capture-video-shots.mjs` 用 Playwright 截 1440×900 @2x；dashboard 截图统一用 `sidebarRedact` 盖住左下角登录账号。
- 真实聊天、文件列表、RAG 列表含个人数据，改由 `src/components/mocks.tsx` 里的等宽 mock 呈现；不要把带真实客户信息的截图提交进仓库。
- 飞书群聊截图可选：脱敏后放到 `video/public/screenshots/feishu-chat.png`，执行 `bun run video:shots --register` 登记，`AgentOps` 会自动从 mock 切换到截图。

## 改文案

- 字幕：`src/data/captions.ts`，`from`/`to` 是全片绝对帧号。
- 场景起点：`src/Intro.tsx` 的 `scenes.start`，改时长后需要同步字幕。
- 章节标记：`Chrome` 读取同一份 `scenes`，不需要单独维护。
