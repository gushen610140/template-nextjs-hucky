"use client";

import { useSidebar } from "fumadocs-ui/components/sidebar/base";
import { useDocsLayout } from "fumadocs-ui/layouts/docs";
import { PanelLeft, PanelLeftOpen } from "lucide-react";
import { useLocale } from "next-intl";
import type { ComponentProps } from "react";
import { DocsLanguageSwitcher } from "@/components/docs-language-switcher";
import { ThemeCustomizer } from "@/components/theme-customizer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DocsHeader({ className, ...props }: ComponentProps<"header">) {
  const { slots } = useDocsLayout();
  const { collapsed, setCollapsed, setOpen } = useSidebar();
  const locale = useLocale();
  const SearchTrigger = slots.searchTrigger
    ? slots.searchTrigger.sm
    : undefined;
  const expandLabel = locale === "zh" ? "展开侧边栏" : "Expand sidebar";
  const openLabel = locale === "zh" ? "打开侧边栏" : "Open sidebar";

  return (
    <header
      id="nd-subnav"
      {...props}
      className={cn(
        "[grid-area:header] sticky top-(--fd-docs-row-1) z-30 flex h-14 items-center gap-2 bg-fd-background/80 px-4 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-center gap-1">
        {collapsed && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setCollapsed(false)}
              aria-label={expandLabel}
              title={expandLabel}
            >
              <PanelLeftOpen />
            </Button>
            {SearchTrigger && (
              <SearchTrigger className="size-9 rounded-none" hideIfDisabled />
            )}
          </>
        )}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <DocsLanguageSwitcher />
        <ThemeCustomizer />
        <ThemeToggle />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={() => setOpen(true)}
          aria-label={openLabel}
          title={openLabel}
        >
          <PanelLeft />
        </Button>
      </div>
    </header>
  );
}
