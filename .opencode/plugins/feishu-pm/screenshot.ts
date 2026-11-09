import { execFile } from "node:child_process";
import { type Dirent, readFileSync } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import { join, relative } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const LAST_COMMIT_KEY = "feishu-pm/lastCommit";
const MAX_PAGES = 6;

export type NotifyTarget = {
  receiveIdType: "chat_id" | "open_id";
  receiveId: string;
};

export type CommitAnalysis = {
  summary?: string;
  pages: string[];
};

export type ScreenshotStatus = {
  commit?: string;
  at?: string;
  pages?: string[];
  error?: string;
};

export type ScreenshotWatcherOptions = {
  directory: string;
  log: (message: string, extra?: unknown) => void;
  storageGet: (key: string) => Promise<unknown>;
  storageSet: (key: string, value: unknown) => Promise<void>;
  getTarget: () => Promise<NotifyTarget | undefined>;
  sendImage: (target: NotifyTarget, filePath: string) => Promise<void>;
  sendText: (target: NotifyTarget, text: string) => Promise<void>;
  /** AI 根据提交内容返回发布摘要与需要截图的页面；失败时回退到文件路径推断。 */
  analyze?: (
    sha: string,
    subject: string,
  ) => Promise<CommitAnalysis | undefined>;
  onStatus: (status: ScreenshotStatus) => void;
};

type BunGlobal = { which?: (command: string) => string | null };

/** OpenCode 的 process.execPath 是 opencode.exe，不能用来执行脚本。 */
function which(command: string) {
  try {
    return (globalThis as { Bun?: BunGlobal }).Bun?.which?.(command) ?? null;
  } catch {
    return null;
  }
}

function jsRuntime() {
  return which("node") ?? which("bun") ?? "node";
}

type RoutingConfig = {
  locales: string[];
  defaultLocale: string;
};

function readRouting(directory: string): RoutingConfig {
  const fallback = { locales: ["zh"], defaultLocale: "zh" };
  try {
    const text = readFileSync(join(directory, "i18n", "routing.ts"), "utf8");
    const localesMatch = /locales\s*:\s*\[([\s\S]*?)\]/.exec(text);
    const locales = localesMatch
      ? [...localesMatch[1].matchAll(/["']([^"']+)["']/g)].map(
          (match) => match[1],
        )
      : [];
    const defaultLocale =
      /defaultLocale\s*:\s*["']([^"']+)["']/.exec(text)?.[1] ??
      locales[0] ??
      fallback.defaultLocale;
    return {
      locales: locales.length > 0 ? locales : [defaultLocale],
      defaultLocale,
    };
  } catch {
    return fallback;
  }
}

function screenshotLocale(directory: string) {
  return (
    process.env.FEISHU_SCREENSHOT_LOCALE?.trim() ||
    readRouting(directory).defaultLocale
  );
}

function toLocalePath(page: string, routing: RoutingConfig, locale: string) {
  let path = page.trim();
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/{2,}/g, "/");

  const parts = path.split("/").filter(Boolean);
  if (parts.length > 0 && routing.locales.includes(parts[0])) {
    path = `/${parts.slice(1).join("/")}`;
  }
  path = path.replace(/\/+$/, "") || "/";
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

export function normalizePages(pages: readonly string[], directory: string) {
  const routing = readRouting(directory);
  const locale = screenshotLocale(directory);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const page of pages) {
    if (typeof page !== "string") continue;
    let path = page.trim();
    if (!path) continue;
    if (!path.startsWith("/")) path = `/${path}`;
    if (/[[\]*]/.test(path)) continue;
    if (/^\/(api|_next)(\/|$)/.test(path)) continue;

    const full = toLocalePath(path, routing, locale);
    if (seen.has(full)) continue;
    seen.add(full);
    result.push(full);
    if (result.length >= MAX_PAGES) break;
  }

  return result;
}

function pageSlug(page: string) {
  const slug = page.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
  return slug || "home";
}

