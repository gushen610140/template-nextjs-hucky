"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/providers/auth-provider";

type FormErrors = Partial<{
  account: string;
  password: string;
  agree: string;
}>;

export default function LoginPage() {
  const t = useTranslations("Auth");
  const { setUser } = useAuth();

  const router = useRouter();
  const locale = useLocale();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [logtoError, setLogtoError] = useState(false);

  // /api/auth/callback 失败时会带 ?error=logto 回到登录页
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLogtoError(params.get("error") === "logto");
  }, []);

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!account.trim()) errs.account = t("errorEmailRequired");
    if (!password) errs.password = t("errorPasswordRequired");
    else if (password.length < 6) errs.password = t("errorPasswordMin");
    if (!agreeTerms) errs.agree = t("errorAgreeTerms");
    return errs;
  }

  // 优先跳转 proxy 传入的 next 参数, 否则回 dashboard
  function getRedirectDestination(): string {
    const next = new URLSearchParams(window.location.search).get("next");
    if (!next) return `/${locale}/dashboard`;
    // 只接受站内绝对路径, 拒绝 //host 协议相对跳转, 防开放重定向
    if (next.startsWith("/") && !next.startsWith("//")) return next;
    return `/${locale}/dashboard`;
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: account, password }),
    });
    const data = await res.json();

    if (res.ok) {
      setUser(data.user);
      router.push(getRedirectDestination());
      setSubmitting(false);
    } else {
      setErrors(data.errors ?? {});
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>{t("loginTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="account">{t("emailLabel")}</Label>
              <Input
                id="account"
                type="text"
                placeholder={t("emailPlaceholder")}
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                aria-invalid={!!errors.account}
              />
              {errors.account && (
                <p className="text-xs text-destructive">{errors.account}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t("passwordLabel")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="agree-password"
                checked={agreeTerms}
                onCheckedChange={(v) => {
                  setAgreeTerms(v === true);
                  setErrors((prev) => {
                    const { agree: _, ...rest } = prev;
                    return rest;
                  });
                }}
              />
              <Label
                htmlFor="agree-password"
                className="text-xs font-normal tracking-normal normal-case"
              >
                {t("agreeTerms")}
              </Label>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs font-normal tracking-normal normal-case"
                  >
                    {t("termsOfService")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("termsTitle")}</DialogTitle>
                    <DialogDescription>{t("termsP1")}</DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                    <p>{t("termsP2")}</p>
                    <p>{t("termsP3")}</p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {errors.agree && (
              <p className="-mt-3 text-xs text-destructive">{errors.agree}</p>
            )}

            <Button type="submit" disabled={submitting}>
              {submitting ? "…" : t("loginButton")}
            </Button>
          </form>

          {logtoError && (
            <p className="mt-4 text-center text-xs text-destructive">
              {t("errorLogto")}
            </p>
          )}

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("orContinueWith")}
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
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
            className="mt-2 w-full text-muted-foreground"
          >
            <Link href={`/${locale}`}>{t("backHome")}</Link>
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t("noAccount")}{" "}
            <Link
              href={`/${locale}/register`}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {t("goRegister")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
