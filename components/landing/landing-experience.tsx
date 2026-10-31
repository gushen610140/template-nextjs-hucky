"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { LandingHud, LandingIntro } from "@/components/landing/hud";
import { LandingLoader } from "@/components/landing/landing-loader";
import { MobileLanding } from "@/components/landing/mobile-landing";
import type { HoverInfo } from "@/components/landing/scene/interaction";
import { SettingsDialog } from "@/components/landing/settings-dialog";
import type { LandingControls, LandingMode } from "@/components/landing/types";
import { routing } from "@/i18n/routing";
import { useCurtain } from "@/providers/curtain-provider";

const SceneCanvas = dynamic(
  () => import("@/components/landing/scene/scene-canvas"),
  {
    ssr: false,
    loading: () => null,
  },
);

type Device = "pending" | "desktop" | "mobile" | "unsupported";

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") || canvas.getContext("webgl");

    if (!context) return false;

    // Release the probe context so it does not count against the browser limit.
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function LandingExperience() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { close } = useCurtain();

  const [device, setDevice] = useState<Device>("pending");
  const [mode, setModeState] = useState<LandingMode>("intro");
  const [hover, setHover] = useState<HoverInfo>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const [progress, setProgress] = useState(8);
  const [showLoader, setShowLoader] = useState(true);

  const modeRef = useRef<LandingMode>("intro");
  const controlsRef = useRef<LandingControls | null>(null);

  const setMode = useCallback((next: LandingMode) => {
    modeRef.current = next;
    setModeState(next);
  }, []);

  const handleControls = useCallback((controls: LandingControls | null) => {
    controlsRef.current = controls;
  }, []);

  const resume = useCallback(() => {
    controlsRef.current?.lock();
  }, []);

  const handleLock = useCallback(() => {
    if (modeRef.current === "panel" || modeRef.current === "leaving") return;
    setMode("explore");
  }, [setMode]);

  const handleUnlock = useCallback(() => {
    if (modeRef.current === "explore") setMode("paused");
  }, [setMode]);

  const openPanel = useCallback(() => {
    if (modeRef.current !== "explore") return;
    setMode("panel");
    controlsRef.current?.unlock();
  }, [setMode]);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      if (modeRef.current !== "panel") return;

      // Closing the panel (X, backdrop, or Esc) goes straight back into the
      // room. The close interaction usually carries user activation, so the
      // pointer lock request can be made immediately instead of asking again.
      setMode("explore");
      controlsRef.current?.lock();
    },
    [setMode],
  );

  const navigate = useCallback(
    async (path: string, delay = 0) => {
      if (modeRef.current === "leaving") return;

      setMode("leaving");
      controlsRef.current?.unlock();
      router.prefetch(path);

      if (delay > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, delay));
      }

      await close();
      router.push(path);
    },
    [close, router, setMode],
  );

  const enterDoor = useCallback(async () => {
    setDoorOpen(true);
    await navigate(`/${locale}/dashboard`, 900);
  }, [locale, navigate]);

  const goLogin = useCallback(() => {
    if (modeRef.current === "leaving") return;

    // The login pillar is a direct shortcut, so skip the curtain transition.
    setMode("leaving");
    controlsRef.current?.unlock();

    const target = `/${locale}/login`;
    router.prefetch(target);
    router.push(target);
  }, [locale, router, setMode]);

  const skip = useCallback(() => {
    void navigate(`/${locale}/dashboard`);
  }, [locale, navigate]);

  const switchLocale = useCallback(
    async (nextLocale: string) => {
      if (nextLocale === locale) return;

      const nextPath = pathname.replace(
        new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`),
        `/${nextLocale}`,
      );

      if (modeRef.current === "panel") setMode("leaving");
      controlsRef.current?.unlock();
      router.prefetch(nextPath);
      await close();
      router.push(nextPath);
    },
    [close, locale, pathname, router, setMode],
  );

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  /**
   * PointerLockControls locks on any click inside #landing-surface. A click that
   * just opened a panel or the door must not immediately grab the cursor again,
   * so swallow that one click in the capture phase.
   */
  useEffect(() => {
    const swallowClick = (event: MouseEvent) => {
      if (modeRef.current !== "panel" && modeRef.current !== "leaving") return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("#landing-surface")) return;

      event.stopPropagation();
      event.preventDefault();
    };

    document.addEventListener("click", swallowClick, true);
    return () => document.removeEventListener("click", swallowClick, true);
  }, []);

  // If a resume attempt is rejected (for example when Esc closed the panel and
  // the browser withholds user activation), fall back to the resumed overlay.
  useEffect(() => {
    const onPointerLockError = () => {
      if (modeRef.current === "explore" && !document.pointerLockElement) {
        setMode("paused");
      }
    };

    document.addEventListener("pointerlockerror", onPointerLockError);
    return () =>
      document.removeEventListener("pointerlockerror", onPointerLockError);
  }, [setMode]);

  useEffect(() => {
    const coarse = window.matchMedia("(hover: none) and (pointer: coarse)");
    const mobile = coarse.matches || window.innerWidth < 768;

    if (mobile) {
      setDevice("mobile");
      return;
    }

    setDevice(supportsWebGL() ? "desktop" : "unsupported");
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setMinElapsed(true), 900);
    return () => window.clearTimeout(timeout);
  }, []);

  // Never trap the visitor behind the loader if WebGL fails after the probe.
  useEffect(() => {
    if (device !== "desktop" || sceneReady) return;

    const timeout = window.setTimeout(() => {
      setDevice((current) => (current === "desktop" ? "unsupported" : current));
    }, 10_000);

    return () => window.clearTimeout(timeout);
  }, [device, sceneReady]);

  const ready =
    device !== "pending" &&
    (device === "desktop" ? sceneReady : true) &&
    minElapsed;

  useEffect(() => {
    if (ready) {
      setProgress(100);
      const timeout = window.setTimeout(() => setShowLoader(false), 900);
      return () => window.clearTimeout(timeout);
    }

    const interval = window.setInterval(() => {
      setProgress((current) =>
        current >= 92
          ? current
          : Math.min(92, current + Math.max(1, (92 - current) * 0.08)),
      );
    }, 140);

    return () => window.clearInterval(interval);
  }, [ready]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-background text-foreground select-none">
      {device === "desktop" && (
        <>
          <div id="landing-surface" className="absolute inset-0">
            <SceneCanvas
              isDark={resolvedTheme === "dark"}
              enabled={mode === "explore"}
              doorOpen={doorOpen}
              onHover={setHover}
              onOpenPanel={openPanel}
              onLogin={goLogin}
              onEnterDoor={enterDoor}
              onLock={handleLock}
              onUnlock={handleUnlock}
              onControls={handleControls}
              onReady={handleSceneReady}
            />
          </div>

          <LandingHud mode={mode} hover={hover} />

          {(mode === "intro" || mode === "paused") && (
            <LandingIntro variant={mode} onEnter={resume} onSkip={skip} />
          )}

          <SettingsDialog
            open={mode === "panel"}
            onOpenChange={handleDialogOpenChange}
            locale={locale}
            onLocaleChange={switchLocale}
          />
        </>
      )}

      {(device === "mobile" || device === "unsupported") && <MobileLanding />}

      {showLoader && <LandingLoader progress={progress} done={ready} />}
    </main>
  );
}
