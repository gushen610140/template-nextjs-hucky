"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [logtoError, setLogtoError] = useState(false);

  // /api/auth/callback 失败时会带 ?error=logto 回到登录页
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLogtoError(params.get("error") === "logto");
  }, []);

  // 优先跳转 proxy 传入的 next 参数, 否则回 dashboard
  function getRedirectDestination(): string {
    const next = new URLSearchParams(window.location.search).get("next");
    if (!next) return `/${locale}/dashboard`;
    // 只接受站内绝对路径, 拒绝 //host 协议相对跳转, 防开放重定向
    if (next.startsWith("/") && !next.startsWith("//")) return next;
    return `/${locale}/dashboard`;
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>{t("loginTitle")}</CardTitle>
          <CardDescription>{t("loginDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {logtoError && (
            <p className="text-center text-xs text-destructive">
              {t("errorLogto")}
            </p>
          )}

          <Button
            type="button"
            className="w-full"
            onClick={() => {
              const next = encodeURIComponent(getRedirectDestination());
              window.location.href = `/api/auth/logto?next=${next}`;
            }}
          >
            {t("continueWithLogto")}
          </Button>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
          >
            <Link href={`/${locale}`}>{t("backHome")}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
