"use client";

import { AlertCircle, ArrowLeft, ExternalLink, Rss } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { RssAdminChannel } from "@/lib/rss/types";
import { setChannelEnabledAction } from "../../actions";

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

export function RssChannelDetailClient({
  site,
  channels,
}: {
  site: Site;
  channels: RssAdminChannel[];
}) {
  const t = useTranslations("Rss");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(
      channels.map((channel) => [channel.id, channel.isEnabled]),
    ),
  );
  const [error, setError] = useState<string | null>(null);

  function toggleChannel(channelId: string, value: boolean) {
    setEnabled((prev) => ({ ...prev, [channelId]: value }));
    setError(null);
    startTransition(async () => {
      const result = await setChannelEnabledAction({
        channelId,
        enabled: value,
      });
      if (!result.ok) {
        setEnabled((prev) => ({ ...prev, [channelId]: !value }));
        setError(t(`errors.${result.error}` as never));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-1">
        <Button asChild size="sm" variant="ghost" className="-ml-2">
          <Link href={`/${locale}/dashboard/rss/channels`}>
            <ArrowLeft />
            {t("channelsTitle")}
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

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b bg-muted/40 px-4 py-2 font-medium text-sm">
          {t("channels")}
        </div>
        <ul className="divide-y">
          {channels.map((channel) => {
            const isEnabled = enabled[channel.id] ?? false;
            return (
              <li
                key={channel.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                  <Rss className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    {channel.name}
                    {!isEnabled && (
                      <Badge variant="outline">{t("disabled")}</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {t("articleCount", { count: channel.articleCount })}
                    {" · "}
                    {channel.lastFetchedAt
                      ? t("lastFetched", {
                          time: formatTime(channel.lastFetchedAt, locale) ?? "",
                        })
                      : t("neverFetched")}
                  </p>
                </div>
                <Switch
                  aria-label={
                    isEnabled ? t("disableChannel") : t("enableChannel")
                  }
                  checked={isEnabled}
                  disabled={pending}
                  onCheckedChange={(value) => toggleChannel(channel.id, value)}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
