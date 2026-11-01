"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ThemeCustomizer } from "@/components/theme-customizer";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

/** 路由段 → Sidebar 命名空间里的标题 key */
const MODULE_KEYS = {
  users: "users",
  permissions: "permissions",
  roles: "roles",
  models: "models",
  providers: "providers",
  agents: "agents",
  rag: "rag",
  theme: "theme",
} as const;

type ModuleSegment = keyof typeof MODULE_KEYS;

function resolveModuleKey(pathname: string): string | null {
  const segment = pathname.split("/").filter(Boolean)[2];
  if (!segment || !(segment in MODULE_KEYS)) return null;
  return MODULE_KEYS[segment as ModuleSegment];
}

export function DashboardHeader() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("Dashboard");
  const tSidebar = useTranslations("Sidebar");

  const moduleKey = resolveModuleKey(pathname);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex w-full items-center gap-2 px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link href={`/${locale}/dashboard`}>{t("overview")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {moduleKey && (
                <>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{tSidebar(moduleKey)}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <ThemeCustomizer />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
