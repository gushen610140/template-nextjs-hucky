"use client";

import { usePathname } from "next/navigation";
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
import { cn } from "@/lib/utils";

type CurtainPhase = "idle" | "closing" | "closed" | "opening";

type CurtainContextValue = {
  /** Closes the curtain and resolves once it fully covers the viewport. */
  close: () => Promise<void>;
  phase: CurtainPhase;
};

const CurtainContext = createContext<CurtainContextValue | null>(null);

const CLOSE_MS = 620;
const OPEN_MS = 720;
const HOLD_MS = 120;

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Fullscreen two-panel curtain that survives client-side navigation because it
 * lives in the locale layout. The landing page closes it before pushing a new
 * route; once the pathname changes the curtain opens again on the new page.
 */
export function CurtainProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<CurtainPhase>("idle");
  const originPath = useRef<string | null>(null);
  const timers = useRef<Set<number>>(new Set());

  const later = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      callback();
    }, delay);
    timers.current.add(id);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const id of pending) window.clearTimeout(id);
      pending.clear();
    };
  }, []);

  const close = useCallback(() => {
    originPath.current = window.location.pathname;
    setPhase("closing");

    return new Promise<void>((resolve) => {
      later(
        () => {
          setPhase("closed");
          resolve();
        },
        prefersReducedMotion() ? 0 : CLOSE_MS,
      );
    });
  }, [later]);

  useEffect(() => {
    if (phase !== "closed") return;
    if (!originPath.current || pathname === originPath.current) return;

    later(() => {
      setPhase("opening");
      later(() => setPhase("idle"), prefersReducedMotion() ? 0 : OPEN_MS);
    }, HOLD_MS);
  }, [later, pathname, phase]);

  const value = useMemo<CurtainContextValue>(
    () => ({ close, phase }),
    [close, phase],
  );

  const covered = phase === "closing" || phase === "closed";

  return (
    <CurtainContext.Provider value={value}>
      {children}
      <div
        aria-hidden
        className={cn(
          "fixed inset-0 z-[200]",
          phase === "idle"
            ? "pointer-events-none invisible"
            : "pointer-events-auto",
        )}
      >
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-1/2 bg-foreground transition-transform duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none",
            covered ? "translate-y-0" : "-translate-y-full",
          )}
        />
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 h-1/2 bg-foreground transition-transform duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none",
            covered ? "translate-y-0" : "translate-y-full",
          )}
        />
      </div>
    </CurtainContext.Provider>
  );
}

export function useCurtain() {
  const context = useContext(CurtainContext);
  if (!context) {
    throw new Error("useCurtain must be used within CurtainProvider");
  }
  return context;
}
