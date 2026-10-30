"use client";

import {
  SidebarCollapseTrigger,
  useSidebar,
} from "fumadocs-ui/components/sidebar/base";
import { useDocsLayout } from "fumadocs-ui/layouts/docs";
import { PanelLeft, PanelLeftOpen } from "lucide-react";
import { useLocale } from "next-intl";
import type { ComponentProps } from "react";
import { DocsLanguageSwitcher } from "@/components/docs-language-switcher";
import { ThemeCustomizer } from "@/components/theme-customizer";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function DocsHeader({ className, ...props }: ComponentProps<"header">) {
  const { slots } = useDocsLayout();
  const { collapsed } = useSidebar();
  const locale = useLocale();
  const SidebarTrigger = slots.sidebar.trigger;
  const SearchTrigger = slots.searchTrigger
    ? slots.searchTrigger.sm
    : undefined;
  const expandLabel = locale === "zh" ? "展开侧边栏" : "Expand sidebar";

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
            <SidebarCollapseTrigger
              className="inline-flex size-9 items-center justify-center rounded-none border border-transparent text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
              aria-label={expandLabel}
            >
              <PanelLeftOpen className="size-4" />
            </SidebarCollapseTrigger>
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
        <SidebarTrigger
          className="size-9 md:hidden"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="size-4" />
        </SidebarTrigger>
      </div>
    </header>
  );
}
