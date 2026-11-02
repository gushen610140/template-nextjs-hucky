import { FilesClient } from "@/components/files/files-client";
import { requirePermission } from "@/lib/authz";
import { listFiles } from "@/lib/files/queries";
import { PERMISSIONS } from "@/lib/permissions";

/** 我的文件: 需要 file:own, 只列当前用户自己的记录 */
export default async function FilesPage() {
  const user = await requirePermission(PERMISSIONS.fileOwn);
  const files = await listFiles({ ownerId: user.id });

  return <FilesClient files={files} scope="own" showOwner={false} />;
}
