import { DashboardOverview } from "@/components/dashboard/overview";

/**
 * Dashboard 概览。
 *
 * 图表数据目前来自组件内的 mock 常量；接入真实接口时，
 * 把数据转到服务端读取再作为 props 传入即可。
 */
export default function Page() {
  return <DashboardOverview />;
}
