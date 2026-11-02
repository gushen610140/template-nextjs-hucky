"use client";

import {
  ChevronsUpDown,
  LogIn,
  LogOut,
  MonitorSmartphone,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserSettingsDialog } from "@/components/user-settings-dialog";
import { useAuth } from "@/providers/auth-provider";

const ACCOUNT_LINKS = [
  { path: "/account/profile", icon: UserRound, labelKey: "profile" },
  { path: "/account/security", icon: ShieldCheck, labelKey: "security" },
  {
    path: "/account/sessions",
    icon: MonitorSmartphone,
    labelKey: "sessions",
  },
] as const;

export function NavUser({ logtoEndpoint }: { logtoEndpoint: string }) {
  const { isMobile } = useSidebar();
  const t = useTranslations("User");
  const router = useRouter();
  const locale = useLocale();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { user, isAuthenticated, signOut } = useAuth();

  if (!isAuthenticated) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={() => router.push(`/${locale}/login`)}
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-accent">
              <LogIn className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Log in</span>
              <span className="truncate text-xs">Sign in to your account</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const accountBase = logtoEndpoint.replace(/\/$/, "");
  const initials = (user?.name ?? user?.email ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user?.avatar} alt={user?.name ?? "User"} />
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user?.name ?? "User"}
                  </span>
                  <span className="truncate text-xs">{user?.email ?? ""}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={user?.avatar}
                      alt={user?.name ?? "User"}
                    />
                    <AvatarFallback className="rounded-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user?.name ?? "User"}
                    </span>
                    <span className="truncate text-xs">
                      {user?.email ?? ""}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {ACCOUNT_LINKS.map(({ path, icon: Icon, labelKey }) => (
                <DropdownMenuItem key={path} asChild>
                  <a
                    href={`${accountBase}${path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer"
                  >
                    <Icon />
                    {t(labelKey)}
                  </a>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onSelect={() => setSettingsOpen(true)}
                className="cursor-pointer"
              >
                <Settings />
                {t("settings")}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => signOut()}
                className="cursor-pointer"
              >
                <LogOut />
                {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <UserSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
