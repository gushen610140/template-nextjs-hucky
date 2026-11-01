"use client";

import {
  Check,
  Languages,
  Monitor,
  Moon,
  Palette,
  Settings2,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { routing } from "@/i18n/routing";
import {
  BASE_COLORS,
  type BaseColor,
  getBasePreview,
  getPrimaryPreview,
  PRIMARY_COLORS,
  type PrimaryColor,
} from "@/lib/theme-presets";
import { cn } from "@/lib/utils";
import { useThemeCustomizer } from "@/providers/theme-customizer-provider";

const LANGUAGE_LABELS: Record<string, string> = {
  zh: "简体中文",
  en: "English",
};

const APPEARANCE_OPTIONS = [
  { value: "light", icon: Sun, labelKey: "light" },
  { value: "dark", icon: Moon, labelKey: "dark" },
  { value: "system", icon: Monitor, labelKey: "system" },
] as const;

export function UserSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("UserSettings");
  const tTheme = useTranslations("Theme");
  const tCustomizer = useTranslations("ThemeCustomizer");
  const { theme, setTheme } = useTheme();
  const { customization, updateCustomization } = useThemeCustomizer();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(nextLocale: string) {
    if (nextLocale === locale) return;

    const nextPath = pathname.replace(
      new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`),
      `/${nextLocale}`,
    );
    router.push(nextPath);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings2 className="size-5 text-muted-foreground" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Languages className="size-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">{t("language")}</h2>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            value={locale}
            onValueChange={(value) => {
              if (value) switchLocale(value);
            }}
            className="grid w-full grid-cols-2 gap-2"
          >
            {routing.locales.map((item) => (
              <ToggleGroupItem
                key={item}
                value={item}
                className="h-10 w-full text-sm font-normal tracking-normal normal-case"
              >
                {LANGUAGE_LABELS[item] ?? item}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>

        <section className="flex flex-col gap-3 border-t border-border pt-5">
          <div className="flex items-center gap-2">
            <Sun className="size-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">{t("appearance")}</h2>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            value={theme ?? "system"}
            onValueChange={(value) => {
              if (value) setTheme(value);
            }}
            className="grid w-full grid-cols-3 gap-2"
          >
            {APPEARANCE_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
              <ToggleGroupItem
                key={value}
                value={value}
                className="h-11 w-full gap-2 text-xs font-normal tracking-normal normal-case"
              >
                <Icon />
                {tTheme(labelKey)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>

        <section className="flex flex-col gap-4 border-t border-border pt-5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-muted-foreground" />
              <h2 className="font-medium text-sm">{t("themeColors")}</h2>
            </div>
            <p className="text-muted-foreground text-xs">
              {t("themeColorsDescription")}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              {tCustomizer("baseColor")}
            </span>
            <div className="flex flex-wrap gap-2">
              {BASE_COLORS.map((color) => (
                <SwatchButton
                  key={color}
                  label={tCustomizer(`base.${color}`)}
                  color={getBasePreview(color)}
                  selected={customization.baseColor === color}
                  onSelect={() =>
                    updateCustomization({ baseColor: color as BaseColor })
                  }
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              {tCustomizer("primaryColor")}
            </span>
            <div className="flex flex-wrap gap-2">
              {PRIMARY_COLORS.map((color) => (
                <SwatchButton
                  key={color}
                  label={tCustomizer(`primary.${color}`)}
                  color={getPrimaryPreview(color)}
                  selected={customization.primaryColor === color}
                  onSelect={() =>
                    updateCustomization({
                      primaryColor: color as PrimaryColor,
                    })
                  }
                />
              ))}
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link
              href={`/${locale}/dashboard/theme`}
              onClick={() => onOpenChange(false)}
            >
              <Palette data-icon="inline-start" />
              {t("moreTheme")}
            </Link>
          </Button>
        </section>
      </DialogContent>
    </Dialog>
  );
}

function SwatchButton({
  label,
  color,
  selected,
  onSelect,
}: {
  label: string;
  color: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={onSelect}
      className={cn(
        "relative size-8 rounded-full border border-border/70 shadow-sm outline-none transition",
        "hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "ring-2 ring-ring ring-offset-2 ring-offset-popover",
      )}
      style={{ backgroundColor: color }}
    >
      {selected && (
        <Check className="absolute inset-0 m-auto size-4 text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.65)]" />
      )}
    </button>
  );
}
