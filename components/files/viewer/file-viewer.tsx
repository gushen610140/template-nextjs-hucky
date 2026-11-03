"use client";

import {
  ArrowLeft,
  Download,
  FileAudio,
  FileCode,
  FileImage,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Loader2,
  Maximize2,
  Minimize2,
  Pencil,
  Save,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  commitEdit,
  createEditTarget,
} from "@/app/[locale]/dashboard/files/[id]/actions";
import { getDownloadUrl } from "@/app/[locale]/dashboard/files/actions";
import { RenameFileDialog } from "@/components/files/rename-file-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatBytes } from "@/lib/files/format";
import type { CodeLanguage, PreviewKind } from "@/lib/files/preview";
import { putToStorage } from "@/lib/files/upload-client";
import {
  ImagePreview,
  MediaPreview,
  UnsupportedPreview,
} from "./simple-renderers";

type ViewerFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string | null; email: string };
  folderName: string | null;
};

type ViewerPreview = {
  kind: PreviewKind;
  language: CodeLanguage | null;
  editable: boolean;
  textual: boolean;
  inline: boolean;
};

type FileViewerProps = {
  file: ViewerFile;
  preview: ViewerPreview;
  previewUrl: string | null;
  textContent: string | null;
  textTruncated: boolean;
  textBinary: boolean;
  storageError: boolean;
  managed: boolean;
  fallbackHref: string;
  /** Office 文件的在线编辑入口; 其他类型为 null */
  officeEditHref?: string | null;
};

type Banner = { tone: "success" | "error"; text: string };

function PreviewSkeleton() {
  return (
    <div className="h-full min-h-40 animate-pulse rounded-xl border bg-muted/40" />
  );
}

const CodeSurface = dynamic(
  () => import("./code-surface").then((mod) => mod.CodeSurface),
  { ssr: false, loading: PreviewSkeleton },
);

const MarkdownPreview = dynamic(
  () => import("./markdown-preview").then((mod) => mod.MarkdownPreview),
  { ssr: false, loading: PreviewSkeleton },
);

const CsvPreview = dynamic(
  () => import("./csv-preview").then((mod) => mod.CsvPreview),
  { ssr: false, loading: PreviewSkeleton },
);

const DocxPreview = dynamic(
  () => import("./docx-preview").then((mod) => mod.DocxPreview),
  { ssr: false, loading: PreviewSkeleton },
);

const XlsxPreview = dynamic(
  () => import("./xlsx-preview").then((mod) => mod.XlsxPreview),
  { ssr: false, loading: PreviewSkeleton },
);

const PdfPreview = dynamic(
  () => import("./pdf-preview").then((mod) => mod.PdfPreview),
  { ssr: false, loading: PreviewSkeleton },
);

function KindIcon({ kind }: { kind: PreviewKind }) {
  switch (kind) {
    case "image":
      return <FileImage />;
    case "pdf":
      return <FileText />;
    case "video":
      return <FileVideo />;
    case "audio":
      return <FileAudio />;
    case "docx":
      return <FileText />;
    case "xlsx":
      return <FileSpreadsheet />;
    case "markdown":
    case "json":
    case "csv":
    case "text":
      return <FileCode />;
    default:
      return <FileQuestion />;
  }
}

