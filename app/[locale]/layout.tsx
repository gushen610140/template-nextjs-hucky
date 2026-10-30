import type { Metadata } from "next";
import { DM_Sans, Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { AuthProvider } from "@/providers/auth-provider";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LenisProvider } from "@/providers/lenis-provider";
import { ThemeCustomizerProvider } from "@/providers/theme-customizer-provider";
import { ThemeProvider } from "@/providers/theme-provider";

const playfairDisplayHeading = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
});

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        dmSans.variable,
        playfairDisplayHeading.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ThemeCustomizerProvider>
            <LenisProvider>
              <NextIntlClientProvider messages={messages}>
                <TooltipProvider>
                  <AuthProvider>{children}</AuthProvider>
                </TooltipProvider>
              </NextIntlClientProvider>
            </LenisProvider>
          </ThemeCustomizerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
