"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Fragment } from "react";
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
  chat: "chat",
  theme: "theme",
} as const;

type ModuleSegment = keyof typeof MODULE_KEYS;

type Crumb = {
  label: string;
  href?: string;
};

/**
 * 文件模块的二级路由:
 * - /dashboard/files
 * - /dashboard/files/all
 * - /dashboard/files/[id]
 * - /dashboard/files/[id]/edit
 *
 * 中间层级保留为链接, 便于从预览 / 编辑直接回到列表或预览。
 */
function resolveFileCrumbs(
  segments: string[],
  locale: string,
  t: (key: string) => string,
  tSidebar: (key: string) => string,
  canUseFiles: boolean,
  canManageFiles: boolean,
): Crumb[] {
  const base = `/${locale}/dashboard/files`;
  const overview: Crumb = {
    label: t("overview"),
    href: `/${locale}/dashboard`,
  };

  if (segments[3] === "all") {
    return [overview, { label: tSidebar("filesAll") }];
  }

  if (!segments[3]) {
    return [overview, { label: tSidebar("files") }];
  }

  const fileId = segments[3];
  const previewHref = `${base}/${fileId}`;
  const listHref = canUseFiles ? base : `${base}/all`;
  const listLabel = canUseFiles
    ? tSidebar("files")
    : canManageFiles
      ? tSidebar("filesAll")
      : tSidebar("filesGroup");
  const crumbs: Crumb[] = [
    overview,
    { label: listLabel, href: listHref },
    {
      label: t("filePreview"),
      href: segments[4] === "edit" ? previewHref : undefined,
    },
  ];

  if (segments[4] === "edit") {
    crumbs.push({ label: t("fileEdit") });
  }

  return crumbs;
}

function resolveCrumbs(
  pathname: string,
  locale: string,
  t: (key: string) => string,
  tSidebar: (key: string) => string,
  canUseFiles: boolean,
  canManageFiles: boolean,
): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const section = segments[2];

  if (section === "files") {
    return resolveFileCrumbs(
      segments,
      locale,
      t,
      tSidebar,
      canUseFiles,
      canManageFiles,
    );
  }

  const overview: Crumb = {
    label: t("overview"),
    href: `/${locale}/dashboard`,
  };

  if (section && section in MODULE_KEYS) {
    return [
      overview,
      { label: tSidebar(MODULE_KEYS[section as ModuleSegment]) },
    ];
  }

  return [overview];
}

export function DashboardHeader({
  canUseFiles,
  canManageFiles,
}: {
  canUseFiles: boolean;
  canManageFiles: boolean;
}) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("Dashboard");
  const tSidebar = useTranslations("Sidebar");

  const crumbs = resolveCrumbs(
    pathname,
    locale,
    t,
    tSidebar,
    canUseFiles,
    canManageFiles,
  );

  return (
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex w-full items-center gap-2 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((crumb, index) => (
                <Fragment key={`${crumb.label}-${index}`}>
                  {index > 0 && (
                    <BreadcrumbSeparator className="hidden md:block" />
                  )}
                  <BreadcrumbItem
                    className={index === 0 ? "hidden md:block" : undefined}
                  >
                    {crumb.href ? (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
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
