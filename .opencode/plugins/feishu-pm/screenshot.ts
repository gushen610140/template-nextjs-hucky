import { type ChildProcess, execFile, spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const LAST_COMMIT_KEY = "feishu-pm/lastCommit";

export type NotifyTarget = {
  receiveIdType: "chat_id" | "open_id";
  receiveId: string;
};

export type ScreenshotStatus = {
  commit?: string;
  at?: string;
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
  /** 根据提交内容生成推送摘要；返回空时回退到固定格式。 */
  summarize?: (sha: string, subject: string) => Promise<string | undefined>;
  onStatus: (status: ScreenshotStatus) => void;
};

type RunningServer = {
  url: string;
  close: () => Promise<void>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

function defaultPages(): string[] {
  return (process.env.FEISHU_SCREENSHOT_PAGES ?? "/,/docs,/login")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function pageSlug(page: string) {
  const slug = page.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
  return slug || "home";
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
    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (response.status >= 500) return false;
    const match = process.env.FEISHU_SCREENSHOT_MATCH ?? "Hucky";
    const body = await response.text();
    return body.includes(match);
  } catch {
    return false;
  }
}

async function isPortFree(port: number) {
  return await new Promise<boolean>((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

async function findFreePort(start: number) {
  for (let port = start; port < start + 20; port += 1) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`没有可用端口（从 ${start} 开始）`);
}

function stopProcess(child: ChildProcess) {
  if (child.exitCode !== null || !child.pid) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    } else {
      process.kill(-child.pid, "SIGTERM");
    }
  } catch {
    // 进程已退出时忽略
  }
}

async function findNearbyServer(
  protocol: string,
  hostname: string,
  startPort: number,
) {
  for (let port = startPort; port < startPort + 10; port += 1) {
    const url = `${protocol}//${hostname}:${port}`;
    if (await isProjectServer(url)) return url;
  }
  return undefined;
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

async function ensureServer(
  directory: string,
  baseUrl: string,
  log: ScreenshotWatcherOptions["log"],
): Promise<RunningServer> {
  if (await isProjectServer(baseUrl)) {
    log("screenshot: reuse running server", { baseUrl });
    return { url: baseUrl, close: async () => {} };
  }

  const parsed = new URL(baseUrl);
  const requested = Number(parsed.port || 3000);

  // next dev 同一项目只允许一个实例；用户可能已经跑在别的端口。
  const nearby = await findNearbyServer(
    parsed.protocol,
    parsed.hostname,
    requested + 1,
  );
  if (nearby) {
    log("screenshot: found existing dev server", { nearby });
    return { url: nearby, close: async () => {} };
  }

  const port = await findFreePort(requested);
  const origin = `${parsed.protocol}//${parsed.hostname}:${port}`;

  log("screenshot: starting dev server", { port });
  const bun = which("bun");
  const command = bun ?? jsRuntime();
  const commandArgs = bun
    ? ["x", "next", "dev", "-p", String(port)]
    : [
        join(directory, "node_modules", "next", "dist", "bin", "next"),
        "dev",
        "-p",
        String(port),
      ];
  const child = spawn(command, commandArgs, {
    cwd: directory,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    detached: process.platform !== "win32",
  });

  let output = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    output = (output + chunk.toString()).slice(-2000);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    output = (output + chunk.toString()).slice(-2000);
  });

  const close = async () => {
    stopProcess(child);
    await sleep(500);
  };

  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      await close();
      const hint = /Another next dev server is already running/i.test(output)
        ? "已有 next dev 实例在运行，请设置 FEISHU_SCREENSHOT_BASE 指向其端口"
        : cleanOutput(output);
      throw new Error(
        `dev server 启动失败（退出码 ${child.exitCode}）${hint ? `：${hint}` : ""}`,
      );
    }
    if (await isProjectServer(origin)) {
      log("screenshot: dev server ready", { origin });
      return { url: origin, close };
    }
    await sleep(1000);
  }

  await close();
  throw new Error("dev server 启动超时");
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

    let server: RunningServer | undefined;
    try {
      const target = await options.getTarget();
      if (!target) {
        options.log("screenshot: no feishu target, skip");
        return;
      }

      const subject = await readCommitSubject(options.directory, sha);
      const outDir = join(options.directory, ".screenshots", "commits");
      await rm(outDir, { recursive: true, force: true });
      await mkdir(outDir, { recursive: true });

      server = await ensureServer(options.directory, baseUrl, options.log);
      const pages = defaultPages();
      const shots: Array<{ page: string; path: string }> = [];

      for (const page of pages) {
        const path = join(outDir, `${pageSlug(page)}.png`);
        await capturePage(
          options.directory,
          new URL(page, server.url).toString(),
          path,
        );
        shots.push({ page, path });
      }

      const summaryPromise = options.summarize
        ? options.summarize(sha, subject).catch((error) => {
            options.log("screenshot: summarize failed", error);
            return undefined;
          })
        : Promise.resolve(undefined);
      const generated = await summaryPromise;
      const summary = generated ?? `main 更新 ${subject}`;

      await options.sendText(
        target,
        `${summary}\n\n截图页面：${pages.join("、")}`,
      );
      for (const shot of shots) {
        await options.sendImage(target, shot.path);
      }

      options.onStatus({ commit: subject, at: new Date().toISOString() });
      options.log("screenshot: sent", { commit: subject, count: shots.length });
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
      await server?.close();
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
