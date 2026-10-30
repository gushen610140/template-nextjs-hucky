"use client";

import { useDocsLayout } from "fumadocs-ui/layouts/docs";
import { PanelLeft } from "lucide-react";
import type { ComponentProps } from "react";
import { DocsLanguageSwitcher } from "@/components/docs-language-switcher";
import { ThemeCustomizer } from "@/components/theme-customizer";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function DocsHeader({ className, ...props }: ComponentProps<"header">) {
  const { slots } = useDocsLayout();
  const SidebarTrigger = slots.sidebar.trigger;

  return (
    <header
      id="nd-subnav"
      {...props}
      className={cn(
        "[grid-area:header] sticky top-(--fd-docs-row-1) z-30 flex h-14 items-center gap-2 border-b bg-fd-background/80 px-4 backdrop-blur-sm",
        className,
      )}
    >
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
