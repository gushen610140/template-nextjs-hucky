"use server";

import { revalidatePath } from "next/cache";
import { canAccessFile, guardFileAction } from "@/lib/files/auth";
import { describeFilePreview, MAX_TEXT_BYTES } from "@/lib/files/preview";
import { findFileForAction } from "@/lib/files/queries";
import type { FileEditResult, FileEditTarget } from "@/lib/files/types";
import { prisma } from "@/lib/prisma";
import { headObject } from "@/lib/storage/objects";
import { createUploadUrl } from "@/lib/storage/presign";

/**
 * 预览页的写操作。
 *
 * 编辑采用「同对象键覆盖 + HEAD 回填元数据」:
 * 1. 客户端带页面加载时的 `updatedAt` 换预签名 PUT
 * 2. 浏览器直接 PUT 新内容, 失败时旧对象不受影响
 * 3. 提交后回查真实大小 / ETag, 再更新数据库
 *
 * 没有真正的行锁: `updatedAt` 只能发现并提示并发修改。
 */

function revalidateFileViews(): void {
  revalidatePath("/[locale]/dashboard/files", "page");
  revalidatePath("/[locale]/dashboard/files/all", "page");
  revalidatePath("/[locale]/dashboard/files/[id]", "page");
}

export async function createEditTarget(
  id: string,
  input: { size: number; expectedUpdatedAt: string },
): Promise<FileEditTarget> {
  const guard = await guardFileAction();
  if (!guard.ok) return guard;

  const file = await findFileForAction(id);
  if (!file || !canAccessFile(guard, file.ownerId) || file.status !== "READY") {
    return { ok: false, error: "not_found" };
  }

  const preview = describeFilePreview(file.name, file.mimeType);
  if (!preview.editable) return { ok: false, error: "not_editable" };

  if (file.updatedAt.toISOString() !== input.expectedUpdatedAt) {
    return { ok: false, error: "conflict" };
  }

  if (
    !Number.isInteger(input.size) ||
    input.size < 0 ||
    input.size > MAX_TEXT_BYTES
  ) {
    return { ok: false, error: "too_large" };
  }

  try {
    const uploadUrl = await createUploadUrl(file.key, file.mimeType);
    return { ok: true, uploadUrl, contentType: file.mimeType };
  } catch (error) {
    console.error("createEditTarget failed:", error);
    return { ok: false, error: "unknown" };
  }
}

export async function commitEdit(
  id: string,
  input: { expectedUpdatedAt: string },
): Promise<FileEditResult> {
  const guard = await guardFileAction();
  if (!guard.ok) return guard;

  const file = await findFileForAction(id);
  if (!file || !canAccessFile(guard, file.ownerId) || file.status !== "READY") {
    return { ok: false, error: "not_found" };
  }

  const preview = describeFilePreview(file.name, file.mimeType);
  if (!preview.editable) return { ok: false, error: "not_editable" };

  if (file.updatedAt.toISOString() !== input.expectedUpdatedAt) {
    return { ok: false, error: "conflict" };
  }

  let object: Awaited<ReturnType<typeof headObject>>;
  try {
    object = await headObject(file.key);
  } catch (error) {
    console.error("commitEdit: head object failed:", error);
    return { ok: false, error: "unknown" };
  }

  if (!object) return { ok: false, error: "not_found" };
  if (object.size > MAX_TEXT_BYTES) {
    return { ok: false, error: "too_large" };
  }

  try {
    const updated = await prisma.fileObject.update({
      where: { id: file.id },
      data: {
        size: BigInt(object.size),
        etag: object.etag,
      },
      select: { size: true, updatedAt: true },
    });

    revalidateFileViews();
    return {
      ok: true,
      size: Number(updated.size),
      updatedAt: updated.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error("commitEdit failed:", error);
    return { ok: false, error: "unknown" };
  }
}
