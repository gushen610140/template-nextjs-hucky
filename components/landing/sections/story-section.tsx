"use client";

import { useTranslations } from "next-intl";

export function StorySection() {
  const t = useTranslations("Landing");

  return (
    <section className="relative flex h-screen items-center">
      <div className="max-w-lg pl-8 lg:pl-16">
        <h2 className="story-title text-4xl font-bold tracking-tight text-zinc-100 opacity-0">
          {t("storyTitle")}
        </h2>
        <p className="story-desc mt-4 text-lg leading-relaxed text-zinc-400 opacity-0">
          {t("storyDesc")}
        </p>
        <div className="story-divider mt-8 h-px w-24 bg-emerald-500/50 opacity-0" />
      </div>
    </section>
  );
}
