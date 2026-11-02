"use server";

import { revalidatePath } from "next/cache";
import { canAccessFile, guardFileAction } from "@/lib/files/auth";
import { findFileForAction } from "@/lib/files/queries";
import type {
  FileActionResult,
  FileDownloadTarget,
  FileUploadTarget,
} from "@/lib/files/types";
import { prisma } from "@/lib/prisma";
import { getStorageBucket } from "@/lib/storage/config";
import { buildObjectKey } from "@/lib/storage/keys";
import {
  isValidMimeType,
  MAX_FILE_NAME_LENGTH,
  MAX_UPLOAD_BYTES,
} from "@/lib/storage/limits";
import { deleteObject, headObject } from "@/lib/storage/objects";
import { createDownloadUrl, createUploadUrl } from "@/lib/storage/presign";

/**
 * 文件相关 Server Action。
 *
 * 上传流程:
 * 1. `createUpload` 建 PENDING 记录并签发预签名 PUT 地址
 * 2. 浏览器直接 PUT 到 RustFS (不经过 Next.js)
 * 3. `completeUpload` 回查对象并置为 READY
 *
 * 删除是软删除: 记录保留 (status = DELETED), 对象本体尽力清理。
 * 所有入口都先过 `guardFileAction()`, 再按 ownerId 做行级校验。
 */

function revalidateFilePages(): void {
  revalidatePath("/[locale]/dashboard/files", "page");
  revalidatePath("/[locale]/dashboard/files/all", "page");
}

async function softDelete(id: string): Promise<void> {
  await prisma.fileObject.update({
    where: { id },
    data: { status: "DELETED", deletedAt: new Date() },
  });
}

export async function createUpload(input: {
  name: string;
  mimeType: string;
  size: number;
}): Promise<FileUploadTarget> {
  const guard = await guardFileAction();
  if (!guard.ok) return guard;

  const name = input.name.trim();
  if (!name || name.length > MAX_FILE_NAME_LENGTH) {
    return { ok: false, error: "invalid_name" };
  }

  const mimeType = input.mimeType.trim().toLowerCase();
  if (!isValidMimeType(mimeType)) {
    return { ok: false, error: "invalid_type" };
  }

  if (!Number.isFinite(input.size) || input.size <= 0) {
    return { ok: false, error: "invalid_size" };
  }
  if (input.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "too_large" };
  }

  const key = buildObjectKey(guard.user.id, name);

  let record: { id: string };
  try {
    record = await prisma.fileObject.create({
      data: {
        ownerId: guard.user.id,
        bucket: getStorageBucket(),
        key,
        name,
        mimeType,
        size: BigInt(Math.floor(input.size)),
        status: "PENDING",
      },
      select: { id: true },
    });
  } catch (error) {
    console.error("createUpload: failed to create record:", error);
    return { ok: false, error: "unknown" };
  }

  try {
    const uploadUrl = await createUploadUrl(key, mimeType);
    return { ok: true, id: record.id, uploadUrl, contentType: mimeType };
  } catch (error) {
    console.error("createUpload: failed to presign:", error);
    // 没签出地址就不可能上传, 直接软删除, 避免留下永远 PENDING 的记录
    await softDelete(record.id).catch(() => undefined);
    return { ok: false, error: "unknown" };
  }
}

export async function completeUpload(id: string): Promise<FileActionResult> {
  const guard = await guardFileAction();
  if (!guard.ok) return guard;

  const file = await findFileForAction(id);
  if (!file || !canAccessFile(guard, file.ownerId)) {
    return { ok: false, error: "not_found" };
  }
  // 幂等: 重复确认不报错
  if (file.status === "READY") return { ok: true };
  if (file.status === "DELETED") return { ok: false, error: "not_found" };

  let object: Awaited<ReturnType<typeof headObject>>;
  try {
    object = await headObject(file.key);
  } catch (error) {
    console.error("completeUpload: head object failed:", error);
    return { ok: false, error: "unknown" };
  }

  if (!object) {
    await softDelete(file.id).catch(() => undefined);
    return { ok: false, error: "object_missing" };
  }

  // 预签名 PUT 无法在存储侧限制大小, 这里以真实对象大小为准
  if (object.size > MAX_UPLOAD_BYTES) {
    await deleteObject(file.key).catch(() => undefined);
    await softDelete(file.id).catch(() => undefined);
    return { ok: false, error: "too_large" };
  }

  try {
    await prisma.fileObject.update({
      where: { id: file.id },
      data: {
        status: "READY",
        size: BigInt(object.size),
        etag: object.etag,
        mimeType: object.contentType ?? file.mimeType,
      },
    });
  } catch (error) {
    console.error("completeUpload: failed to update record:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateFilePages();
  return { ok: true };
}

export async function renameFile(
  id: string,
  name: string,
): Promise<FileActionResult> {
  const guard = await guardFileAction();
  if (!guard.ok) return guard;

  const nextName = name.trim();
  if (!nextName || nextName.length > MAX_FILE_NAME_LENGTH) {
    return { ok: false, error: "invalid_name" };
  }

  const file = await findFileForAction(id);
  if (!file || !canAccessFile(guard, file.ownerId) || file.status === "DELETED") {
    return { ok: false, error: "not_found" };
  }

  try {
    await prisma.fileObject.update({
      where: { id: file.id },
      data: { name: nextName },
    });
  } catch (error) {
    console.error("renameFile failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateFilePages();
  return { ok: true };
}

export async function deleteFile(id: string): Promise<FileActionResult> {
  const guard = await guardFileAction();
  if (!guard.ok) return guard;

  const file = await findFileForAction(id);
  if (!file || !canAccessFile(guard, file.ownerId)) {
    return { ok: false, error: "not_found" };
  }
  // 幂等: 已软删除直接成功
  if (file.status === "DELETED") return { ok: true };

  try {
    await softDelete(file.id);
  } catch (error) {
    console.error("deleteFile: failed to soft delete:", error);
    return { ok: false, error: "unknown" };
  }

  // 对象清理失败不回滚软删除: 记录已经不可见, 残留对象可以后续清理
  if (file.status === "READY") {
    await deleteObject(file.key).catch((error) => {
      console.error("deleteFile: failed to remove object:", error);
    });
  }

  revalidateFilePages();
  return { ok: true };
}

export async function getDownloadUrl(id: string): Promise<FileDownloadTarget> {
  const guard = await guardFileAction();
  if (!guard.ok) return guard;

  const file = await findFileForAction(id);
  if (!file || !canAccessFile(guard, file.ownerId) || file.status !== "READY") {
    return { ok: false, error: "not_found" };
  }

  try {
    const url = await createDownloadUrl(file.key, file.name, file.mimeType);
    return { ok: true, url };
  } catch (error) {
    console.error("getDownloadUrl failed:", error);
    return { ok: false, error: "unknown" };
  }
}
