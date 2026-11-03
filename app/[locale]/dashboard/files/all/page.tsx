import { FilesExplorer } from "@/components/files/files-explorer";
import { requirePermission } from "@/lib/authz";
import { listFilePage } from "@/lib/files/queries";
import { parseFileListState } from "@/lib/files/query-params";
import { PERMISSIONS } from "@/lib/permissions";

type AllFilesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** 文件管理: 需要 file:manage, 平铺展示全站文件, 支持搜索、排序、分页 */
export default async function AllFilesPage({
  searchParams,
}: AllFilesPageProps) {
  await requirePermission(PERMISSIONS.fileManage);
  const state = parseFileListState(await searchParams);
  const result = await listFilePage({ state });

  return <FilesExplorer scope="all" {...result} />;
}
