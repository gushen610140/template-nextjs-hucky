"use server";

import { revalidatePath } from "next/cache";
import { canAccessFile, guardFileAction } from "@/lib/files/auth";
import { findFileForAction, findFolderForAction } from "@/lib/files/queries";
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
  folderId?: string | null;
}): Promise<FileUploadTarget> {
  const guard = await guardFileAction();
  if (!guard.ok) return guard;

  const name = input.name.trim();
  if (!name || name.length > MAX_FILE_NAME_LENGTH) {
    return { ok: false, error: "invalid_name" };
  }

  // 只能上传到自己的文件夹; 管理员替他人上传不在本期范围
  const folderId = input.folderId ?? null;
  if (folderId) {
    const folder = await findFolderForAction(folderId);
    if (!folder || folder.ownerId !== guard.user.id) {
      return { ok: false, error: "not_found" };
    }
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
        folderId,
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
  if (
    !file ||
    !canAccessFile(guard, file.ownerId) ||
    file.status === "DELETED"
  ) {
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

/** 新建文件夹; parentId 为空表示根目录 */
export async function createFolder(input: {
  name: string;
  parentId?: string | null;
}): Promise<FileActionResult> {
  const guard = await guardFileAction();
  if (!guard.ok) return guard;

  const name = input.name.trim();
  if (!name || name.length > MAX_FILE_NAME_LENGTH) {
    return { ok: false, error: "invalid_name" };
  }

  const parentId = input.parentId ?? null;
  if (parentId) {
    const parent = await findFolderForAction(parentId);
    if (!parent || parent.ownerId !== guard.user.id) {
      return { ok: false, error: "not_found" };
    }
  }

  // 同一目录下不允许重名, 否则拖拽 / 面包屑都会产生歧义
  const existing = await prisma.fileFolder.findFirst({
    where: { ownerId: guard.user.id, parentId, name },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "folder_exists" };

  try {
    await prisma.fileFolder.create({
      data: { ownerId: guard.user.id, parentId, name },
    });
  } catch (error) {
    console.error("createFolder failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateFilePages();
  return { ok: true };
}

/**
 * 把文件移动到指定文件夹 (folderId 为 null 表示根目录)。
 * 只改元数据, 对象键不变, 存储侧不需要复制。
 */
export async function moveFile(
  id: string,
  folderId: string | null,
): Promise<FileActionResult> {
  const guard = await guardFileAction();
  if (!guard.ok) return guard;

  const file = await findFileForAction(id);
  if (
    !file ||
    !canAccessFile(guard, file.ownerId) ||
    file.status === "DELETED"
  ) {
    return { ok: false, error: "not_found" };
  }

  if (folderId) {
    const folder = await findFolderForAction(folderId);
    // 只能移动到文件属主自己的文件夹, 避免跨用户挂载
    if (!folder || folder.ownerId !== file.ownerId) {
      return { ok: false, error: "not_found" };
    }
  }

  if (file.folderId === folderId) return { ok: true };

  try {
    await prisma.fileObject.update({
      where: { id: file.id },
      data: { folderId },
    });
  } catch (error) {
    console.error("moveFile failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateFilePages();
  return { ok: true };
}
