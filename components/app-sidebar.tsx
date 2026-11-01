"use client";

import {
  BookOpen,
  Bot,
  Command,
  Database,
  LifeBuoy,
  Palette,
  Send,
  Server,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type * as React from "react";
import { type NavGroup, NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  /** Logto endpoint，用于拼接账户中心页面地址 */
  logtoEndpoint: string;
};

export function AppSidebar({ logtoEndpoint, ...props }: AppSidebarProps) {
  const t = useTranslations("Sidebar");
  const locale = useLocale();

  const navGroups: NavGroup[] = [
    {
      label: t("basic"),
      items: [
        {
          title: t("users"),
          url: `/${locale}/dashboard/users`,
          icon: <Users />,
        },
        {
          title: t("permissions"),
          url: `/${locale}/dashboard/permissions`,
          icon: <ShieldCheck />,
        },
        {
          title: t("roles"),
          url: `/${locale}/dashboard/roles`,
          icon: <UserCog />,
        },
      ],
    },
    {
      label: t("ai"),
      items: [
        {
          title: t("models"),
          url: `/${locale}/dashboard/models`,
          icon: <Bot />,
        },
        {
          title: t("providers"),
          url: `/${locale}/dashboard/providers`,
          icon: <Server />,
        },
        {
          title: t("agents"),
          url: `/${locale}/dashboard/agents`,
          icon: <Sparkles />,
        },
        {
          title: t("rag"),
          url: `/${locale}/dashboard/rag`,
          icon: <Database />,
        },
      ],
    },
    {
      label: t("style"),
      items: [
        {
          title: t("theme"),
          url: `/${locale}/dashboard/theme`,
          icon: <Palette />,
        },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={t("brandName")}>
              <Link href={`/${locale}/dashboard`}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium">{t("brandName")}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={navGroups} />
        <NavSecondary
          className="mt-auto"
          items={[
            {
              title: t("support"),
              url: "https://sunway.icu",
              icon: <LifeBuoy />,
              external: true,
            },
            {
              title: t("feedback"),
              url: "mailto:support@sunway.icu",
              icon: <Send />,
            },
            {
              title: t("documentation"),
              url: `/${locale}/docs`,
              icon: <BookOpen />,
            },
          ]}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser logtoEndpoint={logtoEndpoint} />
      </SidebarFooter>
    </Sidebar>
  );
}
