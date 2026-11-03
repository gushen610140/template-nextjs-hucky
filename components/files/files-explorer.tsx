"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Eye,
  FileUp,
  Folder,
  FolderPlus,
  Pencil,
  Search,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  completeUpload,
  createFolder,
  createUpload,
  deleteFile,
  deleteFolder,
  getDownloadUrl,
  moveFile,
  recoverPendingUploads,
  renameFolder,
} from "@/app/[locale]/dashboard/files/actions";
import { RenameFileDialog } from "@/components/files/rename-file-dialog";
import { ConfirmDeleteDialog } from "@/components/rbac/confirm-delete-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { formatBytes } from "@/lib/files/format";
import type {
  FileListResult,
  FileRow,
  FileSort,
  FolderRow,
} from "@/lib/files/types";
import { FILE_PAGE_SIZES } from "@/lib/files/types";
import { putToStorage } from "@/lib/files/upload-client";
import { getOfficeDocumentInfo } from "@/lib/onlyoffice/documents";
import { cn } from "@/lib/utils";

/** 行拖拽用的自定义 MIME; 与系统文件拖拽 (Files) 区分开 */
const FILE_DRAG_TYPE = "application/x-file-id";

type FileUserOption = {
  id: string;
  name: string | null;
  email: string;
};

type FilesExplorerProps = FileListResult & {
  scope: "own" | "all";
  /** 仅文件管理页: 用户筛选器选项 */
  users?: FileUserOption[];
  /** 仅文件管理页: 当前选中的用户, 为空表示全站平铺视图 */
  selectedOwnerId?: string | null;
};

type UploadTask = {
  key: string;
  name: string;
  progress: number;
};

type MenuState = {
  x: number;
  y: number;
  file: FileRow | null;
  folder: FolderRow | null;
};

