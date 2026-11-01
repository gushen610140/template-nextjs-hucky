import { useTranslations } from "next-intl";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function RagPage() {
  const t = useTranslations("Sidebar");
  return <ModulePlaceholder title={t("rag")} />;
}
