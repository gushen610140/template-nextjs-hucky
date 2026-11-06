"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export type NavItem = {
  title: string;
  url: string;
  icon: React.ReactNode;
  onClick?: () => void;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/**
 * 命中规则取最长前缀: `/dashboard/files` 与 `/dashboard/files/all` 同时存在时,
 * 停留在子页面只高亮子入口, 父入口不会跟着亮。
 */
function isActivePath(pathname: string, url: string, allUrls: string[]) {
  const matches = (candidate: string) =>
    pathname === candidate || pathname.startsWith(`${candidate}/`);
  if (!matches(url)) return false;

  return !allUrls.some(
    (other) => other !== url && other.startsWith(`${url}/`) && matches(other),
  );
}

export function NavMain({ groups }: Readonly<{ groups: NavGroup[] }>) {
  const pathname = usePathname();
  const allUrls = groups.flatMap((group) =>
    group.items.map((item) => item.url),
  );

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isActivePath(pathname, item.url, allUrls)}
                >
                  <Link href={item.url} onClick={item.onClick}>
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
