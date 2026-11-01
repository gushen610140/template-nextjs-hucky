import { useTranslations } from "next-intl";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function AgentsPage() {
  const t = useTranslations("Sidebar");
  return <ModulePlaceholder title={t("agents")} />;
}
