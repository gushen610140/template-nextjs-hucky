"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { renameFile } from "@/app/[locale]/dashboard/files/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

type RenameFileDialogProps = {
  file: { id: string; name: string };
  onClose: () => void;
  /** 保存成功后的回调; 不传则只关闭对话框 */
  onRenamed?: (name: string) => void;
};

/** 文件重命名; 列表页和预览页共用 */
export function RenameFileDialog({
  file,
  onClose,
  onRenamed,
}: RenameFileDialogProps) {
  const t = useTranslations("Files");
  const [name, setName] = useState(file.name);
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
      const result = await renameFile(file.id, name);
      if (!result.ok) {
        setError(errorText(result.error));
        return;
      }
      onRenamed?.(name.trim());
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
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t("renameTitle")}</DialogTitle>
            <DialogDescription>{t("renameDescription")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="file-name">{t("name")}</Label>
            <Input
              id="file-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
