"use client";

import {
  Check,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Sparkles,
  Sun,
  Type,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BODY_FONT_OPTIONS,
  type BodyFontId,
  FONT_OPTIONS,
  getBodyFontId,
  getBodyFontRole,
  getBodyFontSettings,
  type HeadingFontId,
  type MonoFontId,
} from "@/lib/font-presets";
import {
  BASE_COLORS,
  type BaseColor,
  getBasePreview,
  getPrimaryPreview,
  PRIMARY_COLORS,
  type PrimaryColor,
  RADIUS_PRESETS,
  type RadiusPreset,
  SHADOW_PRESETS,
  type ShadowPreset,
} from "@/lib/theme-presets";
import { cn } from "@/lib/utils";
import { useFont } from "@/providers/font-provider";
import { useThemeCustomizer } from "@/providers/theme-customizer-provider";

const RADIUS_OPTIONS = Object.keys(RADIUS_PRESETS) as RadiusPreset[];
const SHADOW_OPTIONS = Object.keys(SHADOW_PRESETS) as ShadowPreset[];

const MODE_OPTIONS = [
  { value: "light", icon: Sun, labelKey: "light" },
  { value: "dark", icon: Moon, labelKey: "dark" },
  { value: "system", icon: Monitor, labelKey: "system" },
] as const;

