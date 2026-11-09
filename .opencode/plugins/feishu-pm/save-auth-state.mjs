#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { chromium } from "playwright";

function defaultLocale() {
  try {
    const text = readFileSync(
      path.join(process.cwd(), "i18n", "routing.ts"),
      "utf8",
    );
    return /defaultLocale\s*:\s*["']([^"']+)["']/.exec(text)?.[1] ?? "zh";
  } catch {
    return "zh";
  }
}

const locale = process.env.FEISHU_SCREENSHOT_LOCALE?.trim() || defaultLocale();
const target =
  process.argv[2]?.trim() ||
  process.env.FEISHU_SCREENSHOT_LOGIN_URL?.trim() ||
  `http://localhost:3000/${locale}/dashboard`;
const outPath = path.resolve(
  process.env.FEISHU_SCREENSHOT_STORAGE_STATE?.trim() ||
    ".opencode/plugins/feishu-pm/auth.json",
);

console.log(`打开：${target}`);
console.log("请在浏览器中完成登录，登录成功后回到终端按 Enter。");
console.log("需要本机有图形界面与 Chrome/Chromium。");

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
let exitCode = 0;

try {
  const page = await context.newPage();
  try {
    await page.goto(target, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  } catch (error) {
    console.warn(
      `页面打开失败：${error instanceof Error ? error.message : String(error)}`,
    );
    console.warn("请确认 dev server 已启动，再在浏览器里继续登录。");
  }

  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    await terminal.question("登录完成后按 Enter 保存登录态：");
  } finally {
    terminal.close();
  }

  const cookies = await context.cookies();
  if (!cookies.some((cookie) => cookie.name === "session")) {
    console.error("没有找到 session cookie，登录可能未完成；未保存登录态。");
    exitCode = 1;
  } else {
    await mkdir(path.dirname(outPath), { recursive: true });
    await context.storageState({ path: outPath });
    console.log(`登录态已保存：${outPath}`);
    console.log("session 有效期 7 天，过期后重新运行本脚本。");
  }
} finally {
  await browser.close().catch(() => {});
}

process.exit(exitCode);
