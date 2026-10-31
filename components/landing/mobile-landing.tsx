"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function MobileLanding() {
  const locale = useLocale();
  const t = useTranslations("Landing");

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background px-6 py-8 text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full border border-border"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 -right-10 h-px w-72 bg-border"
      />

      <header className="relative flex items-center justify-between">
        <span className="text-sm font-semibold tracking-tight">Hucky</span>
        <ThemeToggle />
      </header>

      <main className="relative flex flex-1 flex-col justify-center py-16">
        <p className="text-[10px] tracking-[0.5em] text-muted-foreground uppercase">
          Space 01
        </p>
        <h1 className="mt-5 font-heading text-6xl leading-none tracking-tight">
          {t("mobileTitle")}
        </h1>
        <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {t("mobileSubtitle")}
        </p>
        <Button
          asChild
          size="lg"
          className="mt-10 w-fit bg-foreground text-background hover:bg-foreground/90"
        >
          <Link href={`/${locale}/dashboard`}>{t("enterDashboard")}</Link>
        </Button>
        <Link
          href={`/${locale}/login`}
          className="mt-5 w-fit text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
        >
          {t("loginLink")}
        </Link>
      </main>

      <footer className="relative flex items-center justify-between text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
        <span>Hucky</span>
        <span>Desktop experience</span>
      </footer>
    </div>
  );
}