export function ThemeSettings() {
  const t = useTranslations("ThemePage");
  const tTheme = useTranslations("Theme");
  const tCustomizer = useTranslations("ThemeCustomizer");
  const { theme, setTheme } = useTheme();
  const { customization, updateCustomization, resetCustomization } =
    useThemeCustomizer();
  const { settings, setFont, preloadFont, resetFonts } = useFont();

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 pt-0">
      <div className="relative overflow-hidden rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/4 size-64 rounded-full bg-[var(--chart-4)]/10 blur-3xl" />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex max-w-2xl flex-col gap-2">
              <Badge variant="outline" className="w-fit gap-1.5">
                <Sparkles className="size-3" />
                {t("badge")}
              </Badge>
              <h1 className="font-heading text-3xl font-semibold tracking-tight">
                {t("title")}
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t("description")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                resetCustomization();
                resetFonts();
              }}
            >
              <RotateCcw data-icon="inline-start" />
              {tCustomizer("reset")}
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {MODE_OPTIONS.map(({ value, icon: Icon, labelKey }) => {
              const selected = (theme ?? "system") === value;

              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-background/70 p-3 text-left transition",
                    "hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border",
                  )}
                >
                  <ModePreview mode={value} />
                  <span className="flex flex-1 flex-col">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <Icon className="size-3.5 text-muted-foreground" />
                      {tTheme(labelKey)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {t(`mode.${labelKey}`)}
                    </span>
                  </span>
                  {selected && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <SettingSection
            icon={Palette}
            title={tCustomizer("baseColor")}
            description={t("baseColorDescription")}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              {BASE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-pressed={customization.baseColor === color}
                  onClick={() =>
                    updateCustomization({ baseColor: color as BaseColor })
                  }
                  className={cn(
                    "overflow-hidden rounded-xl border text-left transition",
                    "hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    customization.baseColor === color
                      ? "border-primary ring-2 ring-primary/40"
                      : "border-border",
                  )}
                >
                  <span
                    className="block h-12 w-full"
                    style={{ backgroundColor: getBasePreview(color) }}
                  />
                  <span className="flex items-center justify-between gap-1 px-2.5 py-1.5">
                    <span className="truncate text-xs">
                      {tCustomizer(`base.${color}`)}
                    </span>
                    {customization.baseColor === color && (
                      <Check className="size-3.5 text-primary" />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </SettingSection>

          <SettingSection
            icon={Sparkles}
            title={tCustomizer("primaryColor")}
            description={t("primaryColorDescription")}
          >
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
              {PRIMARY_COLORS.map((color) => {
                const selected = customization.primaryColor === color;

                return (
                  <button
                    key={color}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      updateCustomization({
                        primaryColor: color as PrimaryColor,
                      })
                    }
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-2 transition",
                      "hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border",
                    )}
                  >
                    <span
                      className={cn(
                        "relative size-7 rounded-full shadow-sm",
                        selected &&
                          "ring-2 ring-ring ring-offset-2 ring-offset-card",
                      )}
                      style={{ backgroundColor: getPrimaryPreview(color) }}
                    >
                      {selected && (
                        <Check className="absolute inset-0 m-auto size-3.5 text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)]" />
                      )}
                    </span>
                    <span className="w-full truncate text-center text-[11px]">
                      {tCustomizer(`primary.${color}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </SettingSection>

          <div className="grid gap-4 lg:grid-cols-2">
            <SettingSection
              icon={Palette}
              title={tCustomizer("radius")}
              description={t("radiusDescription")}
            >
              <div className="grid grid-cols-3 gap-2">
                {RADIUS_OPTIONS.map((radius) => {
                  const selected = customization.radius === radius;

                  return (
                    <button
                      key={radius}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        updateCustomization({
                          radius: radius as RadiusPreset,
                        })
                      }
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border p-3 transition",
                        "hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border",
                      )}
                    >
                      <span
                        className="size-10 border-2 border-primary/40 bg-primary/10"
                        style={{ borderRadius: RADIUS_PRESETS[radius] }}
                      />
                      <span className="text-xs">
                        {tCustomizer(`radiusPresets.${radius}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </SettingSection>

            <SettingSection
              icon={Sparkles}
              title={tCustomizer("shadow")}
              description={t("shadowDescription")}
            >
              <div className="grid grid-cols-2 gap-2">
                {SHADOW_OPTIONS.map((shadow) => {
                  const selected = customization.shadow === shadow;

                  return (
                    <button
                      key={shadow}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        updateCustomization({
                          shadow: shadow as ShadowPreset,
                        })
                      }
                      className={cn(
                        "flex flex-col items-center gap-3 rounded-xl border p-3 transition",
                        "hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border",
                      )}
                    >
                      <span
                        className="flex size-12 items-center justify-center rounded-lg bg-card ring-1 ring-foreground/10"
                        style={{ boxShadow: SHADOW_PRESETS[shadow].md }}
                      >
                        <span className="size-4 rounded-sm bg-primary/30" />
                      </span>
                      <span className="text-xs">
                        {tCustomizer(`shadowPresets.${shadow}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </SettingSection>
          </div>

          <SettingSection
            icon={Type}
            title={t("typography")}
            description={t("typographyDescription")}
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-muted-foreground text-xs font-medium">
                    {tCustomizer("fonts.body")}
                  </p>
                  <span className="text-muted-foreground text-[11px]">
                    {t("bodyFontHint")}
                  </span>
                </div>
                <FontPicker
                  options={BODY_FONT_OPTIONS}
                  value={getBodyFontId(settings)}
                  label={(font) => tCustomizer(`fonts.${font}`)}
                  onSelect={(value) => {
                    const body = getBodyFontSettings(value as BodyFontId);
                    setFont("sans", body.sans);
                    setFont("cjk", body.cjk);
                  }}
                  onPreload={(value) => {
                    const font = value as BodyFontId;
                    preloadFont(getBodyFontRole(font), font);
                  }}
                  columns="grid-cols-2 sm:grid-cols-4"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground text-xs font-medium">
                    {tCustomizer("fonts.heading")}
                  </p>
                  <FontPicker
                    options={FONT_OPTIONS.heading}
                    value={settings.heading}
                    label={(font) => tCustomizer(`fonts.${font}`)}
                    onSelect={(value) =>
                      setFont("heading", value as HeadingFontId)
                    }
                    onPreload={(value) => preloadFont("heading", value)}
                    columns="grid-cols-2"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground text-xs font-medium">
                    {tCustomizer("fonts.mono")}
                  </p>
                  <FontPicker
                    options={FONT_OPTIONS.mono}
                    value={settings.mono}
                    label={(font) => tCustomizer(`fonts.${font}`)}
                    onSelect={(value) => setFont("mono", value as MonoFontId)}
                    onPreload={(value) => preloadFont("mono", value)}
                    columns="grid-cols-2"
                  />
                </div>
              </div>
            </div>
          </SettingSection>
        </div>

        <ThemePreview
          baseColor={customization.baseColor}
          primaryColor={customization.primaryColor}
          radius={customization.radius}
          shadow={customization.shadow}
        />
      </div>
    </div>
  );
}

/* ── Building blocks ───────────────────────────────────────────────────── */

function SettingSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0">
      <div className="flex items-start gap-3 px-(--card-spacing)">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="flex flex-col gap-0.5">
          <CardTitle>{title}</CardTitle>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
      </div>
      <div className="mt-4 px-(--card-spacing)">{children}</div>
    </Card>
  );
}

function ModePreview({ mode }: { mode: "light" | "dark" | "system" }) {
  const dark = mode === "dark";
  const background =
    mode === "system"
      ? "linear-gradient(135deg, #ffffff 50%, #18181b 50%)"
      : dark
        ? "#18181b"
        : "#ffffff";

  return (
    <span
      className="relative flex h-14 w-20 shrink-0 flex-col gap-1 overflow-hidden rounded-lg border p-2 shadow-inner"
      style={{ background }}
    >
      <span
        className="h-1.5 w-8 rounded-full"
        style={{ backgroundColor: dark ? "#3f3f46" : "#e4e4e7" }}
      />
      <span className="flex flex-1 gap-1">
        <span
          className="w-5 rounded-sm"
          style={{ backgroundColor: dark ? "#27272a" : "#f4f4f5" }}
        />
        <span className="flex flex-1 flex-col justify-end gap-1">
          <span
            className="h-1.5 w-full rounded-full bg-primary"
            style={{ opacity: dark ? 0.9 : 0.7 }}
          />
          <span
            className="h-1.5 w-3/4 rounded-full"
            style={{ backgroundColor: dark ? "#3f3f46" : "#e4e4e7" }}
          />
        </span>
      </span>
    </span>
  );
}

function FontPicker<T extends string>({
  options,
  value,
  label,
  onSelect,
  onPreload,
  columns,
}: {
  options: readonly T[];
  value: string;
  label: (font: T) => string;
  onSelect: (font: T) => void;
  onPreload: (font: T) => void;
  columns: string;
}) {
  return (
    <div className={cn("grid gap-2", columns)}>
      {options.map((font) => {
        const selected = value === font;

        return (
          <button
            key={font}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(font)}
            onPointerEnter={() => onPreload(font)}
            onFocus={() => onPreload(font)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition",
              "hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              selected ? "border-primary bg-primary/5" : "border-border",
            )}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="text-base leading-none">Aa 文</span>
              {selected && <Check className="size-3.5 text-primary" />}
            </span>
            <span className="w-full truncate text-muted-foreground text-xs">
              {label(font)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ThemePreview({
  baseColor,
  primaryColor,
  radius,
  shadow,
}: {
  baseColor: BaseColor;
  primaryColor: PrimaryColor;
  radius: RadiusPreset;
  shadow: ShadowPreset;
}) {
  const t = useTranslations("ThemePage");
  const tCustomizer = useTranslations("ThemeCustomizer");

  return (
    <Card className="h-fit xl:sticky xl:top-4">
      <div className="flex items-center justify-between gap-2 px-(--card-spacing)">
        <div className="flex flex-col gap-0.5">
          <CardTitle>{t("preview")}</CardTitle>
          <p className="text-muted-foreground text-xs">
            {t("previewDescription")}
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <span className="size-1.5 rounded-full bg-primary" />
          {t("livePreview")}
        </Badge>
      </div>

      <CardContent>
        <div className="overflow-hidden rounded-[var(--radius)] bg-background ring-1 ring-foreground/10">
          <div className="relative overflow-hidden bg-primary/10 p-4">
            <div className="pointer-events-none absolute -top-10 -right-8 size-32 rounded-full bg-primary/20 blur-2xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-primary">
                  {t("previewEyebrow")}
                </span>
                <span className="font-heading text-lg font-semibold">
                  {t("previewHeading")}
                </span>
                <span className="max-w-56 text-muted-foreground text-xs">
                  {t("previewBody")}
                </span>
              </div>
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                <Sparkles className="size-4" />
              </span>
            </div>
            <div className="relative mt-4 flex flex-wrap gap-2">
              <Button size="sm">{t("previewButton")}</Button>
              <Button size="sm" variant="outline">
                {t("previewSecondary")}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3">
            <div className="rounded-[var(--radius)] bg-card p-3 ring-1 ring-foreground/10">
              <span className="text-muted-foreground text-[11px]">
                {t("previewMetricOne")}
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-heading text-xl font-semibold">
                  24.8k
                </span>
                <span className="text-primary text-[11px]">+18%</span>
              </div>
              <div className="mt-2 flex h-8 items-end gap-1">
                {[38, 52, 44, 68, 58, 82, 74, 92].map((height) => (
                  <span
                    key={height}
                    className="flex-1 rounded-t-sm bg-primary/70"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-[var(--radius)] bg-card p-3 ring-1 ring-foreground/10">
              <span className="text-muted-foreground text-[11px]">
                {t("previewMetricTwo")}
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-heading text-xl font-semibold">
                  99.2%
                </span>
                <span className="text-primary text-[11px]">+0.4%</span>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <span className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <span className="block h-full w-[92%] rounded-full bg-primary" />
                </span>
                <span className="text-muted-foreground text-[10px]">
                  {t("previewUptime")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border p-3">
            <div className="flex items-center gap-2">
              <Input
                value={t("previewInput")}
                readOnly
                className="h-8 text-xs"
              />
              <Button size="icon-sm" aria-label={t("previewButton")}>
                <Sparkles />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge>{t("previewBadgePrimary")}</Badge>
              <Badge variant="secondary">{t("previewBadgeSecondary")}</Badge>
              <Badge variant="outline">{t("previewBadgeOutline")}</Badge>
            </div>
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="font-medium">{t("previewTypography")}</span>
              <span className="font-mono text-muted-foreground">
                Aa 你好 123
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <PreviewToken
            label={tCustomizer("baseColor")}
            value={tCustomizer(`base.${baseColor}`)}
          />
          <PreviewToken
            label={tCustomizer("primaryColor")}
            value={tCustomizer(`primary.${primaryColor}`)}
          />
          <PreviewToken
            label={tCustomizer("radius")}
            value={tCustomizer(`radiusPresets.${radius}`)}
          />
          <PreviewToken
            label={tCustomizer("shadow")}
            value={tCustomizer(`shadowPresets.${shadow}`)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewToken({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
