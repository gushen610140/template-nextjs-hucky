import { DashboardOverview } from "@/components/dashboard/overview";

/**
 * Dashboard 概览。
 *
 * 面向所有已登录用户的产品介绍页，包含模块说明与文档导航；
 * 游客（无任何业务权限）也能看到完整内容。
 */
export default function Page() {
  return <DashboardOverview />;
}
