import { zhCN } from "@fumadocs/language/zh-cn";
import { uiTranslations } from "fumadocs-ui/i18n";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { i18n } from "@/lib/i18n";

export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .preset("zh", zhCN())
  .add({
    zh: { displayName: "简体中文" },
    en: { displayName: "English" },
  });

export function baseOptions(locale: string): BaseLayoutProps {
  return {
    nav: {
      title: locale === "zh" ? "Hucky 文档" : "Hucky Docs",
    },
  };
}
