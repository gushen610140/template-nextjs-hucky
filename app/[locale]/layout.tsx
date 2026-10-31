import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Playfair_Display } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { AuthProvider } from "@/providers/auth-provider";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CurtainProvider } from "@/providers/curtain-provider";
import { LenisProvider } from "@/providers/lenis-provider";
import { ThemeCustomizerProvider } from "@/providers/theme-customizer-provider";
import { ThemeProvider } from "@/providers/theme-provider";

/**
 * 字体分工（详见 content/docs/zh/shadcn/typography.mdx）：
 * - 拉丁字形由 next/font 在构建期下载并自托管，运行时不请求外部字体服务。
 * - 中文字形不加载 webfont，由 globals.css 里的系统字体栈接管。
 * - 这里的 variable 名必须和 globals.css 的 `--font-latin-*` 一一对应。
 */
const dmSans = DM_Sans({
  variable: "--font-latin-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-latin-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-latin-heading",
  subsets: ["latin"],
});

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
      className={cn(
        "h-full antialiased",
        // 字体变量由 next/font 注入到 <html>，font-family 本身在 globals.css 的 base 层设置
        dmSans.variable,
        geistMono.variable,
        playfairDisplay.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ThemeCustomizerProvider>
            <LenisProvider>
              <NextIntlClientProvider messages={messages}>
                <TooltipProvider>
                  <CurtainProvider>
                    <AuthProvider>{children}</AuthProvider>
                  </CurtainProvider>
                </TooltipProvider>
              </NextIntlClientProvider>
            </LenisProvider>
          </ThemeCustomizerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
