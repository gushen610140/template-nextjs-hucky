"use client";

import { Download, FileUp, Pencil, Trash2, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import {
  completeUpload,
  createUpload,
  deleteFile,
  getDownloadUrl,
  renameFile,
} from "@/app/[locale]/dashboard/files/actions";
import { ConfirmDeleteDialog } from "@/components/rbac/confirm-delete-dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FileRow } from "@/lib/files/types";
import { MAX_UPLOAD_BYTES } from "@/lib/storage/limits";

type FilesClientProps = {
  files: FileRow[];
  /** 全站视图: 多显示一列上传者 */
  showOwner: boolean;
  /** 页面标题与描述按视图切换 */
  scope: "own" | "all";
};

type UploadTask = {
  key: string;
  name: string;
  progress: number;
};

export function FilesClient({ files, showOwner, scope }: FilesClientProps) {
  const t = useTranslations("Files");
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<FileRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileRow | null>(null);

  function errorText(code: string) {
    const key = `errors.${code}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  }

  async function uploadOne(file: File) {
    const taskKey = crypto.randomUUID();
    setUploads((current) => [
      ...current,
      { key: taskKey, name: file.name, progress: 0 },
    ]);

    try {
      const target = await createUpload({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      });
      if (!target.ok) {
        setBanner(errorText(target.error));
        return;
      }

      await putToStorage(
        target.uploadUrl,
        target.contentType,
        file,
        (ratio) => {
          setUploads((current) =>
            current.map((task) =>
              task.key === taskKey ? { ...task, progress: ratio } : task,
            ),
          );
        },
      );

      const completed = await completeUpload(target.id);
      if (!completed.ok) {
        setBanner(errorText(completed.error));
      }
    } catch (error) {
      console.error("upload failed:", error);
      setBanner(t("errors.upload_failed"));
    } finally {
      setUploads((current) => current.filter((task) => task.key !== taskKey));
    }
  }

  async function handleSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setBanner(null);
    const selected = Array.from(fileList);
    // 串行上传: 进度条语义清晰, 也避免同时打满带宽
    for (const file of selected) {
      await uploadOne(file);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading font-medium text-xl">
            {scope === "all" ? t("allTitle") : t("title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {scope === "all" ? t("allDescription") : t("description")}
          </p>
        </div>
        <Button onClick={() => inputRef.current?.click()}>
          <Upload />
          {t("upload")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            void handleSelected(event.target.files);
          }}
        />
      </div>

      <p className="text-muted-foreground text-xs">
        {t("limitHint", { size: formatBytes(MAX_UPLOAD_BYTES, locale) })}
      </p>

      {banner && (
        <Alert variant="destructive">
          <AlertDescription>{banner}</AlertDescription>
        </Alert>
      )}

      {uploads.length > 0 && (
        <div className="space-y-2 rounded-xl border bg-card p-3">
          {uploads.map((task) => (
            <div key={task.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate">
                  {t("uploading", { name: task.name })}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {Math.round(task.progress * 100)}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: `${Math.round(task.progress * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              {showOwner && <TableHead>{t("owner")}</TableHead>}
              <TableHead>{t("size")}</TableHead>
              <TableHead>{t("createdAt")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showOwner ? 5 : 4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <FileUp className="size-4 text-muted-foreground" />
                      <div className="grid min-w-0">
                        <span className="truncate font-medium">
                          {file.name}
                        </span>
                        <span className="truncate text-muted-foreground text-xs">
                          {file.mimeType}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  {showOwner && (
                    <TableCell className="text-muted-foreground text-sm">
                      {file.owner.name ?? file.owner.email}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground text-sm tabular-nums">
                    {formatBytes(file.size, locale)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(file.createdAt))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <DownloadButton file={file} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setRenameTarget(file)}
                        aria-label={t("rename")}
                        title={t("rename")}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(file)}
                        aria-label={t("delete")}
                        title={t("delete")}
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

      {renameTarget && (
        <RenameDialog
          key={renameTarget.id}
          file={renameTarget}
          onClose={() => setRenameTarget(null)}
          errorText={errorText}
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
            const result = await deleteFile(deleteTarget.id);
            return result.ok
              ? result
              : { ok: false, error: errorText(result.error) };
          }}
        />
      )}
    </div>
  );
}

function DownloadButton({ file }: Readonly<{ file: FileRow }>) {
  const t = useTranslations("Files");
  const [pending, startTransition] = useTransition();

  function handleDownload() {
    startTransition(async () => {
      const result = await getDownloadUrl(file.id);
      if (!result.ok) return;
      window.location.assign(result.url);
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleDownload}
      disabled={pending}
      aria-label={t("download")}
      title={t("download")}
    >
      <Download />
    </Button>
  );
}

type RenameDialogProps = {
  file: FileRow;
  onClose: () => void;
  errorText: (code: string) => string;
};

function RenameDialog({ file, onClose, errorText }: RenameDialogProps) {
  const t = useTranslations("Files");
  const [name, setName] = useState(file.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await renameFile(file.id, name);
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

/** 直接 PUT 到 RustFS, 用 XHR 拿上传进度 (fetch 没有上传进度事件) */
function putToStorage(
  url: string,
  contentType: string,
  file: File,
  onProgress: (ratio: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(event.loaded / event.total);
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}`));
    });
    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.send(file);
  });
}

function formatBytes(bytes: number, locale: string): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(value)} ${units[unitIndex]}`;
}
