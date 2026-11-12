#!/usr/bin/env node
/**
 * 批量截取视频用页面截图，写入 video/public/screenshots，
 * 并同步生成 video/src/generated/shots.json 供 Remotion 引用。
 *
 * 用法：
 *   bun run video:shots                 # 全部
 *   bun run video:shots --only files,rag
 *   bun run video:shots --register      # 只把手工放进目录的 png 登记进清单
 *
 * 依赖：bun dev 已启动；需要登录的页面先跑 bun run video:auth。
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "video/public/screenshots");
const MANIFEST = path.join(ROOT, "video/src/generated/shots.json");
const BASE = process.env.APP_BASE_URL ?? "http://localhost:3000";
const STATE = path.resolve(ROOT, ".screenshots/app-auth.json");
const VIEWPORT = { width: 1440, height: 900 };

/** auth: true 表示需要登录态；缺少 state 时会跳过而不是截出错页。 */
const SHOTS = [
  { key: "landing", path: "/zh", auth: false },
  { key: "docs", path: "/zh/docs", auth: false },
  { key: "docs-skills", path: "/zh/docs/skills", auth: false },
  { key: "docs-feishu", path: "/zh/docs/opencode/feishu", auth: false },
  { key: "roles", path: "/zh/dashboard/roles", auth: true },
  { key: "permissions", path: "/zh/dashboard/permissions", auth: true },
  { key: "models", path: "/zh/dashboard/models", auth: true },
];

const parseArgs = (argv) => {
  const options = { only: null, register: argv.includes("--register") };
  argv.forEach((arg, index) => {
    if (arg === "--only") {
      options.only = (argv[index + 1] ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    }
  });
  return options;
};

const readManifest = async () => {
  try {
    return JSON.parse(await readFile(MANIFEST, "utf8"));
  } catch {
    return {};
  }
};

const registerManual = async (manifest) => {
  const files = await readdir(OUT_DIR).catch(() => []);
  const pngs = files.filter((file) => file.endsWith(".png"));

  for (const file of pngs) {
    const key = file.replace(/\.png$/, "");
    if (manifest[key]) continue;
    // 宽高交给 Remotion 的 Img 自适应，手工图只登记 key。
    manifest[key] = { file, width: 0, height: 0 };
    console.log(`registered manual shot: ${key}`);
  }
  return manifest;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(OUT_DIR, { recursive: true });
  const manifest = await readManifest();

  if (options.register) {
    await registerManual(manifest);
    await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`manifest updated: ${MANIFEST}`);
    return;
  }

  const hasState = existsSync(STATE);
  if (!hasState) {
    console.warn("缺少 .screenshots/app-auth.json，跳过需要登录的页面。先跑 bun run video:auth");
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: "zh-CN",
    colorScheme: "dark",
    ...(hasState ? { storageState: STATE } : {}),
  });
  await context.addInitScript(() => {
    window.localStorage.setItem("theme", "dark");
  });

  const targets = options.only
    ? SHOTS.filter((shot) => options.only.includes(shot.key))
    : SHOTS;

  try {
    for (const shot of targets) {
      if (shot.auth && !hasState) {
        console.log(`skip ${shot.key}: no auth state`);
        continue;
      }

      const page = await context.newPage();
      page.setDefaultTimeout(40_000);
      try {
        const response = await page.goto(`${BASE}${shot.path}`, {
          waitUntil: "domcontentloaded",
        });

        // 客户端组件挂载 + 字体 + 动画稳定后再截。
        await page.waitForSelector("main", { state: "visible" }).catch(() => {});
        await page.evaluate(() => document.fonts?.ready).catch(() => {});
        await page.waitForTimeout(1400);

        const file = `${shot.key}.png`;
        await page.screenshot({
          path: path.join(OUT_DIR, file),
          fullPage: false,
          animations: "disabled",
        });

        const size = await page.evaluate(() => ({
          width: window.innerWidth,
          height: window.innerHeight,
        }));
        manifest[shot.key] = { file, width: size.width * 2, height: size.height * 2 };
        console.log(`ok ${shot.key} ← ${shot.path} (${response?.status() ?? "?"})`);
      } catch (error) {
        console.error(`fail ${shot.key}: ${error instanceof Error ? error.message : error}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`manifest updated: ${MANIFEST}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
