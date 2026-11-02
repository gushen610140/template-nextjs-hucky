"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

export type NavItem = {
  title: string;
  url: string;
  icon: React.ReactNode;
};

export type NavGroup = {
  label: string;
  /** 在分组前插入分隔线; 若它是第一个可见分组则不渲染 */
  separator?: boolean;
  items: NavItem[];
};

function isActivePath(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`);
}

export function NavMain({ groups }: Readonly<{ groups: NavGroup[] }>) {
  const pathname = usePathname();

  return (
    <>
      {groups.map((group, index) => (
        <Fragment key={group.label}>
          {group.separator && index > 0 && <SidebarSeparator />}
          <SidebarGroup>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActivePath(pathname, item.url)}
                  >
                    <Link href={item.url}>
                      {item.icon}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </Fragment>
      ))}
    </>
  );
}
