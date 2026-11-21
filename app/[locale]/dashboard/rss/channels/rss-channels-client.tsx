"use client";

import { AlertCircle, Globe, Rss } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { RssAdminSite } from "@/lib/rss/types";
import { setChannelEnabledAction, setSiteEnabledAction } from "../actions";

function formatTime(value: string | null, locale: string): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function RssChannelsClient({ sites }: { sites: RssAdminSite[] }) {
  const t = useTranslations("Rss");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [siteEnabled, setSiteEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(sites.map((site) => [site.id, site.isEnabled])),
  );
  const [channelEnabled, setChannelEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(
      sites.flatMap((site) =>
        site.channels.map((channel) => [channel.id, channel.isEnabled]),
      ),
    ),
  );
  const [error, setError] = useState<string | null>(null);

  const errorText = (code: string) => t(`errors.${code}` as never);

  function toggleSite(siteId: string, value: boolean) {
    setSiteEnabled((prev) => ({ ...prev, [siteId]: value }));
    setError(null);
    startTransition(async () => {
      const result = await setSiteEnabledAction({
        siteId,
        enabled: value,
      });
      if (!result.ok) {
        setSiteEnabled((prev) => ({ ...prev, [siteId]: !value }));
        setError(errorText(result.error));
        return;
      }
      router.refresh();
    });
  }

  function toggleChannel(channelId: string, value: boolean) {
    setChannelEnabled((prev) => ({ ...prev, [channelId]: value }));
    setError(null);
    startTransition(async () => {
      const result = await setChannelEnabledAction({
        channelId,
        enabled: value,
      });
      if (!result.ok) {
        setChannelEnabled((prev) => ({ ...prev, [channelId]: !value }));
        setError(errorText(result.error));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="font-heading font-medium text-xl">
          {t("channelsTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("channelsDescription")}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {sites.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground text-sm">
          {t("emptyCatalog")}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sites.map((site) => {
            const isSiteEnabled = siteEnabled[site.id] ?? false;
            return (
              <section
                key={site.id}
                className="overflow-hidden rounded-xl border bg-card"
              >
                <header className="flex flex-wrap items-center gap-3 border-b bg-muted/40 px-4 py-3">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-background">
                    <Globe className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      {site.name}
                      {!isSiteEnabled && (
                        <Badge variant="outline">{t("disabled")}</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {site.description ?? site.homepageUrl}
                    </p>
                  </div>
                  <Switch
                    aria-label={
                      isSiteEnabled ? t("disableSite") : t("enableSite")
                    }
                    checked={isSiteEnabled}
                    disabled={pending}
                    onCheckedChange={(value) => toggleSite(site.id, value)}
                  />
                </header>
                <ul className="divide-y">
                  {site.channels.map((channel) => {
                    const isChannelEnabled =
                      channelEnabled[channel.id] ?? false;
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
                            {!isChannelEnabled && (
                              <Badge variant="outline">{t("disabled")}</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {t("articleCount", {
                              count: channel.articleCount,
                            })}
                            {" · "}
                            {channel.lastFetchedAt
                              ? t("lastFetched", {
                                  time:
                                    formatTime(channel.lastFetchedAt, locale) ??
                                    "",
                                })
                              : t("neverFetched")}
                          </p>
                        </div>
                        <Switch
                          aria-label={
                            isChannelEnabled
                              ? t("disableChannel")
                              : t("enableChannel")
                          }
                          checked={isChannelEnabled}
                          disabled={pending}
                          onCheckedChange={(value) =>
                            toggleChannel(channel.id, value)
                          }
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
