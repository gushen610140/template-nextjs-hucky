"use client";

import { useTranslations } from "next-intl";

const TECH_STACK = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "Tailwind CSS v4",
  "Three.js",
  "shadcn/ui",
  "Clerk Auth",
  "next-intl",
];

export function TechSection() {
  const t = useTranslations("Landing");

  return (
    <section className="relative flex h-screen flex-col items-center justify-center text-center">
      <h2 className="tech-title mb-8 text-3xl font-bold tracking-tight text-zinc-100 opacity-0">
        {t("techTitle")}
      </h2>
      <div className="flex flex-wrap justify-center gap-3 px-8">
        {TECH_STACK.map((tech, i) => (
          <span
            key={tech}
            className={`tech-tag tech-tag-${i} rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 backdrop-blur-sm opacity-0`}
          >
            {tech}
          </span>
        ))}
      </div>
    </section>
  );
}
