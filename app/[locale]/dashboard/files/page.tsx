import { FilesExplorer } from "@/components/files/files-explorer";
import { requirePermission } from "@/lib/authz";
import { listFilePage } from "@/lib/files/queries";
import { parseFileListState } from "@/lib/files/query-params";
import { PERMISSIONS } from "@/lib/permissions";

type FilesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** 我的文件: 需要 file:own, 支持文件夹、搜索、排序、分页 */
export default async function FilesPage({ searchParams }: FilesPageProps) {
  const user = await requirePermission(PERMISSIONS.fileOwn);
  const state = parseFileListState(await searchParams);
  const result = await listFilePage({ ownerId: user.id, state });

  return <FilesExplorer scope="own" {...result} />;
}