function routeFromPageFile(rel: string) {
  const parts = rel.replace(/\\/g, "/").split("/");
  const file = parts.pop() ?? "";
  if (!/^page\.[^.]+$/.test(file)) return undefined;

  const segments: string[] = [];
  for (const segment of parts) {
    if (!segment) continue;
    if (/^\(.+\)$/.test(segment) || segment.startsWith("@")) continue;
    // 可选 catch-all 的父路径本身可访问，例如 /docs/[[...slug]] -> /docs
    if (/^\[\[\.\.\..+\]\]$/.test(segment)) break;
    if (segment.includes("[") || segment.includes("]")) return undefined;
    segments.push(segment);
  }

  return `/${segments.join("/")}`.replace(/\/+$/, "") || "/";
}

function routeFromChangedFile(rel: string) {
  const parts = rel.replace(/\\/g, "/").split("/");
  const file = parts.pop() ?? "";
  if (/^page\.[^.]+$/.test(file)) return routeFromPageFile(rel);

  const segments: string[] = [];
  for (const segment of parts) {
    if (!segment) continue;
    if (/^\(.+\)$/.test(segment) || segment.startsWith("@")) continue;
    if (segment.includes("[") || segment.includes("]")) return undefined;
    segments.push(segment);
  }

  return `/${segments.join("/")}`.replace(/\/+$/, "") || "/";
}

export async function collectStaticRoutes(directory: string) {
  const root = join(directory, "app", "[locale]");
  const routes = new Set<string>();

  const walk = async (dir: string): Promise<void> => {
    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (/^page\.[^.]+$/.test(entry.name)) {
        const route = routeFromPageFile(relative(root, full));
        if (route) routes.add(route);
      }
    }
  };

  await walk(root);
  return [...routes].sort();
}

/** AI 不可用时的兜底：把 app/[locale] 下改动的文件映射成页面路由。 */
export async function fallbackPagesFromCommit(directory: string, sha: string) {
  let files: string[];
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", directory, "show", "--name-only", "--format=", sha],
      { timeout: 20000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
    );
    files = stdout.split(/\r?\n/).map((line) => line.trim());
  } catch {
    return [];
  }

  const prefix = "app/[locale]/";
  const targets = new Set<string>();
  for (const file of files) {
    if (!file.startsWith(prefix)) continue;
    const route = routeFromChangedFile(file.slice(prefix.length));
    if (route) targets.add(route);
  }
  if (targets.size === 0) return [];

  const routes = await collectStaticRoutes(directory);
  const matched = routes.filter((route) =>
    [...targets].some(
      (target) =>
        target === "/" || route === target || route.startsWith(`${target}/`),
    ),
  );
  return (matched.length > 0 ? matched : [...targets]).slice(0, MAX_PAGES);
}

async function readMainSha(directory: string) {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", directory, "rev-parse", "--verify", "refs/heads/main"],
      { timeout: 10000, windowsHide: true },
    );
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function readCommitSubject(directory: string, sha: string) {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", directory, "log", "-1", "--format=%h %s", sha],
      { timeout: 10000, windowsHide: true },
    );
    return stdout.trim();
  } catch {
    return sha.slice(0, 7);
  }
}

async function isProjectServer(url: string) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (response.status >= 500) return false;
    const match = process.env.FEISHU_SCREENSHOT_MATCH ?? "Hucky";
    const body = await response.text();
    return body.includes(match);
  } catch {
    return false;
  }
}

async function ensureServer(
  baseUrl: string,
  log: ScreenshotWatcherOptions["log"],
) {
  if (await isProjectServer(baseUrl)) {
    log("screenshot: reuse running server", { baseUrl });
    return baseUrl;
  }
  throw new Error(
    `开发服务器不可用：${baseUrl}。请先在默认 3000 端口运行 bun dev，并确认页面可访问。`,
  );
}

function cleanOutput(text: string) {
  const ansi = new RegExp(`${String.fromCharCode(27)}\\[[0-9;?]*[a-zA-Z]`, "g");
  return text
    .replace(ansi, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-3)
    .join(" ");
}

async function capturePage(directory: string, url: string, outPath: string) {
  const script = join(directory, "scripts", "screenshot.mjs");
  await execFileAsync(
    jsRuntime(),
    [
      script,
      url,
      "--out",
      outPath,
      "--wait-until",
      "load",
      "--timeout",
      "30000",
    ],
    { cwd: directory, timeout: 90000, windowsHide: true },
  );
}

