"use client";

import {
  BookOpen,
  Bot,
  Command,
  LifeBuoy,
  Map as MapIcon,
  PieChart,
  Send,
  Settings,
  Shapes,
  SquareTerminal,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations("Sidebar");
  const locale = useLocale();

  const data = {
    navMain: [
      {
        title: t("playground"),
        url: "#",
        icon: <SquareTerminal />,
        isActive: true,
        items: [
          { title: t("history"), url: "#" },
          { title: t("starred"), url: "#" },
          { title: t("settings"), url: "#" },
        ],
      },
      {
        title: t("models"),
        url: "#",
        icon: <Bot />,
        items: [
          { title: t("genesis"), url: "#" },
          { title: t("explorer"), url: "#" },
          { title: t("quantum"), url: "#" },
        ],
      },
      {
        title: t("documentation"),
        url: "#",
        icon: <BookOpen />,
        items: [
          { title: t("introduction"), url: "#" },
          { title: t("getStarted"), url: "#" },
          { title: t("tutorials"), url: "#" },
          { title: t("changelog"), url: "#" },
        ],
      },
      {
        title: t("settings"),
        url: "#",
        icon: <Settings />,
        items: [
          { title: t("general"), url: "#" },
          { title: t("team"), url: "#" },
          { title: t("billing"), url: "#" },
          { title: t("limits"), url: "#" },
        ],
      },
    ],
    navSecondary: [
      { title: t("support"), url: "#", icon: <LifeBuoy /> },
      { title: t("feedback"), url: "#", icon: <Send /> },
    ],
    projects: [
      { name: t("designEngineering"), url: "#", icon: <Shapes /> },
      { name: t("salesMarketing"), url: "#", icon: <PieChart /> },
      { name: t("travel"), url: "#", icon: <MapIcon /> },
    ],
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={`/${locale}/dashboard`}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{t("brandName")}</span>
                  <span className="truncate text-xs">{t("brandSlogan")}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
