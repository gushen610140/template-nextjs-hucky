import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireUser } from "@/lib/auth";
import { getUserPermissions } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";

/**
 * 受保护分段的权威校验 + dashboard 外壳。
 *
 * `proxy.ts` 只做乐观检查（cookie 是否存在/格式是否合法），不查数据库；
 * 真正判断会话是否有效、用户是否被禁用，在这里由 `requireUser()` 完成。
 * 新增受保护分段时，也要在自己的 layout（或 Server Action）里调用它。
 */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const permissions = await getUserPermissions(user.id);

  return (
    <SidebarProvider>
      <AppSidebar
        logtoEndpoint={process.env.LOGTO_ENDPOINT ?? ""}
        canManageBasic={permissions.has(PERMISSIONS.basicManage)}
      />
      <SidebarInset>
        <DashboardHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
