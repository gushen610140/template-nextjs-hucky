import { i18nProvider } from "fumadocs-ui/i18n";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import { ThemeCustomizer } from "@/components/theme-customizer";
import { ThemeToggle } from "@/components/theme-toggle";
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
        themeSwitch={{ enabled: false }}
        sidebar={{
          footer: (
            <div className="flex items-center justify-end gap-1">
              <ThemeCustomizer />
              <ThemeToggle />
            </div>
          ),
        }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
