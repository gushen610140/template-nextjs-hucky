"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // next-themes injects an inline <script> to apply the theme before paint.
  // Because the root layout lives under a dynamic segment ([locale]), switching
  // the locale remounts this component on the client, where React 19 warns
  // about client-rendered <script> tags. Mark the client copy as a data block
  // so React leaves it alone; the server copy still runs and prevents the
  // flash of the wrong theme.
  // https://github.com/pacocoursey/next-themes/issues/397
  const scriptType =
    typeof window === "undefined" ? "text/javascript" : "application/json";

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      scriptProps={{ type: scriptType }}
    >
      {children}
    </NextThemesProvider>
  );
}
