"use client";

import { Languages, Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { ThemeCustomizerControls } from "@/components/theme-customizer-controls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { routing } from "@/i18n/routing";

const LANGUAGE_LABELS: Record<string, string> = {
  zh: "简体中文",
  en: "English",
};

const APPEARANCE_OPTIONS = [
  { value: "light", icon: Sun, labelKey: "light" },
  { value: "dark", icon: Moon, labelKey: "dark" },
  { value: "system", icon: Monitor, labelKey: "system" },
] as const;

export function SettingsDialog({
  open,
  onOpenChange,
  locale,
  onLocaleChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
  onLocaleChange: (locale: string) => void;
}) {
  const t = useTranslations("Landing");
  const tTheme = useTranslations("Theme");
  const { theme, setTheme } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{t("settingsTitle")}</DialogTitle>
          <DialogDescription>{t("settingsDescription")}</DialogDescription>
        </DialogHeader>

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Languages className="size-4 text-muted-foreground" />
            <h2 className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
              {t("languageTitle")}
            </h2>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            value={locale}
            onValueChange={(value) => {
              if (value && value !== locale) onLocaleChange(value);
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
          <h2 className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            {t("appearanceTitle")}
          </h2>
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

        <section className="border-t border-border pt-5">
          <ThemeCustomizerControls />
        </section>

        <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          {t("closeHint")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
