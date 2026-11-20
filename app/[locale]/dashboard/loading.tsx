import { Skeleton } from "@/components/ui/skeleton";

const CARD_KEYS = ["card-1", "card-2", "card-3", "card-4"];
const ROW_KEYS = ["row-1", "row-2", "row-3", "row-4", "row-5", "row-6"];

/**
 * Dashboard 分段的 Suspense 兜底。
 *
 * 各页面都是 async server component（权限校验 + Prisma 查询），
 * 没有 loading.tsx 时客户端导航会一直停留在旧页面。这里给统一的骨架，
 * 点击后立即切换并显示占位，数据到达后由真实页面替换。
 */
export default function DashboardLoading() {
  return (
    <div aria-busy="true" className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <span className="sr-only">Loading…</span>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARD_KEYS.map((key) => (
          <div
            key={key}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <Skeleton className="h-5 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>

        <div className="flex flex-col divide-y divide-border">
          {ROW_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-3 p-4">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-1/5" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="hidden h-3.5 w-24 sm:block" />
              <Skeleton className="size-8 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
