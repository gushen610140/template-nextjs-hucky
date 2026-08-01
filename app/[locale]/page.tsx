import { ArrowRight, Blocks, KeyRound, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

const TECH_STACK = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "Tailwind CSS v4",
  "Prisma + PostgreSQL",
  "shadcn/ui",
  "next-intl",
];

export default async function Home() {
  const locale = await getLocale();
  const t = await getTranslations("Landing");
  const auth = await getTranslations("Auth");

  const features = [
    { icon: Zap, title: t("feature1Title"), desc: t("feature1Desc") },
    { icon: ShieldCheck, title: t("feature2Title"), desc: t("feature2Desc") },
    { icon: KeyRound, title: t("feature3Title"), desc: t("feature3Desc") },
    { icon: Blocks, title: t("feature4Title"), desc: t("feature4Desc") },
  ];

  return (
    <main className="flex min-h-screen flex-col">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href={`/${locale}`}
            className="text-lg font-bold tracking-tight text-zinc-100"
          >
            Hucky
          </Link>
          <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <a
              href="#features"
              className="transition-colors hover:text-zinc-100"
            >
              {t("navFeatures")}
            </a>
            <a href="#tech" className="transition-colors hover:text-zinc-100">
              {t("navTech")}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/login`}
              className="px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-100"
            >
              {auth("loginTitle")}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
            >
              {auth("registerTitle")}
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-24 text-center md:py-32">
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium tracking-wide text-emerald-400">
          {t("heroBadge")}
        </span>
        <h1 className="mt-6 text-5xl font-bold tracking-tight text-zinc-100 md:text-7xl">
          {t("heroTitle")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
          {t("heroSubtitle")}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={`/${locale}/dashboard`}
            className="group flex items-center gap-2 rounded-full bg-emerald-500 px-7 py-3.5 text-base font-semibold text-black transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25"
          >
            {t("heroCta")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#features"
            className="rounded-full border border-white/15 px-7 py-3.5 text-base font-medium text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/5"
          >
            {t("heroSecondary")}
          </a>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto w-full max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-100">
          {t("featureTitle")}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-white/20"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                <Icon className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tech stack ── */}
      <section id="tech" className="mx-auto w-full max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight text-zinc-100">
          {t("techTitle")}
        </h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {TECH_STACK.map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-zinc-300"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24 text-center">
        <h2 className="text-4xl font-bold tracking-tight text-zinc-100">
          {t("ctaTitle")}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
          {t("ctaDesc")}
        </p>
        <Link
          href={`/${locale}/dashboard`}
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-4 text-lg font-semibold text-black transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25"
        >
          {t("ctaButton")}
          <ArrowRight className="h-5 w-5" />
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-zinc-500">
        {t("footerRights")}
      </footer>
    </main>
  );
}
