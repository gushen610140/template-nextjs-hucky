#!/usr/bin/env node
/**
 * 打开有头浏览器，让用户手动过一次 Logto 登录，
 * 检测到跳到 dashboard 后把 storage state 落盘，供截图脚本复用。
 *
 * 用法：bun run video:auth
 * 产物：.screenshots/app-auth.json（已在 .gitignore 里忽略）
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.APP_BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve(".screenshots/app-auth.json");
const TIMEOUT_MS = 10 * 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  const context = await chromium.launchPersistentContext(
    path.resolve(".screenshots/chrome-profile"),
    {
      headless: false,
      viewport: { width: 1440, height: 900 },
      locale: "zh-CN",
    },
  );

  const page = context.pages()[0] ?? (await context.newPage());
  page.on("console", (message) => {
    if (message.type() === "error") console.error("[page]", message.text());
  });

  try {
    await page.goto(`${BASE}/zh/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  } catch (error) {
    console.error(
      `打不开 ${BASE}/zh/login，先确认 bun dev 已经启动。\n${error instanceof Error ? error.message : error}`,
    );
    await context.close();
    process.exit(1);
  }

  console.log(`浏览器已打开，请在窗口里完成登录：${BASE}/zh/login`);
  console.log("检测到进入 dashboard 后会自动保存登录状态，最多等待 10 分钟。");

  const deadline = Date.now() + TIMEOUT_MS;
  let saved = false;

  while (Date.now() < deadline) {
    if (context.pages().length === 0) break;
    const current = context.pages()[context.pages().length - 1];
    const url = current.url();
    if (/\/dashboard(\/|$|\?)/.test(url)) {
      // 等页面把会话 cookie 写稳，再抓状态。
      await sleep(2000);
      mkdirSync(path.dirname(OUT), { recursive: true });
      await context.storageState({ path: OUT });
      console.log(`已保存登录状态：${OUT}`);
      saved = true;
      break;
    }
    await sleep(1000);
  }

  await context.close();

  if (!saved) {
    console.error("超时或窗口被关闭，未保存登录状态。");
    process.exit(1);
  }

  if (!existsSync(OUT)) {
    console.error("storage state 未生成。");
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
