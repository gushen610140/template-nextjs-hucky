// biome-ignore-all lint/security/noDangerouslySetInnerHtml: Mermaid renders trusted static documentation diagrams
"use client";

import { use, useId, useSyncExternalStore } from "react";

const cache = new Map<string, Promise<unknown>>();

function cachePromise<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached) return cached as Promise<T>;

  const promise = factory();
  cache.set(key, promise);
  return promise;
}

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function MermaidContent({ chart }: { chart: string }) {
  const id = useId();
  const theme: "dark" | "default" = useSyncExternalStore(
    subscribeTheme,
    () =>
      document.documentElement.classList.contains("dark") ? "dark" : "default",
    () => "default",
  );
  const { default: mermaid } = use(
    cachePromise("mermaid", () => import("mermaid")),
  );

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    fontFamily: "inherit",
    themeCSS: "margin: 1.5rem auto 0;",
    theme,
  });

  const { svg, bindFunctions } = use(
    cachePromise(`${chart}-${theme}`, () =>
      mermaid.render(id, chart.replaceAll("\\n", "\n")),
    ),
  );

  return (
    <div
      className="my-6 overflow-x-auto"
      ref={(container) => {
        if (container) bindFunctions?.(container);
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function Mermaid({ chart }: { chart: string }) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isClient) return null;
  return <MermaidContent chart={chart} />;
}
