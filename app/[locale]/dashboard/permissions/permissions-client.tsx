"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { RbacPermissionRow } from "@/lib/rbac-types";
import {
  createPermission,
  deletePermission,
  updatePermission,
} from "./actions";

type PermissionsClientProps = {
  permissions: RbacPermissionRow[];
};

export function PermissionsClient({ permissions }: PermissionsClientProps) {
  const t = useTranslations("Rbac");
  const [formTarget, setFormTarget] = useState<
    RbacPermissionRow | "create" | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<RbacPermissionRow | null>(
    null,
  );

  function errorText(code: string) {
    const key = `errors.${code}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading font-medium text-xl">
            {t("permissions.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("permissions.description")}
          </p>
        </div>
        <Button onClick={() => setFormTarget("create")}>
          <Plus />
          {t("permissions.create")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.module")}</TableHead>
              <TableHead>{t("common.description")}</TableHead>
              <TableHead>{t("permissions.roles")}</TableHead>
              <TableHead className="text-right">
                {t("common.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("common.empty")}
                </TableCell>
              </TableRow>
            ) : (
              permissions.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {permission.name}
                      </span>
                      {permission.isSystem && (
                        <Badge variant="outline">{t("common.builtin")}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {permission.module ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-72 truncate text-muted-foreground text-sm">
                    {permission.description ?? t("permissions.noDescription")}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {t("permissions.roleCount", {
                      count: permission.roleCount,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setFormTarget(permission)}
                        aria-label={t("common.edit")}
                        title={t("common.edit")}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(permission)}
                        disabled={permission.isSystem}
                        aria-label={t("common.delete")}
                        title={
                          permission.isSystem
                            ? t("permissions.builtinHint")
                            : t("common.delete")
                        }
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
        <PermissionFormDialog
          key={formTarget === "create" ? "create" : formTarget.id}
          permission={formTarget === "create" ? null : formTarget}
          onClose={() => setFormTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title={t("permissions.deleteTitle")}
          description={t("permissions.deleteDescription", {
            name: deleteTarget.name,
          })}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          pendingLabel={t("common.deleting")}
          onConfirm={async () => {
            const result = await deletePermission(deleteTarget.id);
            return result.ok
              ? result
              : { ok: false, error: errorText(result.error) };
          }}
        />
      )}
    </div>
  );
}

type PermissionFormDialogProps = {
  permission: RbacPermissionRow | null;
  onClose: () => void;
};

function PermissionFormDialog({
  permission,
  onClose,
}: PermissionFormDialogProps) {
  const t = useTranslations("Rbac");
  const isEdit = permission !== null;
  const isBuiltin = permission?.isSystem ?? false;
  const [name, setName] = useState(permission?.name ?? "");
  const [module, setModule] = useState(permission?.module ?? "");
  const [description, setDescription] = useState(permission?.description ?? "");
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
        ? await updatePermission({
            id: permission.id,
            name,
            module,
            description,
          })
        : await createPermission({ name, module, description });

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
              {isEdit
                ? t("permissions.editTitle")
                : t("permissions.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("permissions.formDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="rbac-permission-name">{t("common.name")}</Label>
              <Input
                id="rbac-permission-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isBuiltin}
                placeholder="post:publish"
                maxLength={64}
                required
              />
              <p className="text-muted-foreground text-xs">
                {isBuiltin
                  ? t("permissions.builtinHint")
                  : t("permissions.nameHint")}
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="rbac-permission-module">
                {t("common.module")}
              </Label>
              <Input
                id="rbac-permission-module"
                value={module}
                onChange={(event) => setModule(event.target.value)}
                disabled={isBuiltin}
                placeholder="post"
                maxLength={40}
              />
              <p className="text-muted-foreground text-xs">
                {t("permissions.moduleHint")}
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="rbac-permission-description">
                {t("common.description")}
              </Label>
              <Textarea
                id="rbac-permission-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={300}
              />
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
