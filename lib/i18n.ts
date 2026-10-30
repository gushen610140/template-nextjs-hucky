import { defineI18n } from "fumadocs-core/i18n";
import { routing } from "@/i18n/routing";

/**
 * Fumadocs i18n config, kept in sync with next-intl routing.
 * `parser: "dir"` means content is grouped by locale folder:
 *   content/docs/zh/*.mdx
 *   content/docs/en/*.mdx
 */
export const i18n = defineI18n({
  defaultLanguage: routing.defaultLocale,
  languages: [...routing.locales],
  parser: "dir",
});