export function FilesExplorer({
  scope,
  users = [],
  selectedOwnerId = null,
  files,
  folders,
  total,
  pageCount,
  state,
  breadcrumb,
  pendingCount: initialPendingCount,
}: FilesExplorerProps) {
  const t = useTranslations("Files");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<FileRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileRow | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] =
    useState<FolderRow | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] =
    useState<FolderRow | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(state.q);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [fileDragActive, setFileDragActive] = useState(false);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    setPendingCount(initialPendingCount);
  }, [initialPendingCount]);

  const own = scope === "own";
  /** 有属主上下文 (自己的文件 / 管理员选中的某个用户) 才有文件夹 */
  const folderMode = own || Boolean(selectedOwnerId);
  /** 管理员替选中用户操作时传入的目标属主 */
  const targetOwnerId = own ? null : selectedOwnerId;
  const selectedUser =
    users.find((user) => user.id === selectedOwnerId) ?? null;

  /** 列表状态全部放在 URL 里, 刷新 / 返回时保持一致 */
  function navigate(next: {
    q?: string;
    sort?: FileSort;
    dir?: "asc" | "desc";
    page?: number;
    perPage?: number;
    folder?: string | null;
    owner?: string | null;
  }) {
    const q = next.q ?? state.q;
    const sort = next.sort ?? state.sort;
    const dir = next.dir ?? state.dir;
    const page = next.page ?? 1;
    const perPage = next.perPage ?? state.pageSize;
    const folder = next.folder === undefined ? state.folderId : next.folder;
    const owner = next.owner === undefined ? selectedOwnerId : next.owner;

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sort !== "createdAt") params.set("sort", sort);
    if (dir !== "desc") params.set("dir", dir);
    if (page > 1) params.set("page", String(page));
    if (perPage !== FILE_PAGE_SIZES[0]) {
      params.set("perPage", String(perPage));
    }
    if (folder) params.set("folder", folder);
    if (owner) params.set("owner", owner);

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function errorText(code: string) {
    const key = `errors.${code}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  }

  /** 单击文件进入预览页; `from=all` 让返回按钮回到管理员视图 */
  function openPreview(file: FileRow) {
    const suffix = own ? "" : "?from=all";
    router.push(`/${locale}/dashboard/files/${file.id}${suffix}`);
  }

  function openOfficeEditor(file: FileRow) {
    router.push(`/${locale}/dashboard/files/${file.id}/edit`);
  }

  /** 服务端 DNS/网络抖动时, 客户端再补两次确认; completeUpload 是幂等的 */
  async function completeUploadWithRetry(id: string) {
    let result = await completeUpload(id);
    for (
      let attempt = 0;
      !result.ok &&
      (result.error === "storage_unavailable" || result.error === "unknown") &&
      attempt < 2;
      attempt += 1
    ) {
      await sleep(500 * (attempt + 1));
      result = await completeUpload(id);
    }
    return result;
  }

  async function recoverPending() {
    setRecovering(true);
    setBanner(null);

    const result = await recoverPendingUploads({ ownerId: targetOwnerId });
    setRecovering(false);

    if (!result.ok) {
      setBanner(errorText(result.error));
      return;
    }

    setPendingCount((current) =>
      Math.max(0, current - result.recovered - result.removed),
    );
    router.refresh();
  }

  async function uploadOne(file: File, folderId: string | null) {
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
        folderId,
        ownerId: targetOwnerId,
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

      const completed = await completeUploadWithRetry(target.id);
      if (!completed.ok) {
        setBanner(errorText(completed.error));
        router.refresh();
      }
    } catch (error) {
      console.error("upload failed:", error);
      setBanner(t("errors.upload_failed"));
    } finally {
      setUploads((current) => current.filter((task) => task.key !== taskKey));
    }
  }

  async function uploadFiles(selected: File[], folderId: string | null) {
    if (selected.length === 0) return;
    setBanner(null);
    // 串行上传: 进度条语义清晰, 也避免同时打满带宽
    for (const file of selected) {
      await uploadOne(file, folderId);
    }
  }

  async function handleSelected(fileList: FileList | null) {
    if (!fileList) return;
    await uploadFiles(Array.from(fileList), folderMode ? state.folderId : null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function isFileDrag(event: React.DragEvent): boolean {
    return Array.from(event.dataTransfer.types).includes("Files");
  }

  function isRowDrag(event: React.DragEvent): boolean {
    return event.dataTransfer.types.includes(FILE_DRAG_TYPE);
  }

  async function handleFolderDrop(
    event: React.DragEvent,
    folderId: string | null,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setDragOverFolder(null);
    setFileDragActive(false);

    if (isFileDrag(event) && event.dataTransfer.files.length > 0) {
      // 从文件资源管理器直接拖到文件夹 = 上传到该文件夹
      await uploadFiles(Array.from(event.dataTransfer.files), folderId);
      return;
    }

    const fileId = event.dataTransfer.getData(FILE_DRAG_TYPE);
    if (!fileId) return;

    const result = await moveFile(fileId, folderId);
    if (!result.ok) setBanner(errorText(result.error));
  }

  function sortBy(nextSort: FileSort) {
    const dir = state.sort === nextSort && state.dir === "asc" ? "desc" : "asc";
    navigate({ sort: nextSort, dir, page: 1 });
  }

  function clampMenuPoint(event: React.MouseEvent, height: number) {
    return {
      x: Math.min(event.clientX, window.innerWidth - 200),
      y: Math.min(event.clientY, window.innerHeight - height),
    };
  }

  function openFileMenu(event: React.MouseEvent, file: FileRow) {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ ...clampMenuPoint(event, 140), file, folder: null });
  }

  function openFolderMenu(event: React.MouseEvent, folder: FolderRow) {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ ...clampMenuPoint(event, 100), file: null, folder });
  }

  function openBlankMenu(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!folderMode) return;

    // 输入框 / 按钮 / 面包屑上的右键保留浏览器默认行为
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, button, nav, [role='menu']")) return;

    setMenu({ ...clampMenuPoint(event, 60), file: null, folder: null });
  }

  const parentCrumb =
    breadcrumb.length > 1 ? breadcrumb[breadcrumb.length - 2] : null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: 整块区域是拖拽上传与空白右键的落点, 不是可聚焦控件
    <div
      className="relative flex flex-1 flex-col gap-4 p-4 pt-0"
      onContextMenu={openBlankMenu}
      onDragOver={(event) => {
        if (!isFileDrag(event)) return;
        event.preventDefault();
        setFileDragActive(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }
        setFileDragActive(false);
      }}
      onDrop={(event) => {
        if (!isFileDrag(event)) return;
        event.preventDefault();
        setFileDragActive(false);
        void handleSelected(event.dataTransfer.files);
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading font-medium text-xl">
            {own ? t("title") : t("allTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {own
              ? t("description")
              : selectedUser
                ? t("scopedDescription", {
                    name: selectedUser.name ?? selectedUser.email,
                  })
                : t("allDescription")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {folderMode && (
            <>
              <Button
                variant="outline"
                onClick={() => setFolderDialogOpen(true)}
              >
                <FolderPlus />
                {t("newFolder")}
              </Button>
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
            </>
          )}
        </div>
      </div>

      {folderMode && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            disabled={!parentCrumb}
            onClick={() =>
              navigate({ folder: parentCrumb?.id ?? null, page: 1 })
            }
          >
            <ArrowLeft />
            {t("back")}
          </Button>
          <nav
            aria-label={t("breadcrumb")}
            className="flex flex-wrap items-center gap-1"
          >
            {breadcrumb.map((crumb, index) => (
              <span
                key={crumb.id ?? "root"}
                className="flex items-center gap-1"
              >
                {index > 0 && (
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                )}
                <button
                  type="button"
                  onClick={() => navigate({ folder: crumb.id, page: 1 })}
                  onDragOver={(event) => {
                    if (!isRowDrag(event)) return;
                    event.preventDefault();
                    setDragOverFolder(crumb.id ?? "root");
                  }}
                  onDragLeave={() => setDragOverFolder(null)}
                  onDrop={(event) => handleFolderDrop(event, crumb.id)}
                  className={cn(
                    "rounded px-1.5 py-0.5 transition-colors hover:bg-muted",
                    index === breadcrumb.length - 1
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                    dragOverFolder === (crumb.id ?? "root") &&
                      "bg-primary/10 ring-1 ring-primary",
                  )}
                >
                  {crumb.id === null ? t("root") : crumb.name}
                </button>
              </span>
            ))}
          </nav>
        </div>
      )}

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          navigate({ q: searchValue.trim(), page: 1 });
        }}
      >
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-8"
          />
          {searchValue && (
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearchValue("");
                navigate({ q: "", page: 1 });
              }}
              aria-label={t("clearSearch")}
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {!own && users.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setUserPickerOpen(true)}
            className="gap-2"
            aria-label={t("userFilter")}
          >
            <UserRound />
            <span className="max-w-40 truncate">
              {selectedUser
                ? (selectedUser.name ?? selectedUser.email)
                : t("allUsers")}
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        )}
      </form>

      {banner && (
        <Alert variant="destructive">
          <AlertDescription>{banner}</AlertDescription>
        </Alert>
      )}

      {pendingCount > 0 && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{t("pendingUploads", { count: pendingCount })}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void recoverPending()}
              disabled={recovering}
            >
              {recovering ? t("recovering") : t("recoverPending")}
            </Button>
          </AlertDescription>
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
              <TableHead>
                <SortButton
                  label={t("name")}
                  active={state.sort === "name"}
                  dir={state.dir}
                  onClick={() => sortBy("name")}
                />
              </TableHead>
              {!own && <TableHead>{t("owner")}</TableHead>}
              <TableHead>
                <SortButton
                  label={t("size")}
                  active={state.sort === "size"}
                  dir={state.dir}
                  onClick={() => sortBy("size")}
                />
              </TableHead>
              <TableHead>
                <SortButton
                  label={t("createdAt")}
                  active={state.sort === "createdAt"}
                  dir={state.dir}
                  onClick={() => sortBy("createdAt")}
                />
              </TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {folders.map((folder) => (
              <TableRow
                key={folder.id}
                onDoubleClick={() => navigate({ folder: folder.id, page: 1 })}
                onContextMenu={(event) => openFolderMenu(event, folder)}
                onDragOver={(event) => {
                  if (!isRowDrag(event) && !isFileDrag(event)) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOverFolder(folder.id);
                }}
                onDragLeave={() => setDragOverFolder(null)}
                onDrop={(event) => handleFolderDrop(event, folder.id)}
                className={cn(
                  "cursor-pointer select-none",
                  dragOverFolder === folder.id &&
                    "bg-primary/5 ring-1 ring-primary ring-inset",
                )}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Folder className="size-4 text-muted-foreground" />
                    <div className="grid min-w-0">
                      <span className="truncate font-medium">
                        {folder.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {t("folderFileCount", { count: folder.fileCount })}
                      </span>
                    </div>
                  </div>
                </TableCell>
                {!own && (
                  <TableCell className="text-muted-foreground text-sm">
                    {selectedUser?.name ?? selectedUser?.email ?? "—"}
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground text-sm">
                  —
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                  }).format(new Date(folder.createdAt))}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setRenameFolderTarget(folder)}
                      aria-label={t("renameFolder")}
                      title={t("renameFolder")}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive"
                      onClick={() => setDeleteFolderTarget(folder)}
                      aria-label={t("deleteFolder")}
                      title={t("deleteFolder")}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {files.map((file) => (
              <TableRow
                key={file.id}
                draggable={folderMode}
                onClick={(event) => {
                  if (
                    (event.target as HTMLElement).closest("button, a, input")
                  ) {
                    return;
                  }
                  openPreview(file);
                }}
                onDragStart={(event) => {
                  event.dataTransfer.setData(FILE_DRAG_TYPE, file.id);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onContextMenu={(event) => openFileMenu(event, file)}
                className={cn(
                  "cursor-pointer",
                  folderMode && "active:cursor-grabbing",
                )}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <FileUp className="size-4 text-muted-foreground" />
                    <div className="grid min-w-0">
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="truncate text-muted-foreground text-xs">
                        {file.mimeType}
                      </span>
                    </div>
                  </div>
                </TableCell>
                {!own && (
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
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openPreview(file)}
                      aria-label={t("preview")}
                      title={t("preview")}
                    >
                      <Eye />
                    </Button>
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
            ))}

            {files.length === 0 && folders.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={own ? 4 : 5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {state.q || (folderMode && state.folderId)
                    ? t("emptyFiltered")
                    : t("empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {t("totalCount", { count: total })}
        </span>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {t("perPage", { count: state.pageSize })}
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {FILE_PAGE_SIZES.map((size) => (
                <DropdownMenuItem
                  key={size}
                  onSelect={() => navigate({ perPage: size, page: 1 })}
                >
                  {t("perPage", { count: size })}
                  {state.pageSize === size && <Check className="ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            disabled={state.page <= 1}
            onClick={() => navigate({ page: state.page - 1 })}
          >
            <ChevronLeft />
            {t("prev")}
          </Button>
          <span className="text-muted-foreground tabular-nums">
            {t("pageOf", { page: state.page, total: pageCount })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={state.page >= pageCount}
            onClick={() => navigate({ page: state.page + 1 })}
          >
            {t("next")}
            <ChevronRight />
          </Button>
        </div>
      </div>

      {fileDragActive && (
        <div className="pointer-events-none absolute inset-2 z-40 flex items-center justify-center rounded-xl border-2 border-primary border-dashed bg-background/80">
          <span className="font-medium text-sm">{t("dropToUpload")}</span>
        </div>
      )}

      {menu && (
        <ContextMenu
          menu={menu}
          onClose={() => setMenu(null)}
          canCreateFolder={folderMode}
          onRenameFile={(file) => setRenameTarget(file)}
          onPreviewFile={openPreview}
          onEditOfficeFile={openOfficeEditor}
          onDownloadFile={(file) => downloadFile(file, setBanner, errorText)}
          onDeleteFile={(file) => setDeleteTarget(file)}
          onRenameFolder={(folder) => setRenameFolderTarget(folder)}
          onDeleteFolder={(folder) => setDeleteFolderTarget(folder)}
          onNewFolder={() => setFolderDialogOpen(true)}
        />
      )}

      {renameTarget && (
        <RenameFileDialog
          key={renameTarget.id}
          file={renameTarget}
          onClose={() => setRenameTarget(null)}
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

      {renameFolderTarget && (
        <RenameFolderDialog
          key={renameFolderTarget.id}
          folder={renameFolderTarget}
          onClose={() => setRenameFolderTarget(null)}
          errorText={errorText}
        />
      )}

      {deleteFolderTarget && (
        <ConfirmDeleteDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteFolderTarget(null);
          }}
          title={t("deleteFolderTitle")}
          description={t("deleteFolderDescription", {
            name: deleteFolderTarget.name,
          })}
          confirmLabel={t("deleteFolder")}
          cancelLabel={t("cancel")}
          pendingLabel={t("deleting")}
          onConfirm={async () => {
            const result = await deleteFolder(deleteFolderTarget.id);
            return result.ok
              ? result
              : { ok: false, error: errorText(result.error) };
          }}
        />
      )}

      {folderDialogOpen && (
        <FolderDialog
          parentId={state.folderId}
          ownerId={targetOwnerId}
          onClose={() => setFolderDialogOpen(false)}
          errorText={errorText}
        />
      )}

      {userPickerOpen && (
        <UserPickerDialog
          users={users}
          selectedOwnerId={selectedOwnerId}
          onSelect={(ownerId) => {
            setUserPickerOpen(false);
            navigate({ owner: ownerId, folder: null, page: 1 });
          }}
          onClose={() => setUserPickerOpen(false)}
        />
      )}
    </div>
  );
}

type SortButtonProps = {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
};

function SortButton({ label, active, dir, onClick }: SortButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 hover:text-foreground",
        active && "text-foreground",
      )}
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ChevronUp className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )
      ) : null}
    </button>
  );
}

type ContextMenuProps = {
  menu: MenuState;
  onClose: () => void;
  canCreateFolder: boolean;
  onRenameFile: (file: FileRow) => void;
  onPreviewFile: (file: FileRow) => void;
  onEditOfficeFile: (file: FileRow) => void;
  onDownloadFile: (file: FileRow) => void;
  onDeleteFile: (file: FileRow) => void;
  onRenameFolder: (folder: FolderRow) => void;
  onDeleteFolder: (folder: FolderRow) => void;
  onNewFolder: () => void;
};

function ContextMenu({
  menu,
  onClose,
  canCreateFolder,
  onRenameFile,
  onPreviewFile,
  onEditOfficeFile,
  onDownloadFile,
  onDeleteFile,
  onRenameFolder,
  onDeleteFolder,
  onNewFolder,
}: ContextMenuProps) {
  const t = useTranslations("Files");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (ref.current?.contains(event.target as Node)) return;
      onClose();
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  const { file, folder } = menu;

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 min-w-44 rounded-lg border bg-popover p-1 shadow-md"
      style={{ left: menu.x, top: menu.y }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {file && (
        <>
          <MenuItem
            icon={<Eye />}
            label={t("preview")}
            onClick={() => {
              onPreviewFile(file);
              onClose();
            }}
          />
          {getOfficeDocumentInfo(file.name, file.mimeType) && (
            <MenuItem
              icon={<Pencil />}
              label={t("editOffice")}
              onClick={() => {
                onEditOfficeFile(file);
                onClose();
              }}
            />
          )}
          <MenuItem
            icon={<Pencil />}
            label={t("rename")}
            onClick={() => {
              onRenameFile(file);
              onClose();
            }}
          />
          <MenuItem
            icon={<Download />}
            label={t("download")}
            onClick={() => {
              onDownloadFile(file);
              onClose();
            }}
          />
          <MenuItem
            icon={<Trash2 />}
            label={t("delete")}
            destructive
            onClick={() => {
              onDeleteFile(file);
              onClose();
            }}
          />
        </>
      )}

      {folder && (
        <>
          <MenuItem
            icon={<Pencil />}
            label={t("renameFolder")}
            onClick={() => {
              onRenameFolder(folder);
              onClose();
            }}
          />
          <MenuItem
            icon={<Trash2 />}
            label={t("deleteFolder")}
            destructive
            onClick={() => {
              onDeleteFolder(folder);
              onClose();
            }}
          />
        </>
      )}

      {!file && !folder && canCreateFolder && (
        <MenuItem
          icon={<FolderPlus />}
          label={t("newFolder")}
          onClick={() => {
            onNewFolder();
            onClose();
          }}
        />
      )}
    </div>
  );
}

type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
  onClick: () => void;
};

function MenuItem({ icon, label, destructive, onClick }: MenuItemProps) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted [&_svg]:size-4",
        destructive && "text-destructive hover:bg-destructive/10",
      )}
    >
      {icon}
      {label}
    </button>
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

/** 右键菜单触发的下载: 先把错误写到页面顶部横幅, 再跳转预签名地址 */
function downloadFile(
  file: FileRow,
  setBanner: (message: string) => void,
  errorText: (code: string) => string,
) {
  void getDownloadUrl(file.id).then((result) => {
    if (!result.ok) {
      setBanner(errorText(result.error));
      return;
    }
    window.location.assign(result.url);
  });
}

type RenameFolderDialogProps = {
  folder: FolderRow;
  onClose: () => void;
  errorText: (code: string) => string;
};

function RenameFolderDialog({
  folder,
  onClose,
  errorText,
}: RenameFolderDialogProps) {
  const t = useTranslations("Files");
  const [name, setName] = useState(folder.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await renameFolder(folder.id, name);
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
            <DialogTitle>{t("renameFolderTitle")}</DialogTitle>
            <DialogDescription>
              {t("renameFolderDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="folder-name">{t("folderName")}</Label>
            <Input
              id="folder-name"
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

type FolderDialogProps = {
  parentId: string | null;
  ownerId: string | null;
  onClose: () => void;
  errorText: (code: string) => string;
};
function FolderDialog({
  parentId,
  ownerId,
  onClose,
  errorText,
}: FolderDialogProps) {
  const t = useTranslations("Files");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createFolder({ name, parentId, ownerId });
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
            <DialogTitle>{t("newFolderTitle")}</DialogTitle>
            <DialogDescription>{t("newFolderDescription")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="folder-name">{t("folderName")}</Label>
            <Input
              id="folder-name"
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
              {pending ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type UserPickerDialogProps = {
  users: FileUserOption[];
  selectedOwnerId: string | null;
  onSelect: (ownerId: string | null) => void;
  onClose: () => void;
};

/** 用列表选择的用户筛选器; 单击一行立即生效并关闭 */
function UserPickerDialog({
  users,
  selectedOwnerId,
  onSelect,
  onClose,
}: UserPickerDialogProps) {
  const t = useTranslations("Files");

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("userFilterTitle")}</DialogTitle>
          <DialogDescription>{t("userFilterDescription")}</DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto rounded-lg border">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={cn(
              "flex w-full items-center gap-2.5 border-b px-3 py-2.5 text-left transition-colors hover:bg-muted",
              selectedOwnerId === null && "bg-muted/60",
            )}
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserRound className="size-4" />
            </span>
            <span className="font-medium text-sm">{t("allUsers")}</span>
            {selectedOwnerId === null && <Check className="ml-auto size-4" />}
          </button>

          {users.map((user) => {
            const label = user.name ?? user.email;
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => onSelect(user.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted",
                  selectedOwnerId === user.id && "bg-muted/60",
                )}
              >
                <Avatar size="sm">
                  <AvatarFallback>
                    {label.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="grid min-w-0">
                  <span className="truncate font-medium text-sm">{label}</span>
                  <span className="truncate text-muted-foreground text-xs">
                    {user.email}
                  </span>
                </span>
                {selectedOwnerId === user.id && (
                  <Check className="ml-auto size-4" />
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
