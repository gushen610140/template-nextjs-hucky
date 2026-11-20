"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { FontCacheIcon } from "@/components/font-cache-icon";
import { FontDownloadDialog } from "@/components/font-download-dialog";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FONT_OPTIONS, type FontOption } from "@/lib/font-presets";
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

export function ThemeCustomizerControls({ className }: { className?: string }) {
  const t = useTranslations("ThemeCustomizer");
  const { customization, updateCustomization, resetCustomization } =
    useThemeCustomizer();
  const { settings, selectFont, resetFonts } = useFont();

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{t("title")}</span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => {
            resetCustomization();
            resetFonts();
          }}
        >
          <RotateCcw data-icon="inline-start" />
          {t("reset")}
        </Button>
      </div>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {t("baseColor")}
        </p>
        <ToggleGroup
          type="single"
          value={customization.baseColor}
          onValueChange={(value) => {
            if (value) {
              updateCustomization({ baseColor: value as BaseColor });
            }
          }}
          spacing={2}
          className="flex flex-wrap gap-1.5"
        >
          {BASE_COLORS.map((color) => (
            <ToggleGroupItem
              key={color}
              value={color}
              aria-label={t(`base.${color}`)}
              title={t(`base.${color}`)}
              className="size-7 min-w-7 rounded-full border border-border/70 p-0 shadow-none transition-transform hover:scale-110 data-[state=on]:ring-2 data-[state=on]:ring-ring data-[state=on]:ring-offset-2 data-[state=on]:ring-offset-popover"
              style={{ backgroundColor: getBasePreview(color) }}
            />
          ))}
        </ToggleGroup>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {t("primaryColor")}
        </p>
        <ToggleGroup
          type="single"
          value={customization.primaryColor}
          onValueChange={(value) => {
            if (value) {
              updateCustomization({ primaryColor: value as PrimaryColor });
            }
          }}
          spacing={2}
          className="flex flex-wrap gap-1.5"
        >
          {PRIMARY_COLORS.map((color) => (
            <ToggleGroupItem
              key={color}
              value={color}
              aria-label={t(`primary.${color}`)}
              title={t(`primary.${color}`)}
              className="size-7 min-w-7 rounded-full border border-border/70 p-0 shadow-none transition-transform hover:scale-110 data-[state=on]:ring-2 data-[state=on]:ring-ring data-[state=on]:ring-offset-2 data-[state=on]:ring-offset-popover"
              style={{ backgroundColor: getPrimaryPreview(color) }}
            />
          ))}
        </ToggleGroup>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {t("radius")}
        </p>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={customization.radius}
          onValueChange={(value) => {
            if (value) {
              updateCustomization({ radius: value as RadiusPreset });
            }
          }}
          className="grid w-full grid-cols-3 gap-1.5"
        >
          {RADIUS_OPTIONS.map((radius) => (
            <ToggleGroupItem
              key={radius}
              value={radius}
              className="h-auto w-full px-2 py-1.5 text-xs font-normal tracking-normal normal-case data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            >
              {t(`radiusPresets.${radius}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {t("shadow")}
        </p>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={customization.shadow}
          onValueChange={(value) => {
            if (value) {
              updateCustomization({ shadow: value as ShadowPreset });
            }
          }}
          className="grid w-full grid-cols-4 gap-1.5"
        >
          {SHADOW_OPTIONS.map((shadow) => (
            <ToggleGroupItem
              key={shadow}
              value={shadow}
              className="h-auto w-full px-2 py-1.5 text-xs font-normal tracking-normal normal-case data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            >
              {t(`shadowPresets.${shadow}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {t("fonts.body")}
        </p>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={settings.sans}
          onValueChange={(value) => {
            if (value) selectFont("sans", value as FontOption<"sans">);
          }}
          className="grid w-full grid-cols-2 gap-1.5"
        >
          {FONT_OPTIONS.sans.map((font) => (
            <FontToggleItem key={font} font={font} />
          ))}
        </ToggleGroup>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {t("fonts.heading")}
        </p>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={settings.heading}
          onValueChange={(value) => {
            if (value) selectFont("heading", value as FontOption<"heading">);
          }}
          className="grid w-full grid-cols-2 gap-1.5"
        >
          {FONT_OPTIONS.heading.map((font) => (
            <FontToggleItem key={font} font={font} />
          ))}
        </ToggleGroup>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          {t("fonts.mono")}
        </p>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={settings.mono}
          onValueChange={(value) => {
            if (value) selectFont("mono", value as FontOption<"mono">);
          }}
          className="grid w-full grid-cols-2 gap-1.5"
        >
          {FONT_OPTIONS.mono.map((font) => (
            <FontToggleItem key={font} font={font} />
          ))}
        </ToggleGroup>
      </section>

      <FontDownloadDialog />
    </div>
  );
}

function FontToggleItem({ font }: { font: string }) {
  const t = useTranslations("ThemeCustomizer");

  return (
    <ToggleGroupItem
      value={font}
      className="h-auto w-full gap-1 px-2 py-1.5 text-xs font-normal tracking-normal normal-case data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
    >
      {font === "system" ? null : <FontCacheIcon id={font} />}
      <span className="truncate">{t(`fonts.${font}`)}</span>
    </ToggleGroupItem>
  );
}
