import { FilesExplorer } from "@/components/files/files-explorer";
import { requirePermission } from "@/lib/authz";
import { listFilePage } from "@/lib/files/queries";
import { parseFileListState } from "@/lib/files/query-params";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type AllFilesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * 文件管理: 需要 file:manage。
 *
 * - 不选用户: 平铺全站文件, 只做搜索 / 排序 / 分页
 * - 选中用户: 进入该用户的目录视图, 文件夹、新建、上传等能力与"我的文件"一致
 */
export default async function AllFilesPage({
  searchParams,
}: AllFilesPageProps) {
  await requirePermission(PERMISSIONS.fileManage);

  const params = await searchParams;
  const state = parseFileListState(params);

  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
    select: { id: true, name: true, email: true },
  });

  const rawOwner = Array.isArray(params.owner) ? params.owner[0] : params.owner;
  const selectedOwnerId = users.some((user) => user.id === rawOwner)
    ? (rawOwner as string)
    : null;

  const result = await listFilePage({
    ownerId: selectedOwnerId ?? undefined,
    state,
  });

  return (
    <FilesExplorer
      scope="all"
      users={users}
      selectedOwnerId={selectedOwnerId}
      {...result}
    />
  );
}
