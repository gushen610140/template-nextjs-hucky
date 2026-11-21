"use client";

import { ArrowLeft, Check, ExternalLink, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markArticleReadAction, toggleArticleSavedAction } from "../../actions";

export function RssArticleToolbar({
  articleId,
  initialRead,
  initialSaved,
  originalUrl,
}: {
  articleId: string;
  initialRead: boolean;
  initialSaved: boolean;
  originalUrl: string;
}) {
  const t = useTranslations("Rss");
  const locale = useLocale();
  const router = useRouter();
  const [isRead, setIsRead] = useState(initialRead);
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const marked = useRef(initialRead);

  useEffect(() => {
    if (marked.current) return;
    marked.current = true;
    setIsRead(true);
    void markArticleReadAction({ articleId, isRead: true });
  }, [articleId]);

  function toggleRead() {
    const next = !isRead;
    setIsRead(next);
    startTransition(async () => {
      const result = await markArticleReadAction({
        articleId,
        isRead: next,
      });
      if (!result.ok) {
        setIsRead(!next);
        return;
      }
      router.refresh();
    });
  }

  function toggleSaved() {
    const next = !isSaved;
    setIsSaved(next);
    startTransition(async () => {
      const result = await toggleArticleSavedAction(articleId);
      if (!result.ok) {
        setIsSaved(!next);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button asChild size="sm" variant="ghost" className="-ml-2">
        <Link href={`/${locale}/dashboard/rss/read`}>
          <ArrowLeft />
          {t("read.back")}
        </Link>
      </Button>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={toggleSaved}
        >
          <Star
            className={isSaved ? "fill-current text-amber-500" : undefined}
          />
          {isSaved ? t("read.unsave") : t("read.save")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={toggleRead}
        >
          <Check />
          {isRead ? t("read.markUnread") : t("read.markRead")}
        </Button>
        <Button asChild size="sm">
          <a href={originalUrl} target="_blank" rel="noreferrer">
            <ExternalLink />
            {t("read.original")}
          </a>
        </Button>
      </div>
    </div>
  );
}