export function FileViewer({
  file,
  preview,
  previewUrl,
  textContent,
  textTruncated,
  textBinary,
  storageError,
  managed,
  fallbackHref,
  officeEditHref = null,
}: FileViewerProps) {
  const t = useTranslations("FileViewer");
  const locale = useLocale();
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(file.name);
  const [size, setSize] = useState(file.size);
  const [updatedAt, setUpdatedAt] = useState(file.updatedAt);
  const [savedText, setSavedText] = useState(textContent ?? "");
  const [draft, setDraft] = useState(textContent ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [discardIntent, setDiscardIntent] = useState<"back" | "cancel" | null>(
    null,
  );
  const [fullscreen, setFullscreen] = useState(false);

  const dirty = editing && draft !== savedText;
  const canEdit =
    preview.editable &&
    !storageError &&
    !textTruncated &&
    !textBinary &&
    textContent !== null;

  const errorText = useCallback(
    (code: string) => {
      const key = `errors.${code}`;
      return t.has(key) ? t(key) : t("errors.unknown");
    },
    [t],
  );

  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  // 重命名等操作会刷新服务端数据, 同步乐观锁令牌和大小, 避免保存时误报 conflict
  useEffect(() => {
    setUpdatedAt(file.updatedAt);
  }, [file.updatedAt]);

  useEffect(() => {
    setSize(file.size);
  }, [file.size]);

  useEffect(() => {
    function handleFullscreen() {
      setFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  const save = useCallback(async () => {
    if (!canEdit || saving || draft === savedText) return;

    const body = new Blob([draft], { type: file.mimeType });
    setSaving(true);
    setProgress(0);
    setBanner(null);

    try {
      const target = await createEditTarget(file.id, {
        size: body.size,
        expectedUpdatedAt: updatedAt,
      });
      if (!target.ok) {
        setBanner({ tone: "error", text: errorText(target.error) });
        return;
      }

      await putToStorage(
        target.uploadUrl,
        target.contentType,
        body,
        setProgress,
      );

      const result = await commitEdit(file.id, {
        expectedUpdatedAt: updatedAt,
      });
      if (!result.ok) {
        setBanner({ tone: "error", text: errorText(result.error) });
        return;
      }

      setSavedText(draft);
      setUpdatedAt(result.updatedAt);
      setSize(result.size);
      setEditing(false);
      setBanner({ tone: "success", text: t("saved") });
    } catch (error) {
      console.error("save file failed:", error);
      setBanner({ tone: "error", text: t("errors.unknown") });
    } finally {
      setSaving(false);
      setProgress(0);
    }
  }, [
    canEdit,
    draft,
    errorText,
    file.id,
    file.mimeType,
    savedText,
    saving,
    t,
    updatedAt,
  ]);

  useEffect(() => {
    if (!editing) return;
    function handleKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editing, save]);

  function navigateBack() {
    if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  }

  function goBack() {
    if (dirty) {
      setDiscardIntent("back");
      return;
    }
    navigateBack();
  }

  function startEditing() {
    setDraft(savedText);
    setBanner(null);
    setEditing(true);
  }

  function resetEditing() {
    setDraft(savedText);
    setBanner(null);
    setEditing(false);
  }

  function cancelEditing() {
    if (dirty) {
      setDiscardIntent("cancel");
      return;
    }
    resetEditing();
  }

  function confirmDiscard() {
    const intent = discardIntent;
    setDiscardIntent(null);
    if (intent === "back") {
      navigateBack();
      return;
    }
    if (intent === "cancel") resetEditing();
  }

  async function download() {
    setBanner(null);
    const result = await getDownloadUrl(file.id);
    if (!result.ok) {
      setBanner({ tone: "error", text: errorText(result.error) });
      return;
    }
    window.location.assign(result.url);
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await containerRef.current?.requestFullscreen();
  }

  function renderContent() {
    if (storageError) {
      return (
        <NoticeCard
          title={t("storageFailedTitle")}
          description={t("storageFailed")}
          action={
            <Button variant="outline" onClick={() => router.refresh()}>
              {t("retry")}
            </Button>
          }
        />
      );
    }

    if (preview.textual) {
      if (textTruncated) {
        return (
          <NoticeCard
            title={t("textTooLargeTitle")}
            description={t("textTooLarge")}
            action={
              <Button variant="outline" onClick={() => void download()}>
                {t("download")}
              </Button>
            }
          />
        );
      }

      if (textBinary) {
        return (
          <NoticeCard
            title={t("binaryTitle")}
            description={t("binaryDescription")}
            action={
              <Button variant="outline" onClick={() => void download()}>
                {t("download")}
              </Button>
            }
          />
        );
      }

      if (editing) {
        return (
          <CodeSurface
            value={draft}
            language={preview.language}
            editable
            onChange={setDraft}
          />
        );
      }

      if (preview.kind === "markdown") {
        return <MarkdownPreview content={savedText} />;
      }

      if (preview.kind === "csv") {
        return <CsvPreview content={savedText} />;
      }

      return (
        <CodeSurface
          value={savedText}
          language={preview.language}
          editable={false}
        />
      );
    }

    if (preview.inline) {
      if (!previewUrl) {
        return (
          <NoticeCard
            title={t("storageFailedTitle")}
            description={t("storageFailed")}
          />
        );
      }

      if (preview.kind === "image") {
        return <ImagePreview url={previewUrl} name={name} />;
      }
      if (preview.kind === "pdf") {
        return <PdfPreview url={previewUrl} name={name} />;
      }
      if (preview.kind === "video" || preview.kind === "audio") {
        return (
          <MediaPreview url={previewUrl} name={name} kind={preview.kind} />
        );
      }
    }

    if (preview.kind === "docx" && previewUrl) {
      return <DocxPreview url={previewUrl} name={name} />;
    }

    if (preview.kind === "xlsx" && previewUrl) {
      return <XlsxPreview url={previewUrl} name={name} />;
    }

    return (
      <UnsupportedPreview name={name} onDownload={() => void download()} />
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-x-0 top-16 bottom-0 flex min-h-0 flex-col gap-3 overflow-hidden bg-background p-4 pt-0 [&:fullscreen]:inset-0 [&:fullscreen]:p-4"
    >
      <header className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={goBack}
          aria-label={t("back")}
        >
          <ArrowLeft />
        </Button>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <KindIcon kind={preview.kind} />
        </div>

        <div className="grid min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-medium">{name}</span>
            {dirty && (
              <span
                className="size-2 shrink-0 rounded-full bg-amber-500"
                title={t("unsaved")}
              />
            )}
            {managed && (
              <Badge variant="outline" className="shrink-0">
                {t("managedBadge")}
              </Badge>
            )}
          </div>
          <span className="truncate text-muted-foreground text-xs">
            {file.mimeType} · {formatBytes(size, locale)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelEditing}
                disabled={saving}
              >
                <X />
                {t("cancel")}
              </Button>
              <Button
                size="sm"
                onClick={() => void save()}
                disabled={saving || !dirty}
              >
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                {saving
                  ? t("savingWithProgress", {
                      progress: Math.round(progress * 100),
                    })
                  : t("save")}
              </Button>
            </>
          ) : (
            <>
              {officeEditHref && (
                <Button size="sm" asChild>
                  <Link href={officeEditHref}>{t("officeEdit")}</Link>
                </Button>
              )}
              {canEdit && (
                <Button size="sm" onClick={startEditing}>
                  <Pencil />
                  {t("edit")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setRenameOpen(true)}
                aria-label={t("rename")}
                title={t("rename")}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void download()}
                aria-label={t("download")}
                title={t("download")}
              >
                <Download />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void toggleFullscreen()}
                aria-label={fullscreen ? t("exitFullscreen") : t("fullscreen")}
                title={fullscreen ? t("exitFullscreen") : t("fullscreen")}
              >
                {fullscreen ? <Minimize2 /> : <Maximize2 />}
              </Button>
            </>
          )}
        </div>
      </header>

      {banner && (
        <Alert
          variant={banner.tone === "error" ? "destructive" : "default"}
          className={banner.tone === "success" ? "border-emerald-500/40" : ""}
        >
          <AlertDescription
            className={
              banner.tone === "success"
                ? "text-emerald-600 dark:text-emerald-400"
                : undefined
            }
          >
            {banner.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          {renderContent()}
        </div>

        <aside
          className="hidden w-64 shrink-0 overflow-y-auto rounded-xl border bg-card p-4 lg:block"
          data-lenis-prevent
        >
          <dl className="space-y-3 text-sm">
            <MetadataRow label={t("metadata.type")} value={file.mimeType} />
            <MetadataRow
              label={t("metadata.size")}
              value={formatBytes(size, locale)}
            />
            <MetadataRow
              label={t("metadata.owner")}
              value={file.owner.name ?? file.owner.email}
            />
            <MetadataRow
              label={t("metadata.folder")}
              value={file.folderName ?? t("metadata.root")}
            />
            <MetadataRow
              label={t("metadata.createdAt")}
              value={new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(file.createdAt))}
            />
            <MetadataRow
              label={t("metadata.updatedAt")}
              value={new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(updatedAt))}
            />
          </dl>
        </aside>
      </div>

      {renameOpen && (
        <RenameFileDialog
          file={{ id: file.id, name }}
          onClose={() => setRenameOpen(false)}
          onRenamed={(next) => {
            setName(next);
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={discardIntent !== null}
        onOpenChange={(open) => {
          if (!open) setDiscardIntent(null);
        }}
        title={t("discardTitle")}
        description={t("discardDescription")}
        confirmLabel={t("discardConfirm")}
        cancelLabel={t("keepEditing")}
        destructive
        onConfirm={confirmDiscard}
      />
    </div>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}

function NoticeCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 rounded-xl border bg-card p-6 text-center">
      <FileQuestion className="size-9 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="max-w-md text-muted-foreground text-sm">{description}</p>
      {action}
    </div>
  );
}
