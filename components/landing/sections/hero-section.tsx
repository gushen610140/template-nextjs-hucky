"use client";

import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

export function HeroSection() {
  const t = useTranslations("Landing");

  return (
    <section className="relative flex h-screen flex-col items-center justify-center text-center">
      <p className="hero-subtitle mt-6 max-w-md text-lg tracking-wide text-zinc-400 opacity-0">
        {t("heroSubtitle")}
      </p>
      <div className="hero-arrow absolute bottom-12 flex flex-col items-center gap-2 text-zinc-500 opacity-0">
        <span className="text-sm">{t("scrollHint")}</span>
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </div>
    </section>
  );
}
