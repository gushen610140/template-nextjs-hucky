import { cn } from "@/lib/utils";

/**
 * 已由 sanitizeArticleHtml 过滤的正文 HTML。
 * 样式统一放在这里，阅读页和管理员文章页共用。
 */
export function RssArticleBody({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[15px] leading-7 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-muted-foreground [&_figcaption]:text-xs [&_figure]:my-4 [&_h2]:mt-8 [&_h2]:font-semibold [&_h2]:text-lg [&_h3]:mt-6 [&_h3]:font-semibold [&_img]:my-4 [&_img]:h-auto [&_img]:w-full [&_img]:rounded-lg [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-4",
        className,
      )}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: 调用方必须先通过 sanitizeArticleHtml
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
