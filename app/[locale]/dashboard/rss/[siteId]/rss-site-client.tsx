"use client";

import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Rss,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { RssChannelRow } from "@/lib/rss/types";
import { refreshChannelAction, toggleSubscription } from "../actions";

type Site = {
  id: string;
  name: string;
  description: string | null;
  homepageUrl: string;
  isEnabled: boolean;
};

function formatTime(value: string | null, locale: string): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function RssSiteClient({
  site,
  channels,
}: {
  site: Site;
  channels: RssChannelRow[];
}) {
  const t = useTranslations("Rss");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [subscribed, setSubscribed] = useState<Record<string, boolean>>(
    Object.fromEntries(
      channels.map((channel) => [channel.id, channel.subscribed]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const errorText = (code: string) => t(`errors.${code}` as never);

  function toggleSubscribe(channelId: string, value: boolean) {
    setSubscribed((prev) => ({ ...prev, [channelId]: value }));
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await toggleSubscription({ channelId, enabled: value });
      if (!result.ok) {
        setSubscribed((prev) => ({ ...prev, [channelId]: !value }));
        setError(errorText(result.error));
        return;
      }
      router.refresh();
    });
  }

  function refresh(channelId: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await refreshChannelAction(channelId);
      if (!result.ok) {
        setError(errorText(result.error));
        return;
      }
      setNotice(t("newArticles", { count: result.newArticles ?? 0 }));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-1">
        <Button asChild size="sm" variant="ghost" className="-ml-2">
          <Link href={`/${locale}/dashboard/rss`}>
            <ArrowLeft />
            {t("title")}
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 font-heading font-medium text-xl">
          {site.name}
          {!site.isEnabled && <Badge variant="outline">{t("disabled")}</Badge>}
        </h1>
        <p className="text-muted-foreground text-sm">
          {site.description ?? site.homepageUrl}
        </p>
        <a
          href={site.homepageUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-muted-foreground text-xs underline-offset-2 hover:underline"
        >
          {site.homepageUrl}
          <ExternalLink className="size-3" />
        </a>
      </div>

      {!site.isEnabled && (
        <Alert>
          <AlertDescription>{t("siteDisabledHint")}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {notice && (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b bg-muted/40 px-4 py-2 font-medium text-sm">
          {t("channels")}
        </div>
        <ul className="divide-y">
          {channels.map((channel) => {
            const isSubscribed = subscribed[channel.id] ?? false;
            return (
              <li
                key={channel.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                  <Rss className="size-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{channel.name}</span>
                    {!channel.isEnabled && (
                      <Badge variant="outline">{t("disabled")}</Badge>
                    )}
                    <span className="text-muted-foreground text-xs">
                      {t("articleCount", { count: channel.articleCount })}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {channel.lastFetchedAt
                      ? t("lastFetched", {
                          time: formatTime(channel.lastFetchedAt, locale) ?? "",
                        })
                      : t("neverFetched")}
                    {channel.lastError
                      ? ` · ${t("fetchError", { message: channel.lastError })}`
                      : ""}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  disabled={pending || !isSubscribed}
                  onClick={() => refresh(channel.id)}
                >
                  <RefreshCw className={pending ? "animate-spin" : undefined} />
                  {t("refresh")}
                </Button>
                <Switch
                  aria-label={isSubscribed ? t("unsubscribe") : t("subscribe")}
                  checked={isSubscribed}
                  disabled={pending || !site.isEnabled || !channel.isEnabled}
                  onCheckedChange={(value) =>
                    toggleSubscribe(channel.id, value)
                  }
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
