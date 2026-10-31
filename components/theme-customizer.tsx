"use client";

import { Palette } from "lucide-react";
import { useTranslations } from "next-intl";
import { ThemeCustomizerControls } from "@/components/theme-customizer-controls";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ThemeCustomizer() {
  const t = useTranslations("ThemeCustomizer");

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
          <Palette data-icon="inline-start" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-80 overflow-y-auto">
        <ThemeCustomizerControls />
      </PopoverContent>
    </Popover>
  );
}
