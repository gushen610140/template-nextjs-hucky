"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_FONT_SETTINGS,
  FONT_CACHE_NAME,
  FONT_CSS_VARIABLES,
  FONT_LIBRARY,
  FONT_ROLES,
  FONT_STORAGE_KEY,
  FONT_SYSTEM_FALLBACK,
  type FontId,
  type FontRole,
  type FontSettings,
  getFontCacheKey,
  getFontFamily,
  parseFontSettings,
} from "@/lib/font-presets";

export type FontDownloadState = {
  id: FontId;
  role: FontRole;
  loaded: number;
  total: number;
  status: "downloading" | "error";
  message?: string;
};

type FontContextValue = {
  settings: FontSettings;
  ready: boolean;
  cachedIds: ReadonlySet<string>;
  download: FontDownloadState | null;
  selectFont: <R extends FontRole>(role: R, id: FontSettings[R]) => void;
  cancelDownload: () => void;
  resetFonts: () => void;
};

const FontContext = createContext<FontContextValue | null>(null);

/**
 * 已注册到 document.fonts 的 face, 按字体 id 缓存。
 * 放在模块作用域, 因为字体注册在 document 上是全局的。
 */
const loadedFaces = new Map<FontId, FontFace>();

function supportsCache(): boolean {
  return typeof caches !== "undefined";
}

