"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { ConfirmDeleteDialog } from "@/components/rbac/confirm-delete-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AI_PROVIDER_TYPES, type AiProviderRow } from "@/lib/ai/types";
import type { AiProviderType } from "@/lib/generated/prisma/enums";
import { createProvider, deleteProvider, updateProvider } from "./actions";

type ProvidersClientProps = {
  providers: AiProviderRow[];
};

export function ProvidersClient({ providers }: ProvidersClientProps) {
  const t = useTranslations("Ai");
  const [formTarget, setFormTarget] = useState<AiProviderRow | "create" | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<AiProviderRow | null>(null);

  function errorText(code: string) {
    const key = `errors.${code}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading font-medium text-xl">
            {t("providers.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("providers.description")}
          </p>
        </div>
        <Button onClick={() => setFormTarget("create")}>
          <Plus />
          {t("providers.create")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("providers.type")}</TableHead>
              <TableHead>{t("providers.baseUrl")}</TableHead>
              <TableHead>{t("providers.models")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">
                {t("common.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("common.empty")}
                </TableCell>
              </TableRow>
            ) : (
              providers.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell>
                    <div className="grid">
                      <span className="font-medium">{provider.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {provider.apiKeyLast4
                          ? t("providers.keyLast4", {
                              last4: provider.apiKeyLast4,
                            })
                          : t("providers.keyUnreadable")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {t(`types.${provider.type}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground text-sm">
                    {provider.baseUrl ?? t("providers.defaultBaseUrl")}
                  </TableCell>
                  <TableCell className="text-sm">
                    {provider.modelCount}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={provider.isActive ? "secondary" : "destructive"}
                    >
                      {provider.isActive
                        ? t("common.active")
                        : t("common.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setFormTarget(provider)}
                        aria-label={t("common.edit")}
                        title={t("common.edit")}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(provider)}
                        aria-label={t("common.delete")}
                        title={t("common.delete")}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {formTarget && (
        <ProviderFormDialog
          key={formTarget === "create" ? "create" : formTarget.id}
          provider={formTarget === "create" ? null : formTarget}
          onClose={() => setFormTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title={t("providers.deleteTitle")}
          description={t("providers.deleteDescription", {
            name: deleteTarget.name,
          })}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          pendingLabel={t("common.deleting")}
          onConfirm={async () => {
            const result = await deleteProvider(deleteTarget.id);
            return result.ok
              ? result
              : { ok: false, error: errorText(result.error) };
          }}
        />
      )}
    </div>
  );
}

function ProviderFormDialog({
  provider,
  onClose,
}: {
  provider: AiProviderRow | null;
  onClose: () => void;
}) {
  const t = useTranslations("Ai");
  const isEdit = provider !== null;
  const [name, setName] = useState(provider?.name ?? "");
  const [type, setType] = useState<AiProviderType>(provider?.type ?? "OPENAI");
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl ?? "");
  const [apiKey, setApiKey] = useState("");
  const [isActive, setIsActive] = useState(provider?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(String(provider?.sortOrder ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function errorText(code: string) {
    const key = `errors.${code}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateProvider({
            id: provider.id,
            name,
            type,
            baseUrl,
            apiKey,
            isActive,
            sortOrder: Number(sortOrder),
          })
        : await createProvider({
            name,
            type,
            baseUrl,
            apiKey,
            isActive,
            sortOrder: Number(sortOrder),
          });

      if (!result.ok) {
        setError(errorText(result.error));
        return;
      }

      onClose();
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t("providers.editTitle") : t("providers.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("providers.formDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ai-provider-name">{t("common.name")}</Label>
              <Input
                id="ai-provider-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="ai-provider-type">{t("providers.type")}</Label>
              <select
                id="ai-provider-type"
                value={type}
                onChange={(event) =>
                  setType(event.target.value as AiProviderType)
                }
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {AI_PROVIDER_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {t(`types.${value}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="ai-provider-base-url">
                {t("providers.baseUrl")}
              </Label>
              <Input
                id="ai-provider-base-url"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="https://api.example.com/v1"
              />
              <p className="text-muted-foreground text-xs">
                {t("providers.baseUrlHint")}
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="ai-provider-api-key">
                {t("providers.apiKey")}
              </Label>
              <Input
                id="ai-provider-api-key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={
                  isEdit ? t("providers.apiKeyKeep") : t("providers.apiKeyNew")
                }
                autoComplete="new-password"
                required={!isEdit}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="ai-provider-sort">{t("common.sortOrder")}</Label>
              <Input
                id="ai-provider-sort"
                type="number"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="ai-provider-active"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <Label htmlFor="ai-provider-active">{t("common.active")}</Label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
