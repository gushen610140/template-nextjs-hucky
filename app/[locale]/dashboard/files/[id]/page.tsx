import { notFound } from "next/navigation";
import { FileViewer } from "@/components/files/viewer/file-viewer";
import { requireUser } from "@/lib/auth";
import { getUserPermissions } from "@/lib/authz";
import {
  describeFilePreview,
  MAX_TEXT_BYTES,
  previewContentType,
} from "@/lib/files/preview";
import { getFileDetail } from "@/lib/files/queries";
import { decodeText } from "@/lib/files/text";
import { PERMISSIONS } from "@/lib/permissions";
import { readObjectPrefix } from "@/lib/storage/objects";
import { createPreviewUrl } from "@/lib/storage/presign";

type FilePreviewPageProps = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * 单文件预览页。
 *
 * 文本类在服务端读取 (有字节上限), 图片 / PDF / 音视频只签发
 * inline 预签名 URL, 文件本体不经过 Next.js。
 * 权限按 `file:own` / `file:manage` + 行级归属双重校验。
 */
export default async function FilePreviewPage({
  params,
  searchParams,
}: FilePreviewPageProps) {
  const { locale, id } = await params;
  const user = await requireUser();
  const permissions = await getUserPermissions(user.id);

  const canManage = permissions.has(PERMISSIONS.fileManage);
  const canOwn = permissions.has(PERMISSIONS.fileOwn);
  if (!canManage && !canOwn) notFound();

  const file = await getFileDetail(id);
  if (!file || file.status !== "READY") notFound();
  if (!canManage && file.ownerId !== user.id) notFound();

  const preview = describeFilePreview(file.name, file.mimeType);
  const rawFrom = (await searchParams).from;
  const from = Array.isArray(rawFrom) ? rawFrom[0] : rawFrom;

  let previewUrl: string | null = null;
  let textContent: string | null = null;
  let textTruncated = false;
  let textBinary = false;
  let storageError = false;

  if (preview.inline || preview.kind === "docx" || preview.kind === "xlsx") {
    try {
      previewUrl = await createPreviewUrl(
        file.key,
        previewContentType(file.name, file.mimeType, preview.kind),
        file.name,
      );
    } catch (error) {
      console.error("file preview: presign failed:", error);
      storageError = true;
    }
  }

  if (preview.textual && !storageError) {
    if (file.size > MAX_TEXT_BYTES) {
      textTruncated = true;
    } else {
      try {
        const { bytes } = await readObjectPrefix(file.key, MAX_TEXT_BYTES);
        const decoded = decodeText(bytes);
        textContent = decoded.text;
        textBinary = decoded.binary;
      } catch (error) {
        console.error("file preview: read text failed:", error);
        storageError = true;
      }
    }
  }

  const fallbackHref =
    from === "all" && canManage
      ? `/${locale}/dashboard/files/all`
      : canOwn
        ? `/${locale}/dashboard/files`
        : `/${locale}/dashboard/files/all`;

  return (
    <FileViewer
      file={{
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        owner: file.owner,
        folderName: file.folder?.name ?? null,
      }}
      preview={{
        kind: preview.kind,
        language: preview.language,
        editable: preview.editable,
        textual: preview.textual,
        inline: preview.inline,
      }}
      previewUrl={previewUrl}
      textContent={textContent}
      textTruncated={textTruncated}
      textBinary={textBinary}
      storageError={storageError}
      managed={canManage && file.ownerId !== user.id}
      fallbackHref={fallbackHref}
    />
  );
}
