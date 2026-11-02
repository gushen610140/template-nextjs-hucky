"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import type { RbacPermissionSummary, RbacRoleRow } from "@/lib/rbac-types";
import { createRole, deleteRole, updateRole } from "./actions";

const MAX_VISIBLE_PERMISSIONS = 3;

type RolesClientProps = {
  roles: RbacRoleRow[];
  permissions: RbacPermissionSummary[];
};

export function RolesClient({ roles, permissions }: RolesClientProps) {
  const t = useTranslations("Rbac");
  const [formTarget, setFormTarget] = useState<RbacRoleRow | "create" | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<RbacRoleRow | null>(null);

  function errorText(code: string) {
    const key = `errors.${code}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading font-medium text-xl">
            {t("roles.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("roles.description")}
          </p>
        </div>
        <Button onClick={() => setFormTarget("create")}>
          <Plus />
          {t("roles.create")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("roles.role")}</TableHead>
              <TableHead>{t("roles.permissions")}</TableHead>
              <TableHead>{t("roles.users")}</TableHead>
              <TableHead className="text-right">
                {t("common.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("common.empty")}
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => {
                const visiblePermissions = role.permissions.slice(
                  0,
                  MAX_VISIBLE_PERMISSIONS,
                );
                const hiddenCount =
                  role.permissions.length - visiblePermissions.length;

                return (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="grid gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{role.name}</span>
                          {role.isSystem && (
                            <Badge variant="outline">
                              {t("common.system")}
                            </Badge>
                          )}
                        </div>
                        {role.description && (
                          <span className="text-muted-foreground text-xs">
                            {role.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {role.permissions.length === 0 ? (
                        <span className="text-muted-foreground text-xs">
                          {t("roles.noPermissions")}
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1">
                          {visiblePermissions.map((permission) => (
                            <Badge
                              key={permission.id}
                              variant="secondary"
                              className="font-mono"
                            >
                              {permission.name}
                            </Badge>
                          ))}
                          {hiddenCount > 0 && (
                            <span className="text-muted-foreground text-xs">
                              +{hiddenCount}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {t("roles.userCount", { count: role.userCount })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setFormTarget(role)}
                          disabled={role.isSystem}
                          aria-label={t("common.edit")}
                          title={
                            role.isSystem
                              ? t("roles.systemHint")
                              : t("common.edit")
                          }
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                          onClick={() => setDeleteTarget(role)}
                          disabled={role.isSystem || role.userCount > 0}
                          aria-label={t("common.delete")}
                          title={
                            role.isSystem
                              ? t("roles.systemHint")
                              : role.userCount > 0
                                ? t("roles.inUse")
                                : t("common.delete")
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {formTarget && (
        <RoleFormDialog
          key={formTarget === "create" ? "create" : formTarget.id}
          role={formTarget === "create" ? null : formTarget}
          permissions={permissions}
          onClose={() => setFormTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title={t("roles.deleteTitle")}
          description={t("roles.deleteDescription", {
            name: deleteTarget.name,
          })}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          pendingLabel={t("common.deleting")}
          onConfirm={async () => {
            const result = await deleteRole(deleteTarget.id);
            return result.ok
              ? result
              : { ok: false, error: errorText(result.error) };
          }}
        />
      )}
    </div>
  );
}

type RoleFormDialogProps = {
  role: RbacRoleRow | null;
  permissions: RbacPermissionSummary[];
  onClose: () => void;
};

function RoleFormDialog({ role, permissions, onClose }: RoleFormDialogProps) {
  const t = useTranslations("Rbac");
  const isEdit = role !== null;
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissionIds, setPermissionIds] = useState<string[]>(
    role?.permissions.map((permission) => permission.id) ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const groups = useMemo(() => {
    const byModule = new Map<string, RbacPermissionSummary[]>();

    for (const permission of permissions) {
      const key = permission.module ?? "other";
      const list = byModule.get(key) ?? [];
      list.push(permission);
      byModule.set(key, list);
    }

    return [...byModule.entries()];
  }, [permissions]);

  function errorText(code: string) {
    const key = `errors.${code}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  }

  function togglePermission(permissionId: string, checked: boolean) {
    setPermissionIds((current) =>
      checked
        ? [...current, permissionId]
        : current.filter((id) => id !== permissionId),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateRole({
            id: role.id,
            name,
            description,
            permissionIds,
          })
        : await createRole({ name, description, permissionIds });

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
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t("roles.editTitle") : t("roles.createTitle")}
            </DialogTitle>
            <DialogDescription>{t("roles.formDescription")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="rbac-role-name">{t("common.name")}</Label>
              <Input
                id="rbac-role-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={50}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="rbac-role-description">
                {t("common.description")}
              </Label>
              <Textarea
                id="rbac-role-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={300}
              />
            </div>

            <div className="grid gap-2">
              <Label>{t("roles.permissions")}</Label>
              <p className="text-muted-foreground text-xs">
                {t("roles.permissionsHint")}
              </p>
              <div className="grid max-h-64 gap-3 overflow-y-auto rounded-lg border p-3">
                {groups.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t("permissions.empty")}
                  </p>
                ) : (
                  groups.map(([module, items]) => (
                    <div key={module} className="grid gap-1">
                      <p className="text-muted-foreground text-xs uppercase">
                        {module}
                      </p>
                      {items.map((permission) => (
                        <label
                          key={permission.id}
                          htmlFor={`rbac-role-permission-${permission.id}`}
                          className="flex items-start gap-2 rounded-md p-1.5 text-sm hover:bg-muted/50"
                        >
                          <Checkbox
                            id={`rbac-role-permission-${permission.id}`}
                            className="mt-0.5"
                            checked={permissionIds.includes(permission.id)}
                            onCheckedChange={(checked) =>
                              togglePermission(permission.id, checked === true)
                            }
                          />
                          <span className="grid gap-0.5">
                            <span className="font-mono text-xs">
                              {permission.name}
                            </span>
                            {permission.description && (
                              <span className="text-muted-foreground text-xs">
                                {permission.description}
                              </span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  ))
                )}
              </div>
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
