"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/providers/auth-provider";

type FormErrors = Partial<{
  account: string;
  password: string;
  email: string;
  code: string;
  agree: string;
}>;

export default function LoginPage() {
  const t = useTranslations("Auth");
  const { setUser } = useAuth();

  const [activeTab, setActiveTab] = useState("password");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  function validatePassword(): FormErrors {
    const errs: FormErrors = {};
    if (!account.trim()) errs.account = t("errorEmailRequired");
    if (!password) errs.password = t("errorPasswordRequired");
    else if (password.length < 6) errs.password = t("errorPasswordMin");
    if (!agreeTerms) errs.agree = t("errorAgreeTerms");
    return errs;
  }

  function validateCode(): FormErrors {
    const errs: FormErrors = {};
    if (!email.trim()) errs.email = t("errorEmailRequired");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = t("errorEmailInvalid");
    if (!code) errs.code = t("errorCodeRequired");
    else if (!/^\d{6}$/.test(code)) errs.code = t("errorCodeLength");
    if (!agreeTerms) errs.agree = t("errorAgreeTerms");
    return errs;
  }

  async function handlePasswordSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    const errs = validatePassword();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    // TODO: call login API
    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, 800);
    await promise;
    setUser({
      id: "1",
      email: account,
      name: account.split("@")[0],
    });
    setSubmitting(false);
  }

  async function handleCodeSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    const errs = validateCode();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    // TODO: call login API
    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, 800);
    await promise;
    setUser({
      id: "1",
      email,
      name: email.split("@")[0],
    });
    setSubmitting(false);
  }

  function handleSendCode() {
    if (!email.trim()) {
      setErrors((prev) => ({ ...prev, email: t("errorEmailRequired") }));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors((prev) => ({ ...prev, email: t("errorEmailInvalid") }));
      return;
    }
    setErrors((prev) => {
      const { email: _, ...rest } = prev;
      return rest;
    });
    setCodeSent(true);
    setCountdown(60);
    // TODO: call send-code API

    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>{t("loginTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList variant="line" className="mb-6 w-full">
              <TabsTrigger value="password" className="flex-1">
                {t("loginTabPassword")}
              </TabsTrigger>
              <TabsTrigger value="code" className="flex-1">
                {t("loginTabCode")}
              </TabsTrigger>
            </TabsList>

            {/* ── Password tab ── */}
            <TabsContent value="password">
              <form
                onSubmit={handlePasswordSubmit}
                className="flex flex-col gap-5"
              >
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
                    <p className="text-xs text-destructive">
                      {errors.password}
                    </p>
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
                    <Link
                      href="/terms"
                      className="ml-0.5 underline underline-offset-2 hover:text-foreground"
                    >
                      {t("termsOfService")}
                    </Link>
                  </Label>
                </div>
                {errors.agree && (
                  <p className="-mt-3 text-xs text-destructive">
                    {errors.agree}
                  </p>
                )}

                <Button type="submit" disabled={submitting}>
                  {submitting ? "…" : t("loginButton")}
                </Button>
              </form>
            </TabsContent>

            {/* ── Code tab ── */}
            <TabsContent value="code">
              <form onSubmit={handleCodeSubmit} className="flex flex-col gap-5">
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

                <div className="flex flex-col gap-2">
                  <Label htmlFor="code">{t("codeLabel")}</Label>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        id="code"
                        type="text"
                        placeholder={t("codePlaceholder")}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        aria-invalid={!!errors.code}
                        maxLength={6}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      disabled={countdown > 0}
                      onClick={handleSendCode}
                    >
                      {countdown > 0
                        ? t("resendCode", { seconds: countdown })
                        : codeSent
                          ? t("getCode")
                          : t("getCode")}
                    </Button>
                  </div>
                  {errors.code && (
                    <p className="text-xs text-destructive">{errors.code}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="agree-code"
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
                    htmlFor="agree-code"
                    className="text-xs font-normal tracking-normal normal-case"
                  >
                    {t("agreeTerms")}
                    <Link
                      href="/terms"
                      className="ml-0.5 underline underline-offset-2 hover:text-foreground"
                    >
                      {t("termsOfService")}
                    </Link>
                  </Label>
                </div>
                {errors.agree && (
                  <p className="-mt-3 text-xs text-destructive">
                    {errors.agree}
                  </p>
                )}

                <Button type="submit" disabled={submitting}>
                  {submitting ? "…" : t("loginButton")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t("noAccount")}{" "}
            <Link
              href="/register"
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
