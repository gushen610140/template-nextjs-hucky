"use client";

import { Shield, Sparkles, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

const FEATURES = [
  { icon: Zap, titleKey: "feature1Title", descKey: "feature1Desc" },
  { icon: Shield, titleKey: "feature2Title", descKey: "feature2Desc" },
  { icon: Sparkles, titleKey: "feature3Title", descKey: "feature3Desc" },
];

export function FeaturesSection() {
  const t = useTranslations("Landing");

  return (
    <section className="relative flex h-screen items-center">
      <div className="ml-auto flex w-full max-w-md flex-col gap-6 pr-8 lg:pr-16">
        {FEATURES.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.titleKey}
              className={`feature-card feature-card-${i} flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm opacity-0 translate-y-8`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                <Icon className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">
                  {t(feature.titleKey)}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  {t(feature.descKey)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
