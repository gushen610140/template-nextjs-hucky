"use client";

import {
  BookOpen,
  Bot,
  Command,
  Database,
  FolderOpen,
  Folders,
  LifeBuoy,
  MessageSquare,
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
import { type NavGroup, type NavItem, NavMain } from "@/components/nav-main";
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
  /** 是否拥有用户 / 角色 / 权限管理权限 */
  canManageBasic: boolean;
  /** 是否拥有文件管理权限 (file:own) */
  canUseFiles: boolean;
  /** 是否拥有全站文件管理权限 (file:manage) */
  canManageFiles: boolean;
  /** 是否可以使用 AI 对话 (ai:own) */
  canUseAi: boolean;
  /** 是否可以管理供应商 / 模型 (ai:manage) */
  canManageAi: boolean;
};

export function AppSidebar({
  logtoEndpoint,
  canManageBasic,
  canUseFiles,
  canManageFiles,
  canUseAi,
  canManageAi,
  ...props
}: AppSidebarProps) {
  const t = useTranslations("Sidebar");
  const locale = useLocale();

  const navGroups: NavGroup[] = [];

  // 用户 / 角色 / 权限页面本身有服务端权限校验, 这里只是不展示无权限的入口
  if (canManageBasic) {
    navGroups.push({
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
    });
  }

  // 文件入口按权限拆成两个页面: 我的文件 (file:own) 与文件管理 (file:manage)。
  // 同一用户可能只有其中一个, 所以逐项判断, 而不是整组显示/隐藏。
  const fileItems: NavItem[] = [];
  if (canUseFiles) {
    fileItems.push({
      title: t("files"),
      url: `/${locale}/dashboard/files`,
      icon: <FolderOpen />,
    });
  }
  if (canManageFiles) {
    fileItems.push({
      title: t("filesAll"),
      url: `/${locale}/dashboard/files/all`,
      icon: <Folders />,
    });
  }
  if (fileItems.length > 0) {
    navGroups.push({
      label: t("filesGroup"),
      items: fileItems,
    });
  }

  // 对话入口只要求 ai:own; 模型 / 供应商 / 智能体 / RAG 都是管理功能,
  // 只对 ai:manage 展示。
  const aiItems: NavItem[] = [];
  if (canUseAi) {
    aiItems.push({
      title: t("chat"),
      url: `/${locale}/dashboard/chat`,
      icon: <MessageSquare />,
    });
  }
  if (canManageAi) {
    aiItems.push(
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
    );
  }

  navGroups.push(
    {
      label: t("ai"),
      items: aiItems,
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
  );

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
              newTab: true,
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
