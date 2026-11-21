import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { RssArticleBody } from "@/components/rss/article-body";
import { RssBackToTop } from "@/components/rss/back-to-top";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";
import { sanitizeArticleHtml } from "@/lib/rss/sanitize";
import { getAdminArticle } from "@/lib/rss/service";

export default async function RssAdminArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  await requirePermission(PERMISSIONS.rssManage);
  const [article, locale, t] = await Promise.all([
    getAdminArticle(articleId),
    getLocale(),
    getTranslations("Rss"),
  ]);

  if (!article) notFound();

  const content = article.content ? sanitizeArticleHtml(article.content) : null;
  const dateFormat = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild size="sm" variant="ghost" className="-ml-2">
          <Link href={`/${locale}/dashboard/rss/articles`}>
            <ArrowLeft />
            {t("articlesTitle")}
          </Link>
        </Button>
        <Button asChild size="sm">
          <a href={article.url} target="_blank" rel="noreferrer">
            <ExternalLink />
            {t("read.original")}
          </a>
        </Button>
      </div>

      <article className="mx-auto w-full max-w-3xl space-y-4">
        <header className="space-y-3 border-b pb-4">
          <h1 className="font-heading font-semibold text-2xl leading-snug">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
            <Badge variant="outline">{article.siteName}</Badge>
            {article.channels.map((channel) => (
              <Badge key={channel} variant="secondary">
                {channel}
              </Badge>
            ))}
            {article.author && <span>· {article.author}</span>}
            {article.publishedAt && (
              <span>· {dateFormat.format(new Date(article.publishedAt))}</span>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("fetchedAt")}: {dateFormat.format(new Date(article.fetchedAt))}
            {" · "}
            {t("addedAt")}: {dateFormat.format(new Date(article.createdAt))}
          </p>
        </header>

        {content ? (
          <RssArticleBody html={content} />
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
            <p>{t("contentMissing")}</p>
            {article.summary && <p className="mt-2">{article.summary}</p>}
          </div>
        )}
      </article>
      <RssBackToTop />
    </div>
  );
}