/** 读取 Cache Storage 里的字体文件; 未缓存或不可用时返回 null */
async function readCachedFont(id: FontId): Promise<ArrayBuffer | null> {
  if (!supportsCache()) return null;

  try {
    const cache = await caches.open(FONT_CACHE_NAME);
    const response = await cache.match(getFontCacheKey(id));
    return response ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** 把下载好的字体写进 Cache Storage, 下次选择不再走网络 */
async function writeCachedFont(id: FontId, buffer: ArrayBuffer): Promise<void> {
  const cache = await caches.open(FONT_CACHE_NAME);
  await cache.put(
    getFontCacheKey(id),
    new Response(buffer, {
      headers: {
        "content-type": "font/ttf",
        "content-length": String(buffer.byteLength),
      },
    }),
  );
}

/** 从 ArrayBuffer 注册 FontFace, 已注册过则直接复用 */
async function ensureFace(id: FontId, buffer: ArrayBuffer): Promise<FontFace> {
  const existing = loadedFaces.get(id);
  if (existing) return existing;

  const face = new FontFace(getFontFamily(id), buffer, {
    weight: FONT_LIBRARY[id].weight,
    style: "normal",
    // 只在写入 CSS 变量前加载, 用 block 避免切换瞬间的 swap 闪动
    display: "block",
  });

  await face.load();
  document.fonts.add(face);
  loadedFaces.set(id, face);
  return face;
}

/**
 * 先用 /api/fonts/[id] 换一个私有桶的临时地址, 再直连 COS 下载。
 * COS 返回 Content-Length 时按字节上报进度, 拿不到就只报 0。
 */
async function downloadFontFile(
  id: FontId,
  signal: AbortSignal,
  onProgress: (loaded: number, total: number) => void,
): Promise<ArrayBuffer> {
  const metaResponse = await fetch(`/api/fonts/${encodeURIComponent(id)}`, {
    signal,
    cache: "no-store",
  });
  if (!metaResponse.ok) {
    throw new Error(`获取下载地址失败 (${metaResponse.status})`);
  }

  const meta = (await metaResponse.json()) as { url?: string; size?: number };
  if (!meta.url) throw new Error("服务端未返回下载地址");

  const fileResponse = await fetch(meta.url, { signal });
  if (!fileResponse.ok) {
    throw new Error(`下载字体失败 (${fileResponse.status})`);
  }

  const total =
    Number(fileResponse.headers.get("content-length")) || meta.size || 0;

  if (!fileResponse.body) {
    const buffer = await fileResponse.arrayBuffer();
    onProgress(buffer.byteLength, total || buffer.byteLength);
    return buffer;
  }

  const reader = fileResponse.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress(loaded, total);
  }

  const merged = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged.buffer as ArrayBuffer;
}

export function FontProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<FontSettings>(DEFAULT_FONT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [cachedIds, setCachedIds] = useState<ReadonlySet<string>>(new Set());
  const [download, setDownload] = useState<FontDownloadState | null>(null);
  const applySequence = useRef(0);
  const downloadAbort = useRef<AbortController | null>(null);

  const refreshCachedIds = useCallback(async () => {
    const cached = new Set<string>();

    await Promise.all(
      (Object.keys(FONT_LIBRARY) as FontId[]).map(async (id) => {
        if (await readCachedFont(id)) cached.add(id);
      }),
    );

    setCachedIds(cached);
  }, []);

  // 挂载后读取用户上次的选择, 并标记哪些字体已经在本地缓存。
  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const stored = window.localStorage.getItem(FONT_STORAGE_KEY);
        if (stored) {
          const next = parseFontSettings(JSON.parse(stored));
          if (next && active) setSettings(next);
        }
      } catch {
        // 忽略损坏的存储, 回退到系统字体。
      }

      await refreshCachedIds();
      if (active) setReady(true);
    })();

    return () => {
      active = false;
      downloadAbort.current?.abort();
    };
  }, [refreshCachedIds]);

  /**
   * 应用字体: 只读本地缓存, 绝不在这里发起下载。
   * 没缓存的角色回落到系统字体, 并把选择重置成 system, 避免 UI 显示与实际不符。
   */
  const apply = useCallback(async (next: FontSettings) => {
    const sequence = ++applySequence.current;

    const resolved = await Promise.all(
      FONT_ROLES.map(async (role) => {
        const id = next[role];
        if (id === "system") return [role, null] as const;

        const fontId = id as FontId;
        const buffer = await readCachedFont(fontId);
        if (!buffer) return [role, null] as const;

        try {
          await ensureFace(fontId, buffer);
          return [role, fontId] as const;
        } catch (error) {
          console.error(`Failed to load font "${fontId}"`, error);
          return [role, null] as const;
        }
      }),
    );

    // 用户可能在加载期间又切了一次, 只保留最后一次结果。
    if (sequence !== applySequence.current) return;

    const root = document.documentElement;
    for (const role of FONT_ROLES) {
      const fontId = resolved.find(([name]) => name === role)?.[1] ?? null;

      if (fontId) {
        root.style.setProperty(
          FONT_CSS_VARIABLES[role],
          `"${getFontFamily(fontId)}", ${FONT_SYSTEM_FALLBACK[role]}`,
        );
      } else {
        root.style.removeProperty(FONT_CSS_VARIABLES[role]);
      }
    }

    setSettings((current) => {
      const unavailable = FONT_ROLES.filter(
        (role) =>
          current[role] !== "system" &&
          resolved.every(([name]) => name !== role),
      );
      if (unavailable.length === 0) return current;

      const patched: FontSettings = {
        sans: unavailable.includes("sans") ? "system" : current.sans,
        heading: unavailable.includes("heading") ? "system" : current.heading,
        mono: unavailable.includes("mono") ? "system" : current.mono,
      };
      return patched;
    });
  }, []);

  useEffect(() => {
    if (!ready) return;

    void apply(settings);

    try {
      window.localStorage.setItem(FONT_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // 存储不可用时只影响下次恢复, 不影响当前会话。
    }
  }, [settings, ready, apply]);

  const selectFont = useCallback(
    <R extends FontRole>(role: R, id: FontSettings[R]) => {
      if (id === "system") {
        downloadAbort.current?.abort();
        downloadAbort.current = null;
        setDownload(null);
        setSettings((current) => ({ ...current, [role]: id }));
        return;
      }

      const fontId = id as FontId;

      // 换字体时取消上一次还没完成的下载。
      downloadAbort.current?.abort();
      const controller = new AbortController();
      downloadAbort.current = controller;

      void (async () => {
        if (await readCachedFont(fontId)) {
          if (downloadAbort.current === controller) {
            downloadAbort.current = null;
            setDownload(null);
          }
          setSettings((current) => ({ ...current, [role]: id }));
          return;
        }

        setDownload({
          id: fontId,
          role,
          loaded: 0,
          total: 0,
          status: "downloading",
        });

        try {
          const buffer = await downloadFontFile(
            fontId,
            controller.signal,
            (loaded, total) => {
              setDownload((current) =>
                current?.id === fontId
                  ? { ...current, loaded, total, status: "downloading" }
                  : current,
              );
            },
          );

          await writeCachedFont(fontId, buffer);
          setCachedIds((prev) => new Set(prev).add(fontId));
          setDownload(null);
          setSettings((current) => ({ ...current, [role]: id }));
        } catch (error) {
          if (controller.signal.aborted) return;

          console.error(`Failed to download font "${fontId}"`, error);
          setDownload({
            id: fontId,
            role,
            loaded: 0,
            total: 0,
            status: "error",
            message: error instanceof Error ? error.message : "下载失败",
          });
        }
      })();
    },
    [],
  );

  const cancelDownload = useCallback(() => {
    downloadAbort.current?.abort();
    downloadAbort.current = null;
    setDownload(null);
  }, []);

  const resetFonts = useCallback(() => {
    downloadAbort.current?.abort();
    downloadAbort.current = null;
    setDownload(null);
    setSettings(DEFAULT_FONT_SETTINGS);
  }, []);

  const value = useMemo<FontContextValue>(
    () => ({
      settings,
      ready,
      cachedIds,
      download,
      selectFont,
      cancelDownload,
      resetFonts,
    }),
    [
      settings,
      ready,
      cachedIds,
      download,
      selectFont,
      cancelDownload,
      resetFonts,
    ],
  );

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}

export function useFont(): FontContextValue {
  const context = useContext(FontContext);
  if (!context) {
    throw new Error("useFont must be used within FontProvider");
  }
  return context;
}
