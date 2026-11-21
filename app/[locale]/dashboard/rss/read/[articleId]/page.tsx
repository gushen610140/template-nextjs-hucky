import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import sanitizeHtml from "sanitize-html";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { getUserArticle } from "@/lib/rss/service";
import { RssArticleToolbar } from "./rss-article-toolbar";
import { RssBackToTop } from "./rss-back-to-top";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img",
    "figure",
    "figcaption",
    "h1",
    "h2",
    "video",
    "source",
  ]),
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    video: ["src", "controls", "poster", "width", "height"],
    source: ["src", "type"],
    "*": ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      rel: "noopener noreferrer",
    }),
  },
};

export default async function RssArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  const user = await requirePermission(PERMISSIONS.rssOwn);
  const locale = await getLocale();
  const article = await getUserArticle(user.id, articleId);

  if (!article) notFound();

  const content = article.content
    ? sanitizeHtml(article.content, SANITIZE_OPTIONS)
    : null;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <RssArticleToolbar
        articleId={article.id}
        initialRead={article.isRead}
        initialSaved={article.isSaved}
        originalUrl={article.url}
      />

      <article className="mx-auto w-full max-w-3xl space-y-4">
        <header className="space-y-3 border-b pb-4">
          <h1 className="font-heading font-semibold text-2xl leading-snug">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
            {article.siteName && (
              <span className="rounded-md border px-2 py-0.5">
                {article.siteName}
              </span>
            )}
            <span>{article.channelName}</span>
            {article.author && <span>· {article.author}</span>}
            {article.publishedAt && (
              <span>
                ·{" "}
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(article.publishedAt))}
              </span>
            )}
          </div>
        </header>

        {content ? (
          <div
            className="text-[15px] leading-7 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-muted-foreground [&_figcaption]:text-xs [&_figure]:my-4 [&_h2]:mt-8 [&_h2]:font-semibold [&_h2]:text-lg [&_h3]:mt-6 [&_h3]:font-semibold [&_img]:my-4 [&_img]:h-auto [&_img]:w-full [&_img]:rounded-lg [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-4"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: content 已由 sanitize-html 过滤
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
            {article.summary}
          </p>
        )}
      </article>
      <RssBackToTop />
    </div>
  );
}
