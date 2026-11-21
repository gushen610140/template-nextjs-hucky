import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { RssArticleBody } from "@/components/rss/article-body";
import { RssBackToTop } from "@/components/rss/back-to-top";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { sanitizeArticleHtml } from "@/lib/rss/sanitize";
import { getUserArticle } from "@/lib/rss/service";
import { RssArticleToolbar } from "./rss-article-toolbar";

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

  const content = article.content ? sanitizeArticleHtml(article.content) : null;

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
          <RssArticleBody html={content} />
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
