#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const USAGE = `Usage: bun run screenshot <url|path> [options]

Options:
  --out <file>            Output PNG path (default: .screenshots/<timestamp>.png)
  --base <url>            Base URL for path-only targets (default: http://localhost:3000)
  --storage-state <file>  Playwright storage state JSON with login cookies
  --full-page             Capture the full scrollable page
  --selector <css>        Capture one element instead of the viewport
  --viewport <WxH>        Viewport size (default: 1440x900)
  --scale <n>             Device scale factor (default: 1)
  --wait-for <css>        Wait for a selector before capturing
  --wait-until <state>    load | domcontentloaded | networkidle | commit (default: load)
  --timeout <ms>          Navigation timeout (default: 30000)
  --color-scheme <mode>   light | dark
  --help                  Show this help`;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const flags = new Set(["--full-page", "--help"]);
  const valued = new Set([
    "--out",
    "--base",
    "--storage-state",
    "--selector",
    "--viewport",
    "--scale",
    "--wait-for",
    "--wait-until",
    "--timeout",
    "--color-scheme",
  ]);
  const options = {};
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (flags.has(arg)) {
      options[arg.slice(2)] = true;
      continue;
    }
    if (valued.has(arg)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        fail(`Missing value for ${arg}\n\n${USAGE}`);
      }
      options[arg.slice(2)] = value;
      i += 1;
      continue;
    }
    if (arg.startsWith("--")) {
      fail(`Unknown option: ${arg}\n\n${USAGE}`);
    }
    positional.push(arg);
  }

  return { options, positional };
}

function parseViewport(value) {
  const match = /^(\d+)x(\d+)$/i.exec(value);
  if (!match)
    fail(`Invalid --viewport "${value}", expected WxH such as 1440x900`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

function parseNumber(name, value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0)
    fail(`Invalid --${name} "${value}"`);
  return parsed;
}

function resolveTarget(target, base) {
  if (/^https?:\/\//i.test(target)) return target;
  if (/^file:\/\//i.test(target)) return target;
  return new URL(target, base).toString();
}

function defaultOutPath(host) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const safeHost = host.replace(/[^a-z0-9.-]+/gi, "_") || "page";
  return path.join(".screenshots", `${safeHost}-${stamp}.png`);
}

const { options, positional } = parseArgs(process.argv.slice(2));

if (options.help) {
  console.log(USAGE);
  process.exit(0);
}

const target = positional[0];
if (!target) fail(`Missing target URL or path\n\n${USAGE}`);

const base = options.base ?? "http://localhost:3000";
const url = resolveTarget(target, base);
const viewport = options.viewport
  ? parseViewport(options.viewport)
  : { width: 1440, height: 900 };
const scale = options.scale ? parseNumber("scale", options.scale) : 1;
const timeout = options.timeout
  ? parseNumber("timeout", options.timeout)
  : 30000;
const waitUntil = options["wait-until"] ?? "load";
const colorScheme = options["color-scheme"];
const storageState = options["storage-state"]
  ? path.resolve(options["storage-state"])
  : undefined;
const outPath = path.resolve(options.out ?? defaultOutPath(new URL(url).host));

if (storageState && !existsSync(storageState)) {
  fail(`Storage state not found: ${storageState}\nRun: bun run feishu-pm:auth`);
}

const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale,
    ...(colorScheme ? { colorScheme } : {}),
    ...(storageState ? { storageState } : {}),
  });
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);

  const response = await page.goto(url, { waitUntil, timeout });

  if (options["wait-for"]) {
    await page.waitForSelector(options["wait-for"], {
      state: "visible",
      timeout,
    });
  }

  await mkdir(path.dirname(outPath), { recursive: true });

  if (options.selector) {
    const locator = page.locator(options.selector).first();
    await locator.waitFor({ state: "visible", timeout });
    await locator.screenshot({ path: outPath });
  } else {
    await page.screenshot({
      path: outPath,
      fullPage: Boolean(options["full-page"]),
    });
  }

  const size = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));

  console.log(
    JSON.stringify({
      ok: true,
      url,
      finalUrl: page.url(),
      status: response?.status() ?? null,
      path: outPath,
      viewport,
      pageSize: size,
    }),
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/Executable doesn't exist|browserType\.launch/i.test(message)) {
    fail(
      `Chromium is not installed. Run: bun run browser:install\n\n${message}`,
    );
  }
  fail(message);
} finally {
  await browser.close();
}
