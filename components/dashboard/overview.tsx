"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Boxes,
  Database,
  FolderOpen,
  type LucideIcon,
  MessageSquare,
  Palette,
  Server,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* Content model */

const MODULES: {
  key: string;
  index: string;
  icon: LucideIcon;
  href: string;
}[] = [
  {
    key: "users",
    index: "01",
    icon: Users,
    href: "/docs/authentication",
  },
  {
    key: "files",
    index: "02",
    icon: FolderOpen,
    href: "/docs/files",
  },
  {
    key: "ai",
    index: "03",
    icon: Sparkles,
    href: "/docs/ai",
  },
  {
    key: "theme",
    index: "04",
    icon: Palette,
    href: "/docs/theme",
  },
];

const PIPELINE: { key: string; index: string; icon: LucideIcon }[] = [
  { key: "providers", index: "01", icon: Server },
  { key: "models", index: "02", icon: Boxes },
  { key: "agents", index: "03", icon: Bot },
  { key: "chat", index: "04", icon: MessageSquare },
  { key: "rag", index: "05", icon: Database },
];

const DOC_LINKS: { key: string; href: string }[] = [
  { key: "gettingStarted", href: "/docs/getting-started" },
  { key: "deployment", href: "/docs/deployment" },
  { key: "authentication", href: "/docs/authentication" },
  { key: "files", href: "/docs/files" },
  { key: "ai", href: "/docs/ai" },
  { key: "theme", href: "/docs/theme" },
  { key: "fonts", href: "/docs/fonts" },
  { key: "skills", href: "/docs/skills" },
];

const STACK: { labelKey: string; value: string }[] = [
  { labelKey: "framework", value: "Next.js 16" },
  { labelKey: "ui", value: "React 19" },
  { labelKey: "data", value: "Prisma 7" },
  { labelKey: "styling", value: "Tailwind CSS 4" },
];

/* Shared pieces */

function SectionHeading({
  index,
  label,
  title,
  description,
}: {
  index: string;
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="grid gap-4 border-t-2 border-foreground pt-4 lg:grid-cols-12 lg:gap-8">
      <div className="font-mono text-[11px] tracking-[0.24em] text-muted-foreground uppercase lg:col-span-3">
        {index} / {label}
      </div>
      <div className="lg:col-span-9">
        <h2 className="font-heading max-w-2xl text-2xl font-medium tracking-tight text-balance sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

/* Page */

export function DashboardOverview() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-14 px-4 pt-0 pb-10 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="border-b border-border pb-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.28em] text-muted-foreground uppercase">
              <span className="size-2 bg-primary" />
              {t("eyebrow")}
            </div>
            <h1 className="font-heading mt-6 max-w-3xl text-4xl leading-[1.05] font-medium tracking-tight text-balance sm:text-5xl xl:text-6xl">
              {t("title")}
            </h1>
          </div>

          <div className="flex flex-col justify-between gap-8 border-border lg:col-span-5 lg:border-l lg:pl-8">
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              {t("description")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link href={`/${locale}/docs`}>
                  {t("docsCta")}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Badge
                variant="outline"
                className="h-6 font-mono text-[10px] tracking-[0.18em] uppercase"
              >
                {t("versionLabel")}
              </Badge>
            </div>
          </div>
        </div>

        <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border shadow-xs ring-1 ring-foreground/10 sm:grid-cols-4">
          {STACK.map((item) => (
            <div key={item.labelKey} className="bg-card p-4">
              <dt className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                {t(`stack.${item.labelKey}`)}
              </dt>
              <dd className="font-heading mt-1 text-lg tracking-tight">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Modules */}
      <section className="flex flex-col gap-8">
        <SectionHeading
          index="01"
          label={t("modules.label")}
          title={t("modules.title")}
          description={t("modules.description")}
        />

        <div className="grid gap-px overflow-hidden rounded-xl bg-border shadow-xs ring-1 ring-foreground/10 sm:grid-cols-2">
          {MODULES.map((module) => {
            const Icon = module.icon;
            const points = t.raw(`modules.${module.key}.points`) as string[];

            return (
              <Link
                key={module.key}
                href={`/${locale}${module.href}`}
                className="group flex flex-col bg-card p-6 transition-colors hover:bg-muted/40 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none lg:p-8"
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[11px] tracking-[0.24em] text-muted-foreground">
                    {module.index}
                  </span>
                  <Icon
                    className="size-5 text-primary"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>

                <h3 className="font-heading mt-12 text-2xl font-medium tracking-tight">
                  {t(`modules.${module.key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`modules.${module.key}.lead`)}
                </p>

                <ul className="mt-6 space-y-2.5">
                  {points.map((point) => (
                    <li key={point} className="flex gap-3 text-sm">
                      <span className="mt-2.5 h-px w-4 shrink-0 bg-primary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                <span className="mt-8 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.2em] uppercase">
                  {t("modules.readMore")}
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* AI pipeline */}
      <section className="flex flex-col gap-8">
        <SectionHeading
          index="02"
          label={t("pipeline.label")}
          title={t("pipeline.title")}
          description={t("pipeline.description")}
        />

        <div className="grid gap-px overflow-hidden rounded-xl bg-border shadow-xs ring-1 ring-foreground/10 sm:grid-cols-2 lg:grid-cols-5">
          {PIPELINE.map((step) => {
            const Icon = step.icon;

            return (
              <div key={step.key} className="bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] tracking-[0.24em] text-muted-foreground">
                    {step.index}
                  </span>
                  <Icon
                    className="size-4 text-primary"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="font-heading mt-8 text-lg font-medium tracking-tight">
                  {t(`pipeline.${step.key}.title`)}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t(`pipeline.${step.key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Documentation */}
      <section className="flex flex-col gap-8">
        <SectionHeading
          index="03"
          label={t("docs.label")}
          title={t("docs.title")}
          description={t("docs.description")}
        />

        <div className="grid gap-px overflow-hidden rounded-xl bg-border shadow-xs ring-1 ring-foreground/10 sm:grid-cols-2 lg:grid-cols-4">
          {DOC_LINKS.map((item) => (
            <Link
              key={item.key}
              href={`/${locale}${item.href}`}
              className="group flex items-center justify-between gap-3 bg-card px-5 py-4 text-sm transition-colors hover:bg-muted/40 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span>{t(`docs.items.${item.key}`)}</span>
              <ArrowUpRight className="size-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            {t("docs.footnote")}
          </p>
          <Button asChild variant="outline">
            <Link href={`/${locale}/docs`}>
              {t("docs.open")}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
