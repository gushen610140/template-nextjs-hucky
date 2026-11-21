"use client";

import { ChevronRight, Globe } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RssSiteCard } from "@/lib/rss/types";

export function RssCatalogClient({ sites }: { sites: RssSiteCard[] }) {
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

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("site")}</TableHead>
              <TableHead>{t("channels")}</TableHead>
              <TableHead>{t("subscription")}</TableHead>
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
                    <Badge variant="secondary">
                      {t("channelCount", { count: site.channelCount })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {t("subscribedCount", { count: site.subscribedCount })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/${locale}/dashboard/rss/${site.id}`}>
                        {t("openSite")}
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
