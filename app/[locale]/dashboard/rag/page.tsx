import { getTranslations } from "next-intl/server";
import { ModulePlaceholder } from "@/components/module-placeholder";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";

export default async function RagPage() {
  await requirePermission(PERMISSIONS.aiManage);

  const t = await getTranslations("Sidebar");
  return <ModulePlaceholder title={t("rag")} />;
}
