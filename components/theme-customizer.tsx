"use client";

import { Palette, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BASE_COLORS,
  getBasePreview,
  getPrimaryPreview,
  PRIMARY_COLORS,
  RADIUS_PRESETS,
  type RadiusPreset,
  SHADOW_PRESETS,
  type ShadowPreset,
} from "@/lib/theme-presets";
import { cn } from "@/lib/utils";
import { useThemeCustomizer } from "@/providers/theme-customizer-provider";

const RADIUS_OPTIONS = Object.keys(RADIUS_PRESETS) as RadiusPreset[];
const SHADOW_OPTIONS = Object.keys(SHADOW_PRESETS) as ShadowPreset[];

export function ThemeCustomizer() {
  const t = useTranslations("ThemeCustomizer");
  const { customization, updateCustomization, resetCustomization } =
    useThemeCustomizer();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("open")}
          title={t("open")}
        >
          <Palette className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">{t("title")}</span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={resetCustomization}
            >
              <RotateCcw className="size-3" />
              {t("reset")}
            </Button>
          </div>

          <section className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t("baseColor")}
            </p>
            <div className="flex flex-wrap gap-2">
              {BASE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={t(`base.${color}`)}
                  title={t(`base.${color}`)}
                  onClick={() => updateCustomization({ baseColor: color })}
                  className={cn(
                    "size-7 rounded-full border border-border/70 transition-transform hover:scale-110",
                    customization.baseColor === color &&
                      "ring-2 ring-ring ring-offset-2 ring-offset-popover",
                  )}
                  style={{ backgroundColor: getBasePreview(color) }}
                />
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t("primaryColor")}
            </p>
            <div className="flex flex-wrap gap-2">
              {PRIMARY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={t(`primary.${color}`)}
                  title={t(`primary.${color}`)}
                  onClick={() => updateCustomization({ primaryColor: color })}
                  className={cn(
                    "size-7 rounded-full border border-border/70 transition-transform hover:scale-110",
                    customization.primaryColor === color &&
                      "ring-2 ring-ring ring-offset-2 ring-offset-popover",
                  )}
                  style={{ backgroundColor: getPrimaryPreview(color) }}
                />
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t("radius")}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {RADIUS_OPTIONS.map((radius) => (
                <button
                  key={radius}
                  type="button"
                  onClick={() => updateCustomization({ radius })}
                  className={cn(
                    "border border-border px-2 py-1.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                    customization.radius === radius &&
                      "border-primary bg-accent text-accent-foreground",
                  )}
                >
                  {t(`radiusPresets.${radius}`)}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t("shadow")}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {SHADOW_OPTIONS.map((shadow) => (
                <button
                  key={shadow}
                  type="button"
                  onClick={() => updateCustomization({ shadow })}
                  className={cn(
                    "border border-border px-2 py-1.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                    customization.shadow === shadow &&
                      "border-primary bg-accent text-accent-foreground",
                  )}
                >
                  {t(`shadowPresets.${shadow}`)}
                </button>
              ))}
            </div>
          </section>
        </div>
      </PopoverContent>
    </Popover>
  );
}
