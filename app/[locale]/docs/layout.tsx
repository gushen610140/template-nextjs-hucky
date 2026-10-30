import { i18nProvider } from "fumadocs-ui/i18n";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { CSSProperties } from "react";
import { DocsHeader } from "@/components/docs-header";
import { baseOptions, translations } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <RootProvider
      theme={{ enabled: false }}
      i18n={i18nProvider(translations, locale)}
    >
      <DocsLayout
        tree={source.getPageTree(locale)}
        {...baseOptions(locale)}
        slots={{ header: DocsHeader, languageSelect: false }}
        themeSwitch={{ enabled: false }}
        containerProps={{
          style: {
            "--fd-header-height": "3.5rem",
            gridTemplate: `"sidebar sidebar header header header"
"sidebar sidebar toc-popover toc toc"
"sidebar sidebar tabs toc toc"
"sidebar sidebar main toc toc" 1fr / minmax(min-content, 1fr) var(--fd-sidebar-col) minmax(0, calc(var(--fd-layout-width,97rem) - var(--fd-sidebar-width) - var(--fd-toc-width))) var(--fd-toc-width) minmax(min-content, 1fr)`,
          } as CSSProperties,
        }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
