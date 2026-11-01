import { useTranslations } from "next-intl";

/**
 * 管理模块占位页。
 *
 * 模块内部功能尚未实现，只保留标题和统一的占位提示；
 * 后续每个模块可以替换成自己的页面内容。
 */
export function ModulePlaceholder({ title }: Readonly<{ title: string }>) {
  const t = useTranslations("Dashboard");

  return (
    <div className="flex flex-1 flex-col p-4 pt-0">
      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed p-10">
        <div className="space-y-1 text-center">
          <h1 className="font-medium text-lg">{title}</h1>
          <p className="text-muted-foreground text-sm">{t("comingSoon")}</p>
        </div>
      </div>
    </div>
  );
}
