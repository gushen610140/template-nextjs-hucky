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
  FONT_CSS_VARIABLES,
  FONT_ROLES,
  FONT_STORAGE_KEY,
  FONT_SYSTEM_FALLBACK,
  type FontRole,
  type FontSettings,
  type FontSpec,
  getFontSpec,
  isFontSettings,
} from "@/lib/font-presets";

type FontContextValue = {
  settings: FontSettings;
  ready: boolean;
  loadingRoles: FontRole[];
  setFont: <R extends FontRole>(role: R, id: FontSettings[R]) => void;
  preloadFont: (role: FontRole, id: string) => void;
  resetFonts: () => void;
};

const FontContext = createContext<FontContextValue | null>(null);

/**
 * 已加载的字体按 family 缓存, 避免重复 add 同一个 FontFace。
 * 放在模块作用域, 因为字体注册在 document 上是全局的。
 */
const loadedFaces = new Map<string, FontFace>();
const pendingFaces = new Map<string, Promise<FontFace>>();

async function ensureFont(spec: FontSpec): Promise<FontFace> {
  const loaded = loadedFaces.get(spec.family);
  if (loaded) return loaded;

  const pending = pendingFaces.get(spec.family);
  if (pending) return pending;

  const promise = (async () => {
    const face = new FontFace(
      spec.family,
      `url("${spec.file}") format("${spec.format}")`,
      {
        weight: spec.weight,
        style: "normal",
        display: "swap",
      },
    );

    await face.load();
    document.fonts.add(face);
    loadedFaces.set(spec.family, face);
    return face;
  })();

  pendingFaces.set(spec.family, promise);

  try {
    return await promise;
  } finally {
    pendingFaces.delete(spec.family);
  }
}

export function FontProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<FontSettings>(
    DEFAULT_FONT_SETTINGS,
  );
  const [ready, setReady] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState<FontRole[]>([]);
  const applySequence = useRef(0);

  // 挂载后读取用户上次的选择, 读不到就保持系统字体。
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FONT_STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isFontSettings(parsed)) {
          setSettings(parsed);
        }
      }
    } catch {
      // 忽略损坏的存储, 回退到系统字体。
    } finally {
      setReady(true);
    }
  }, []);

  /**
   * 应用字体:
   * - system 角色直接移除 CSS 变量, 不产生网络请求;
   * - 本地字体先加载完成再写变量, 避免 font-display: swap 造成重排闪动。
   */
  const apply = useCallback(async (next: FontSettings) => {
    const sequence = ++applySequence.current;

    const specs = FONT_ROLES.map(
      (role) => [role, getFontSpec(role, next[role])] as const,
    );
    const localSpecs = specs.filter(
      (entry): entry is readonly [FontRole, FontSpec] => entry[1] !== null,
    );

    setLoadingRoles(localSpecs.map(([role]) => role));

    const resolved = await Promise.all(
      localSpecs.map(async ([role, spec]) => {
        try {
          await ensureFont(spec);
          return [role, spec] as const;
        } catch (error) {
          console.error(`Failed to load font "${spec.family}"`, error);
          return [role, null] as const;
        }
      }),
    );

    // 用户可能在加载期间又切了一次, 只保留最后一次结果。
    if (sequence !== applySequence.current) return;

    const root = document.documentElement;
    for (const role of FONT_ROLES) {
      const spec = resolved.find(([name]) => name === role)?.[1] ?? null;
      if (spec) {
        root.style.setProperty(
          FONT_CSS_VARIABLES[role],
          `"${spec.family}", ${FONT_SYSTEM_FALLBACK[role]}`,
        );
      } else {
        root.style.removeProperty(FONT_CSS_VARIABLES[role]);
      }
    }

    setLoadingRoles([]);
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

  const setFont = useCallback(
    <R extends FontRole,>(role: R, id: FontSettings[R]) => {
      setSettings((current) => ({ ...current, [role]: id }));
    },
    [],
  );

  const resetFonts = useCallback(() => {
    setSettings(DEFAULT_FONT_SETTINGS);
  }, []);

  /** 预加载: 用户 hover / focus 某个字体选项时调用, 不立即应用。 */
  const preloadFont = useCallback((role: FontRole, id: string) => {
    const spec = getFontSpec(role, id);
    if (!spec) return;

    void ensureFont(spec).catch((error) => {
      console.error(`Failed to preload font "${spec.family}"`, error);
    });
  }, []);

  const value = useMemo<FontContextValue>(
    () => ({
      settings,
      ready,
      loadingRoles,
      setFont,
      preloadFont,
      resetFonts,
    }),
    [settings, ready, loadingRoles, setFont, preloadFont, resetFonts],
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
