"use client";

import { Check, ChevronDown, Languages } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LANGUAGE_LABELS: Record<string, string> = {
  zh: "简体中文",
  en: "English",
};

export function DocsLanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function switchLocale(nextLocale: string) {
    setOpen(false);
    if (nextLocale === locale) return;

    const nextPath = pathname.replace(
      new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`),
      `/${nextLocale}`,
    );
    router.push(nextPath);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2.5"
          aria-label={locale === "zh" ? "切换语言" : "Change language"}
        >
          <Languages className="size-4" />
          <span className="hidden sm:inline">
            {LANGUAGE_LABELS[locale] ?? locale}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <div className="grid gap-0.5">
          {routing.locales.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => switchLocale(item)}
              className={cn(
                "flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                item === locale && "bg-accent text-accent-foreground",
              )}
            >
              <span>{LANGUAGE_LABELS[item] ?? item}</span>
              {item === locale && <Check className="ml-auto size-4" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
