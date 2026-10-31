"use client";

import { ChevronDown, Languages } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routing } from "@/i18n/routing";

const LANGUAGE_LABELS: Record<string, string> = {
  zh: "简体中文",
  en: "English",
};

export function DocsLanguageSwitcher() {
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
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2.5"
          aria-label={locale === "zh" ? "切换语言" : "Change language"}
        >
          <Languages />
          <span className="hidden sm:inline">
            {LANGUAGE_LABELS[locale] ?? locale}
          </span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>
          {locale === "zh" ? "语言" : "Language"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={locale} onValueChange={switchLocale}>
          {routing.locales.map((item) => (
            <DropdownMenuRadioItem key={item} value={item}>
              {LANGUAGE_LABELS[item] ?? item}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
