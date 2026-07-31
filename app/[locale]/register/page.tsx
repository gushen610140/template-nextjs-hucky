"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/providers/auth-provider";

type FormErrors = Partial<{
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  agree: string;
}>;

export default function RegisterPage() {
  const t = useTranslations("Auth");
  const { setUser } = useAuth();

  const router = useRouter();
  const locale = useLocale();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): FormErrors {
    const errs: FormErrors = {};

    if (!username.trim()) errs.username = t("errorUsernameRequired");
    else if (username.trim().length < 2) errs.username = t("errorUsernameMin");

    if (!email.trim()) errs.email = t("errorEmailRequired");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = t("errorEmailInvalid");

    if (!password) errs.password = t("errorPasswordRequired");
    else if (password.length < 6) errs.password = t("errorPasswordMin");

    if (!confirmPassword) errs.confirmPassword = t("errorPasswordRequired");
    else if (password !== confirmPassword)
      errs.confirmPassword = t("errorPasswordMismatch");

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
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
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

  // ── Render ──────────────────────────────────────────

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>{t("registerTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Username */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">{t("usernameLabel")}</Label>
              <Input
                id="username"
                type="text"
                placeholder={t("usernamePlaceholder")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-invalid={!!errors.username}
              />
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username}</p>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t("emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password */}
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

            {/* Confirm Password */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">
                {t("confirmPasswordLabel")}
              </Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder={t("confirmPasswordPlaceholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="agree"
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
                htmlFor="agree"
                className="text-xs font-normal tracking-normal normal-case"
              >
                {t("agreeTerms")}
                <Link
                  href={`/${locale}/terms`}
                  className="ml-0.5 underline underline-offset-2 hover:text-foreground"
                >
                  {t("termsOfService")}
                </Link>
              </Label>
            </div>
            {errors.agree && (
              <p className="-mt-3 text-xs text-destructive">{errors.agree}</p>
            )}

            {/* Submit */}
            <Button type="submit" disabled={submitting}>
              {submitting ? "…" : t("registerButton")}
            </Button>
          </form>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mt-2 w-full text-muted-foreground"
          >
            <Link href={`/${locale}`}>{t("backHome")}</Link>
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t("hasAccount")}{" "}
            <Link
              href={`/${locale}/login`}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {t("goLogin")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
