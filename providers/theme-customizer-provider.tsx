"use client";

import { useTheme } from "next-themes";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BASE_COLORS,
  DEFAULT_THEME_CUSTOMIZATION,
  getThemeVariables,
  PRIMARY_COLORS,
  RADIUS_PRESETS,
  SHADOW_PRESETS,
  THEME_CUSTOMIZATION_STORAGE_KEY,
  type ThemeCustomization,
} from "@/lib/theme-presets";

type ThemeCustomizerContextValue = {
  customization: ThemeCustomization;
  setCustomization: (value: ThemeCustomization) => void;
  updateCustomization: (value: Partial<ThemeCustomization>) => void;
  resetCustomization: () => void;
};

const ThemeCustomizerContext =
  createContext<ThemeCustomizerContextValue | null>(null);

function isThemeCustomization(value: unknown): value is ThemeCustomization {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ThemeCustomization>;

  return (
    BASE_COLORS.includes(candidate.baseColor as never) &&
    PRIMARY_COLORS.includes(candidate.primaryColor as never) &&
    candidate.radius !== undefined &&
    candidate.radius in RADIUS_PRESETS &&
    candidate.shadow !== undefined &&
    candidate.shadow in SHADOW_PRESETS
  );
}

export function ThemeCustomizerProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [customization, setCustomizationState] = useState<ThemeCustomization>(
    DEFAULT_THEME_CUSTOMIZATION,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        THEME_CUSTOMIZATION_STORAGE_KEY,
      );
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isThemeCustomization(parsed)) {
          setCustomizationState(parsed);
        }
      }
    } catch {
      // Ignore malformed storage and keep the defaults.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;

    const mode = resolvedTheme === "dark" ? "dark" : "light";
    const root = document.documentElement;
    const variables = getThemeVariables(customization, mode);

    for (const [name, value] of Object.entries(variables)) {
      root.style.setProperty(name, value);
    }

    window.localStorage.setItem(
      THEME_CUSTOMIZATION_STORAGE_KEY,
      JSON.stringify(customization),
    );
  }, [customization, ready, resolvedTheme]);

  const setCustomization = useCallback((value: ThemeCustomization) => {
    setCustomizationState(value);
  }, []);

  const updateCustomization = useCallback(
    (value: Partial<ThemeCustomization>) => {
      setCustomizationState((current) => ({ ...current, ...value }));
    },
    [],
  );

  const resetCustomization = useCallback(() => {
    setCustomizationState(DEFAULT_THEME_CUSTOMIZATION);
  }, []);

  const value = useMemo<ThemeCustomizerContextValue>(
    () => ({
      customization,
      setCustomization,
      updateCustomization,
      resetCustomization,
    }),
    [customization, resetCustomization, setCustomization, updateCustomization],
  );

  return (
    <ThemeCustomizerContext.Provider value={value}>
      {children}
    </ThemeCustomizerContext.Provider>
  );
}

export function useThemeCustomizer(): ThemeCustomizerContextValue {
  const context = useContext(ThemeCustomizerContext);
  if (!context) {
    throw new Error(
      "useThemeCustomizer must be used within ThemeCustomizerProvider",
    );
  }
  return context;
}
