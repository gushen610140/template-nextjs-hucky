import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard 概览。
 *
 * 占位块使用固定高度（而不是 aspect-video），这样侧边栏收起、
 * 内容区变宽时只有宽度变化，高度保持不变。
 */
export default function Page() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <Skeleton className="min-h-0 flex-1 rounded-xl" />
    </div>
  );
}
