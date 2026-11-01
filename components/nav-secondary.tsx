"use client";

import Link from "next/link";
import type * as React from "react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export type NavSecondaryItem = {
  title: string;
  url: string;
  icon: React.ReactNode;
  /** 外部链接在站外打开；mailto 等协议由 <a> 直接处理 */
  external?: boolean;
};

export function NavSecondary({
  items,
  ...props
}: {
  items: NavSecondaryItem[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild size="sm" tooltip={item.title}>
                {item.external ? (
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {item.icon}
                    <span>{item.title}</span>
                  </a>
                ) : item.url.startsWith("mailto:") ? (
                  // mailto 交给系统默认邮件客户端，不需要新标签页
                  <a href={item.url}>
                    {item.icon}
                    <span>{item.title}</span>
                  </a>
                ) : (
                  <Link href={item.url}>
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
