"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { ConfirmDeleteDialog } from "@/components/rbac/confirm-delete-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import type { RbacRoleSummary, RbacUserRow } from "@/lib/rbac-types";
import { createUser, deleteUser, updateUser } from "./actions";

type UsersClientProps = {
  users: RbacUserRow[];
  roles: RbacRoleSummary[];
  currentUserId: string;
};

export function UsersClient({ users, roles, currentUserId }: UsersClientProps) {
  const t = useTranslations("Rbac");
  const locale = useLocale();
  const [formTarget, setFormTarget] = useState<RbacUserRow | "create" | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<RbacUserRow | null>(null);

  function errorText(code: string) {
    const key = `errors.${code}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading font-medium text-xl">
            {t("users.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("users.description")}
          </p>
        </div>
        <Button onClick={() => setFormTarget("create")}>
          <Plus />
          {t("users.create")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("users.user")}</TableHead>
              <TableHead>{t("users.roles")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("users.createdAt")}</TableHead>
              <TableHead className="text-right">
                {t("common.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("common.empty")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar size="sm">
                          {user.avatarUrl && (
                            <AvatarImage src={user.avatarUrl} alt="" />
                          )}
                          <AvatarFallback>
                            {(user.name ?? user.email)
                              .slice(0, 1)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid">
                          <span className="font-medium">
                            {user.name ?? user.email}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.roles.length === 0 ? (
                        <span className="text-muted-foreground text-xs">
                          {t("users.noRoles")}
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role.id} variant="secondary">
                              {role.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.isActive ? "secondary" : "destructive"}
                      >
                        {user.isActive
                          ? t("common.active")
                          : t("common.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                      }).format(new Date(user.createdAt))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setFormTarget(user)}
                          aria-label={t("common.edit")}
                          title={t("common.edit")}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                          onClick={() => setDeleteTarget(user)}
                          disabled={isSelf}
                          aria-label={t("common.delete")}
                          title={
                            isSelf ? t("users.selfHint") : t("common.delete")
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
        <UserFormDialog
          key={formTarget === "create" ? "create" : formTarget.id}
          user={formTarget === "create" ? null : formTarget}
          roles={roles}
          currentUserId={currentUserId}
          onClose={() => setFormTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title={t("users.deleteTitle")}
          description={t("users.deleteDescription", {
            email: deleteTarget.email,
          })}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          pendingLabel={t("common.deleting")}
          onConfirm={async () => {
            const result = await deleteUser(deleteTarget.id);
            return result.ok
              ? result
              : { ok: false, error: errorText(result.error) };
          }}
        />
      )}
    </div>
  );
}

type UserFormDialogProps = {
  user: RbacUserRow | null;
  roles: RbacRoleSummary[];
  currentUserId: string;
  onClose: () => void;
};

function UserFormDialog({
  user,
  roles,
  currentUserId,
  onClose,
}: UserFormDialogProps) {
  const t = useTranslations("Rbac");
  const isEdit = user !== null;
  const isSelf = user?.id === currentUserId;
  const [email, setEmail] = useState(user?.email ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [roleIds, setRoleIds] = useState<string[]>(
    user?.roles.map((role) => role.id) ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function errorText(code: string) {
    const key = `errors.${code}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  }

  function toggleRole(roleId: string, checked: boolean) {
    setRoleIds((current) =>
      checked ? [...current, roleId] : current.filter((id) => id !== roleId),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateUser({ id: user.id, name, isActive, roleIds })
        : await createUser({ email, name, isActive, roleIds });

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
              {isEdit ? t("users.editTitle") : t("users.createTitle")}
            </DialogTitle>
            <DialogDescription>{t("users.formDescription")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="rbac-user-email">{t("users.email")}</Label>
              <Input
                id="rbac-user-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isEdit}
                required
                autoComplete="off"
              />
              <p className="text-muted-foreground text-xs">
                {isEdit ? t("users.emailLocked") : t("users.emailHint")}
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="rbac-user-name">{t("users.displayName")}</Label>
              <Input
                id="rbac-user-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="rbac-user-active"
                checked={isActive}
                disabled={isSelf}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <Label htmlFor="rbac-user-active">{t("common.active")}</Label>
            </div>
            {isSelf && (
              <p className="text-muted-foreground text-xs">
                {t("users.selfHint")}
              </p>
            )}

            <div className="grid gap-2">
              <Label>{t("users.roles")}</Label>
              <p className="text-muted-foreground text-xs">
                {t("users.rolesHint")}
              </p>
              <div className="grid gap-2 rounded-lg border p-3">
                {roles.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t("common.empty")}
                  </p>
                ) : (
                  roles.map((role) => (
                    <label
                      key={role.id}
                      htmlFor={`rbac-user-role-${role.id}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        id={`rbac-user-role-${role.id}`}
                        checked={roleIds.includes(role.id)}
                        disabled={isSelf}
                        onCheckedChange={(checked) =>
                          toggleRole(role.id, checked === true)
                        }
                      />
                      <span>{role.name}</span>
                    </label>
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
