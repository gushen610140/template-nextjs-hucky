"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { routing } from "@/i18n/routing";

/**
 * Applies Lenis smooth scrolling to the window.
 * Mount once per page that should scroll smoothly.
 *
 * Docs pages opt out: Lenis intercepts wheel scrolling and fights with
 * anchor/TOC navigation inside the documentation layout.
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDocsPage = routing.locales.some((locale) =>
    pathname.startsWith(`/${locale}/docs`),
  );

  useEffect(() => {
    if (isDocsPage) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      touchMultiplier: 1.5,
    });

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [isDocsPage]);

  return <>{children}</>;
}
