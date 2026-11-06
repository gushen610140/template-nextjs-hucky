"use client";

import { ArrowRight, Database, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { ConfirmDeleteDialog } from "@/components/rbac/confirm-delete-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TooltipButton } from "@/components/ui/tooltip-button";
import type { AiModelOption, RagLibraryRow } from "@/lib/ai/types";
import { createLibrary, deleteLibrary, updateLibrary } from "./actions";

type Props = {
  libraries: RagLibraryRow[];
  models: AiModelOption[];
  vectorSize: number;
  initialCreate: boolean;
};

export function RagLibrariesClient({
  libraries,
  models,
  vectorSize,
  initialCreate,
}: Props) {
  const t = useTranslations("Rag");
  const locale = useLocale();
  const router = useRouter();
  const [formTarget, setFormTarget] = useState<RagLibraryRow | "create" | null>(
    initialCreate ? "create" : null,
  );
  const [deleteTarget, setDeleteTarget] = useState<RagLibraryRow | null>(null);

  useEffect(() => {
    if (!initialCreate) return;
    setFormTarget("create");
    router.replace(`/${locale}/dashboard/rag`);
  }, [initialCreate, locale, router]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading font-medium text-xl">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </div>
        <Button
          onClick={() => setFormTarget("create")}
          disabled={models.length === 0}
        >
          <Plus />
          {t("create")}
        </Button>
      </div>

      {vectorSize === 0 && (
        <Alert variant="destructive">
          <AlertDescription>{t("missingConfig")}</AlertDescription>
        </Alert>
      )}

      {vectorSize > 0 && models.length === 0 && (
        <Alert>
          <AlertDescription>
            {t("needModel", { size: vectorSize })}
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("library")}</TableHead>
              <TableHead>{t("embeddingModel")}</TableHead>
              <TableHead>{t("files")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {libraries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              libraries.map((library) => (
                <TableRow
                  key={library.id}
                  className="cursor-pointer"
                  onDoubleClick={() =>
                    router.push(`/${locale}/dashboard/rag/${library.id}`)
                  }
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Database className="size-4 text-muted-foreground" />
                      <div className="grid">
                        <span className="font-medium">{library.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {library.description ?? t("noDescription")}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="grid">
                      <span className="text-sm">
                        {library.embeddingModelName}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {library.providerName} · {library.vectorSize}d
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">
                        {t("fileCount", { count: library.fileCount })}
                      </Badge>
                      <Badge variant="outline">
                        {t("readyCount", { count: library.readyFileCount })}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <TooltipButton label={t("open")}>
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link
                            href={`/${locale}/dashboard/rag/${library.id}`}
                            aria-label={t("open")}
                          >
                            <ArrowRight />
                          </Link>
                        </Button>
                      </TooltipButton>
                      <TooltipButton label={t("edit")}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setFormTarget(library)}
                          aria-label={t("edit")}
                        >
                          <Pencil />
                        </Button>
                      </TooltipButton>
                      <TooltipButton label={t("delete")}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                          onClick={() => setDeleteTarget(library)}
                          aria-label={t("delete")}
                        >
                          <Trash2 />
                        </Button>
                      </TooltipButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {formTarget && (
        <LibraryFormDialog
          key={formTarget === "create" ? "create" : formTarget.id}
          library={formTarget === "create" ? null : formTarget}
          models={models}
          onClose={() => setFormTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title={t("deleteTitle")}
          description={t("deleteDescription", { name: deleteTarget.name })}
          confirmLabel={t("delete")}
          cancelLabel={t("cancel")}
          pendingLabel={t("deleting")}
          onConfirm={async () => {
            const result = await deleteLibrary(deleteTarget.id);
            if (result.ok) {
              window.dispatchEvent(new Event("ai-rag-libraries-changed"));
            }
            return result.ok
              ? result
              : { ok: false, error: t(`errors.${result.error}`) };
          }}
        />
      )}
    </div>
  );
}

function LibraryFormDialog({
  library,
  models,
  onClose,
}: {
  library: RagLibraryRow | null;
  models: AiModelOption[];
  onClose: () => void;
}) {
  const t = useTranslations("Rag");
  const isEdit = library !== null;
  const [name, setName] = useState(library?.name ?? "");
  const [description, setDescription] = useState(library?.description ?? "");
  const [embeddingModelId, setEmbeddingModelId] = useState(
    library?.embeddingModelId ?? models[0]?.id ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const modelLocked = library?.hasVectors === true;

  function errorText(code: string) {
    const key = `errors.${code}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = { name, description, embeddingModelId };
    startTransition(async () => {
      const result = isEdit
        ? await updateLibrary({ id: library.id, ...payload })
        : await createLibrary(payload);
      if (!result.ok) {
        setError(errorText(result.error));
        return;
      }
      window.dispatchEvent(new Event("ai-rag-libraries-changed"));
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
      <DialogContent className="sm:max-w-lg" data-lenis-prevent>
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t("editTitle") : t("createTitle")}
            </DialogTitle>
            <DialogDescription>{t("formDescription")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="rag-library-name">{t("name")}</Label>
              <Input
                id="rag-library-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="rag-library-description">
                {t("descriptionLabel")}
              </Label>
              <Textarea
                id="rag-library-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={300}
                rows={2}
                placeholder={t("descriptionPlaceholder")}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="rag-library-model">{t("embeddingModel")}</Label>
              <Select
                value={embeddingModelId}
                onValueChange={setEmbeddingModelId}
                disabled={modelLocked}
              >
                <SelectTrigger id="rag-library-model" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.providerName} · {model.displayName} ·{" "}
                      {model.embeddingDimension}d
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {modelLocked && (
                <p className="text-muted-foreground text-xs">
                  {t("modelLockedHint")}
                </p>
              )}
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
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending || !embeddingModelId}>
              {pending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
