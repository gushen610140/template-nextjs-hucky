import { FilesClient } from "@/components/files/files-client";
import { requirePermission } from "@/lib/authz";
import { listFiles } from "@/lib/files/queries";
import { PERMISSIONS } from "@/lib/permissions";

/** 文件管理: 需要 file:manage, 列出全站文件 */
export default async function AllFilesPage() {
  await requirePermission(PERMISSIONS.fileManage);
  const files = await listFiles();

  return <FilesClient files={files} scope="all" showOwner />;
}
