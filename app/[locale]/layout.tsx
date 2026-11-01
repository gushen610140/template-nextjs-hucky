import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { AuthProvider } from "@/providers/auth-provider";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurtainProvider } from "@/providers/curtain-provider";
import { FontProvider } from "@/providers/font-provider";
import { LenisProvider } from "@/providers/lenis-provider";
import { ThemeCustomizerProvider } from "@/providers/theme-customizer-provider";
import { ThemeProvider } from "@/providers/theme-provider";

/**
 * 字体分工（详见 content/docs/zh/shadcn/typography.mdx）：
 * - 默认使用系统字体栈，不加载任何 webfont。
 * - 用户可在主题面板切换拉丁字体，FontProvider 按需加载 public/fonts 下的文件。
 * - 中文字形始终由 globals.css 里的系统字体栈接管。
 */

export const metadata: Metadata = {
  title: "Hucky NextJS Template",
  description: "Build Your NextJS App with Hucky",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ThemeCustomizerProvider>
            <FontProvider>
              <LenisProvider>
                <NextIntlClientProvider messages={messages}>
                  <TooltipProvider>
                    <CurtainProvider>
                      <AuthProvider>{children}</AuthProvider>
                    </CurtainProvider>
                  </TooltipProvider>
                </NextIntlClientProvider>
              </LenisProvider>
            </FontProvider>
          </ThemeCustomizerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
