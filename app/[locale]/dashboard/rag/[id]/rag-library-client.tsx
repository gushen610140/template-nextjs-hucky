"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileText,
  Folder,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";
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
import type {
  RagFileCandidate,
  RagFolderCandidate,
  RagLibraryFileRow,
} from "@/lib/ai/types";
import { formatBytes } from "@/lib/files/format";
import {
  addLibraryFiles,
  removeLibraryFile,
  vectorizeLibrary,
  vectorizeLibraryFile,
} from "../actions";

type LibraryProps = {
  id: string;
  name: string;
  description: string | null;
  embeddingModelName: string;
  providerName: string;
  vectorSize: number;
  fileCount: number;
};

type Props = {
  library: LibraryProps;
  files: RagLibraryFileRow[];
  candidates: RagFileCandidate[];
  folders: RagFolderCandidate[];
};

export function RagLibraryClient({
  library,
  files,
  candidates,
  folders,
}: Props) {
  const t = useTranslations("Rag");
  const locale = useLocale();
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<RagLibraryFileRow | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pendingCount = useMemo(
    () =>
      files.filter(
        (file) => file.status === "QUEUED" || file.status === "PROCESSING",
      ).length,
    [files],
  );

  useEffect(() => {
    if (pendingCount === 0) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (cancelled) return;
      try {
        const response = await fetch("/api/ai/rag/worker", { method: "POST" });
        const data = (await response.json().catch(() => null)) as {
          remaining?: number;
        } | null;
        if (!response.ok) {
          setError(t("errors.worker_failed"));
          return;
        }
        if ((data?.remaining ?? 0) > 0) {
          timer = setTimeout(tick, 800);
        } else {
          router.refresh();
        }
      } catch {
        setError(t("errors.unknown"));
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pendingCount, router, t]);

  function errorText(code: string) {
    const key = `errors.${code}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  }

  function handleVectorize(file: RagLibraryFileRow) {
    setError(null);
    startTransition(async () => {
      const result = await vectorizeLibraryFile(file.id);
      if (!result.ok) {
        setError(errorText(result.error));
        return;
      }
      router.refresh();
    });
  }

  function handleVectorizeAll() {
    setError(null);
    startTransition(async () => {
      const result = await vectorizeLibrary(library.id);
      if (!result.ok) {
        setError(errorText(result.error));
        return;
      }
      router.refresh();
    });
  }

  function handleRemove() {
    if (!removeTarget) return;
    setError(null);
    startTransition(async () => {
      const result = await removeLibraryFile({
        libraryId: library.id,
        fileId: removeTarget.fileId,
      });
      if (!result.ok) {
        setError(errorText(result.error));
        return;
      }
      setRemoveTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href={`/${locale}/dashboard/rag`}>
              <ArrowLeft />
              {t("back")}
            </Link>
          </Button>
          <h1 className="font-heading font-medium text-xl">{library.name}</h1>
          <p className="text-muted-foreground text-sm">
            {library.embeddingModelName} · {library.providerName} ·{" "}
            {library.vectorSize}d
          </p>
          {library.description && (
            <p className="text-muted-foreground text-sm">
              {library.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleVectorizeAll}
            disabled={pending}
          >
            <RefreshCw />
            {t("vectorizeAll")}
          </Button>
          <Button onClick={() => setPickerOpen(true)}>
            <Plus />
            {t("addFiles")}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("file")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("chunks")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("emptyFiles")}
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground" />
                      <div className="grid">
                        <span className="font-medium">{file.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {formatBytes(file.size, locale)}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <FileStatusBadge file={file} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {file.status === "PROCESSING"
                      ? `${file.processedChunks} / ${file.chunkCount}`
                      : file.chunkCount > 0
                        ? file.chunkCount
                        : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleVectorize(file)}
                        disabled={
                          pending ||
                          file.status === "PROCESSING" ||
                          file.status === "QUEUED"
                        }
                        aria-label={t("vectorize")}
                        title={t("vectorize")}
                      >
                        <Play />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() => setRemoveTarget(file)}
                        aria-label={t("remove")}
                        title={t("remove")}
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

      {pickerOpen && (
        <FilePickerDialog
          libraryId={library.id}
          candidates={candidates}
          folders={folders}
          existingFileIds={new Set(files.map((file) => file.fileId))}
          onClose={() => setPickerOpen(false)}
          onAdded={() => {
            setPickerOpen(false);
            router.refresh();
          }}
          onError={setError}
        />
      )}

      {removeTarget && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setRemoveTarget(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("removeTitle")}</DialogTitle>
              <DialogDescription>
                {t("removeDescription", { name: removeTarget.name })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRemoveTarget(null)}
                disabled={pending}
              >
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemove}
                disabled={pending}
              >
                {pending ? t("deleting") : t("remove")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function FileStatusBadge({ file }: { file: RagLibraryFileRow }) {
  const t = useTranslations("Rag");

  if (file.status === "READY" && file.stale) {
    return (
      <Badge variant="outline" className="text-amber-600">
        <AlertCircle />
        {t("statusStale")}
      </Badge>
    );
  }

  switch (file.status) {
    case "READY":
      return (
        <Badge variant="secondary">
          <CheckCircle2 />
          {t("statusReady")}
        </Badge>
      );
    case "PROCESSING":
      return (
        <Badge variant="outline">
          <Loader2 className="animate-spin" />
          {t("statusProcessing")}
        </Badge>
      );
    case "QUEUED":
      return (
        <Badge variant="outline">
          <Clock />
          {t("statusQueued")}
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="destructive" title={file.error ?? undefined}>
          <AlertCircle />
          {t("statusFailed")}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <Clock />
          {t("statusPending")}
        </Badge>
      );
  }
}

function FilePickerDialog({
  libraryId,
  candidates,
  folders,
  existingFileIds,
  onClose,
  onAdded,
  onError,
}: {
  libraryId: string;
  candidates: RagFileCandidate[];
  folders: RagFolderCandidate[];
  existingFileIds: Set<string>;
  onClose: () => void;
  onAdded: () => void;
  onError: (message: string) => void;
}) {
  const t = useTranslations("Rag");
  const locale = useLocale();
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const folderById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );
  const visibleFolders = folders.filter(
    (folder) => folder.parentId === currentFolder,
  );
  const visibleFiles = candidates.filter((file) => {
    if (file.folderId !== currentFolder) return false;
    if (!search.trim()) return true;
    return file.name.toLowerCase().includes(search.trim().toLowerCase());
  });
  const currentPath = useMemo(() => {
    const names: string[] = [];
    let cursor = currentFolder;
    for (let depth = 0; cursor && depth < 20; depth += 1) {
      const folder = folderById.get(cursor);
      if (!folder) break;
      names.unshift(folder.name);
      cursor = folder.parentId;
    }
    return names;
  }, [currentFolder, folderById]);

  function toggle(fileId: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(fileId);
      else next.delete(fileId);
      return next;
    });
  }

  function handleAdd() {
    if (selected.size === 0) return;
    startTransition(async () => {
      const result = await addLibraryFiles({
        libraryId,
        fileIds: [...selected],
      });
      if (!result.ok) {
        onError(t(`errors.${result.error}`));
        return;
      }
      onAdded();
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("pickerTitle")}</DialogTitle>
          <DialogDescription>{t("pickerDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("pickerSearch")}
          />

          <div className="flex items-center gap-2 text-sm">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                const current = currentFolder
                  ? folderById.get(currentFolder)
                  : null;
                setCurrentFolder(current?.parentId ?? null);
              }}
              disabled={currentFolder === null}
              aria-label={t("back")}
            >
              <ChevronLeft />
            </Button>
            <span className="text-muted-foreground">
              {["/", ...currentPath].join(" / ")}
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto rounded-lg border">
            {visibleFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => {
                  setCurrentFolder(folder.id);
                  setSearch("");
                }}
                className="flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50"
              >
                <Folder className="size-4 text-muted-foreground" />
                {folder.name}
              </button>
            ))}

            {visibleFiles.length === 0 ? (
              <p className="px-3 py-8 text-center text-muted-foreground text-sm">
                {t("pickerEmpty")}
              </p>
            ) : (
              visibleFiles.map((file) => {
                const exists = existingFileIds.has(file.id);
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`rag-picker-${file.id}`}
                      checked={exists || selected.has(file.id)}
                      disabled={exists}
                      onCheckedChange={(checked) =>
                        toggle(file.id, checked === true)
                      }
                    />
                    <FileText className="size-4 text-muted-foreground" />
                    <Label
                      htmlFor={`rag-picker-${file.id}`}
                      className="min-w-0 flex-1 cursor-pointer truncate font-normal"
                    >
                      {file.name}
                    </Label>
                    <span className="text-muted-foreground text-xs">
                      {exists
                        ? t("alreadyAdded")
                        : formatBytes(file.size, locale)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={pending || selected.size === 0}
          >
            {pending ? t("saving") : t("addSelected", { count: selected.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