export function startScreenshotWatcher(options: ScreenshotWatcherOptions) {
  if (process.env.FEISHU_SCREENSHOT === "0") {
    options.log("screenshot: disabled by FEISHU_SCREENSHOT=0");
    return { stop() {} };
  }

  const pollMs = Math.max(
    5000,
    Number(process.env.FEISHU_SCREENSHOT_POLL_MS ?? 20000) || 20000,
  );
  const baseUrl = process.env.FEISHU_SCREENSHOT_BASE ?? "http://localhost:3000";
  let stopped = false;
  let running = false;

  const runTick = async () => {
    if (stopped || running) return;
    const sha = await readMainSha(options.directory);
    if (!sha) return;

    const stored = await options.storageGet(LAST_COMMIT_KEY);
    if (typeof stored !== "string") {
      await options.storageSet(LAST_COMMIT_KEY, sha);
      options.log("screenshot: baseline recorded", { sha });
      return;
    }
    if (stored === sha) return;

    running = true;
    await options.storageSet(LAST_COMMIT_KEY, sha);

    try {
      const target = await options.getTarget();
      if (!target) {
        options.log("screenshot: no feishu target, skip");
        return;
      }

      const subject = await readCommitSubject(options.directory, sha);
      const analysis = options.analyze
        ? await options.analyze(sha, subject).catch((error) => {
            options.log("screenshot: analyze failed", error);
            return undefined;
          })
        : undefined;
      const pages = normalizePages(analysis?.pages ?? [], options.directory);
      const body =
        process.env.FEISHU_PM_SUMMARY === "0"
          ? undefined
          : analysis?.summary?.trim();
      const summary = body ? `${subject}\n\n${body}` : `main 更新 ${subject}`;

      if (pages.length === 0) {
        await options.sendText(
          target,
          `${summary}\n\n本次提交未涉及页面变更，未生成截图。`,
        );
        options.onStatus({
          commit: subject,
          at: new Date().toISOString(),
          pages: [],
        });
        options.log("screenshot: no page changes", { commit: subject });
        return;
      }

      const serverUrl = await ensureServer(baseUrl, options.log);
      const outDir = join(options.directory, ".screenshots", "commits");
      await rm(outDir, { recursive: true, force: true });
      await mkdir(outDir, { recursive: true });

      const shots: Array<{ page: string; path: string }> = [];
      for (const page of pages) {
        const path = join(outDir, `${pageSlug(page)}.png`);
        try {
          await capturePage(
            options.directory,
            new URL(page, serverUrl).toString(),
            path,
          );
          shots.push({ page, path });
        } catch (error) {
          const detail = cleanOutput(
            error instanceof Error ? error.message : String(error),
          );
          options.log("screenshot: page failed", { page, detail });
        }
      }
      if (shots.length === 0) {
        throw new Error("所有页面截图失败，请检查 dev server 与页面路由");
      }

      await options.sendText(
        target,
        `${summary}\n\n截图页面：${shots.map((shot) => shot.page).join("、")}`,
      );
      for (const shot of shots) {
        await options.sendImage(target, shot.path);
      }

      const sentPages = shots.map((shot) => shot.page);
      options.onStatus({
        commit: subject,
        at: new Date().toISOString(),
        pages: sentPages,
      });
      options.log("screenshot: sent", {
        commit: subject,
        count: shots.length,
        pages: sentPages,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      options.onStatus({ at: new Date().toISOString(), error: message });
      options.log("screenshot: FAILED", error);
      try {
        const target = await options.getTarget();
        if (target) {
          await options.sendText(target, `main 截图失败：${message}`);
        }
      } catch {
        // 通知失败时只保留日志
      }
    } finally {
      running = false;
    }
  };

  const tick = async () => {
    try {
      await runTick();
    } catch (error) {
      running = false;
      options.log("screenshot: tick failed", error);
    }
  };

  const initial = setTimeout(tick, 3000);
  const timer = setInterval(tick, pollMs);

  return {
    stop() {
      stopped = true;
      clearTimeout(initial);
      clearInterval(timer);
    },
  };
}
