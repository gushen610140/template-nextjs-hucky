"use client";

import { AlertCircle, ChevronRight, Globe } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RssAdminSiteCard } from "@/lib/rss/types";
import { setSiteEnabledAction } from "../actions";

export function RssChannelsClient({ sites }: { sites: RssAdminSiteCard[] }) {
  const t = useTranslations("Rss");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [siteEnabled, setSiteEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(sites.map((site) => [site.id, site.isEnabled])),
  );
  const [error, setError] = useState<string | null>(null);

  function toggleSite(siteId: string, value: boolean) {
    setSiteEnabled((prev) => ({ ...prev, [siteId]: value }));
    setError(null);
    startTransition(async () => {
      const result = await setSiteEnabledAction({ siteId, enabled: value });
      if (!result.ok) {
        setSiteEnabled((prev) => ({ ...prev, [siteId]: !value }));
        setError(t(`errors.${result.error}` as never));
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

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("site")}</TableHead>
              <TableHead>{t("channels")}</TableHead>
              <TableHead>{t("enabled")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("emptyCatalog")}
                </TableCell>
              </TableRow>
            ) : (
              sites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                        <Globe className="size-4" />
                      </span>
                      <div className="grid">
                        <span className="flex items-center gap-2 font-medium">
                          {site.name}
                          {!site.isEnabled && (
                            <Badge variant="outline">{t("disabled")}</Badge>
                          )}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {site.description ?? site.homepageUrl}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">
                        {t("channelCount", { count: site.channelCount })}
                      </Badge>
                      <Badge variant="outline">
                        {t("enabledChannelCount", {
                          count: site.enabledChannelCount,
                        })}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      aria-label={
                        siteEnabled[site.id]
                          ? t("disableSite")
                          : t("enableSite")
                      }
                      checked={siteEnabled[site.id] ?? false}
                      disabled={pending}
                      onCheckedChange={(value) => toggleSite(site.id, value)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link
                        href={`/${locale}/dashboard/rss/channels/${site.id}`}
                      >
                        {t("manageChannels")}
                        <ChevronRight />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
