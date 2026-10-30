import { ArrowRight, Blocks, KeyRound, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

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
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href={`/${locale}`}
            className="text-lg font-bold tracking-tight text-foreground"
          >
            Hucky
          </Link>
          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a
              href="#features"
              className="transition-colors hover:text-foreground"
            >
              {t("navFeatures")}
            </a>
            <a href="#tech" className="transition-colors hover:text-foreground">
              {t("navTech")}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href={`/${locale}/login`}>{auth("loginTitle")}</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${locale}/register`}>{auth("registerTitle")}</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <Badge
          variant="outline"
          className="rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        >
          {t("heroBadge")}
        </Badge>
        <h1 className="mt-6 text-5xl font-bold tracking-tight text-foreground md:text-7xl">
          {t("heroTitle")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {t("heroSubtitle")}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="normal-case tracking-normal text-base"
          >
            <Link
              href={`/${locale}/dashboard`}
              className="flex items-center gap-2"
            >
              {t("heroCta")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover/button:translate-x-1" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="normal-case tracking-normal text-base"
          >
            <a href="#features">{t("heroSecondary")}</a>
          </Button>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto w-full max-w-6xl px-6 py-10">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          {t("featureTitle")}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {features.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="[--card-spacing:--spacing(6)]">
              <CardContent className="relative flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                  <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {title}
                  </CardTitle>
                  <CardDescription className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {desc}
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Tech stack ── */}
      <section id="tech" className="mx-auto w-full max-w-6xl px-6 py-10">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
          {t("techTitle")}
        </h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {TECH_STACK.map((tech) => (
            <Badge
              key={tech}
              variant="outline"
              className="rounded-full border-border bg-muted/50 px-5 py-2.5 text-sm text-muted-foreground"
            >
              {tech}
            </Badge>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24 text-center">
        <h2 className="text-4xl font-bold tracking-tight text-foreground">
          {t("ctaTitle")}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          {t("ctaDesc")}
        </p>
        <Button
          asChild
          size="lg"
          className="mt-10 normal-case tracking-normal text-base"
        >
          <Link
            href={`/${locale}/dashboard`}
            className="flex items-center gap-2"
          >
            {t("ctaButton")}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        {t("footerRights")}
      </footer>
    </main>
  );
}
