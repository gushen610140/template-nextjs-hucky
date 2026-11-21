"use client";

import { ChevronRight, Globe, Rss } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RssSiteCard } from "@/lib/rss/types";

export function RssCatalogClient({
  sites,
  canManage,
}: {
  sites: RssSiteCard[];
  canManage: boolean;
}) {
  const t = useTranslations("Rss");
  const locale = useLocale();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="font-heading font-medium text-xl">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("catalogDescription")}
        </p>
      </div>

      {sites.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground text-sm">
          {t("emptyCatalog")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sites.map((site) => (
            <Link key={site.id} href={`/${locale}/dashboard/rss/${site.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                        <Globe className="size-4" />
                      </span>
                      <div className="space-y-0.5">
                        <CardTitle className="flex items-center gap-2">
                          {site.name}
                          {!site.isEnabled && canManage && (
                            <Badge variant="outline">{t("disabled")}</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {site.description ?? site.homepageUrl}
                        </CardDescription>
                      </div>
                    </div>
                    <ChevronRight className="mt-1 size-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-3 text-xs">
                    <Badge variant="secondary">
                      <Rss className="size-3" />
                      {t("channelCount", { count: site.channelCount })}
                    </Badge>
                    <Badge variant="outline">
                      {t("subscribedCount", { count: site.subscribedCount })}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
