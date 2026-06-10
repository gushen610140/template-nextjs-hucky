"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  const t = useTranslations("Landing");

  return (
    <section className="relative flex h-screen flex-col items-center justify-center text-center">
      <h2 className="cta-title text-5xl font-bold tracking-tight text-zinc-100 opacity-0">
        {t("ctaTitle")}
      </h2>
      <p className="cta-desc mt-4 max-w-md text-lg text-zinc-400 opacity-0">
        {t("ctaDesc")}
      </p>
      <a
        href="/dashboard"
        className="cta-button group mt-10 flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-4 text-lg font-semibold text-black transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25 opacity-0"
      >
        {t("ctaButton")}
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </a>
    </section>
  );
}
