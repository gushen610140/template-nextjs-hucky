"use server";

import { revalidatePath } from "next/cache";
import {
  canAccessFile,
  type FileGuard,
  guardFileAction,
} from "@/lib/files/auth";
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

/**
 * 解析操作目标的属主。
 *
 * - 不传 ownerId: 操作自己
 * - 传 ownerId: 只有 file:manage 才能替他人操作 (管理员在用户筛选视图里)
 */
async function resolveOwner(
  guard: Extract<FileGuard, { ok: true }>,
  ownerId: string | null | undefined,
): Promise<{ ok: true; ownerId: string } | { ok: false; error: string }> {
  if (!ownerId || ownerId === guard.user.id) {
    return { ok: true, ownerId: guard.user.id };
  }
  if (!guard.canManage) return { ok: false, error: "forbidden" };

  const target = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "not_found" };

  return { ok: true, ownerId: target.id };
}

export async function createUpload(input: {
  name: string;
  mimeType: string;
  size: number;
  folderId?: string | null;
  /** 管理员在用户筛选视图里替该用户上传 */
  ownerId?: string | null;
}): Promise<FileUploadTarget> {
  const guard = await guardFileAction();
  if (!guard.ok) return guard;

  const name = input.name.trim();
  if (!name || name.length > MAX_FILE_NAME_LENGTH) {
    return { ok: false, error: "invalid_name" };
  }

  const owner = await resolveOwner(guard, input.ownerId);
  if (!owner.ok) return owner;

  // 目标文件夹必须属于文件属主
  const folderId = input.folderId ?? null;
  if (folderId) {
    const folder = await findFolderForAction(folderId);
    if (!folder || folder.ownerId !== owner.ownerId) {
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

  const key = buildObjectKey(owner.ownerId, name);

  let record: { id: string };
  try {
    record = await prisma.fileObject.create({
      data: {
        ownerId: owner.ownerId,
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
  /** 管理员在用户筛选视图里替该用户创建 */
  ownerId?: string | null;
}): Promise<FileActionResult> {
  const guard = await guardFileAction();
  if (!guard.ok) return guard;

  const name = input.name.trim();
  if (!name || name.length > MAX_FILE_NAME_LENGTH) {
    return { ok: false, error: "invalid_name" };
  }

  const owner = await resolveOwner(guard, input.ownerId);
  if (!owner.ok) return owner;

  const parentId = input.parentId ?? null;
  if (parentId) {
    const parent = await findFolderForAction(parentId);
    if (!parent || parent.ownerId !== owner.ownerId) {
      return { ok: false, error: "not_found" };
    }
  }

  // 同一目录下不允许重名, 否则拖拽 / 面包屑都会产生歧义
  const existing = await prisma.fileFolder.findFirst({
    where: { ownerId: owner.ownerId, parentId, name },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "folder_exists" };

  try {
    await prisma.fileFolder.create({
      data: { ownerId: owner.ownerId, parentId, name },
    });
  } catch (error) {
    console.error("createFolder failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateFilePages();
  return { ok: true };
}

/** 重命名文件夹; 同一目录下仍需保持唯一 */
export async function renameFolder(
  id: string,
  name: string,
): Promise<FileActionResult> {
  const guard = await guardFileAction();
  if (!guard.ok) return guard;

  const nextName = name.trim();
  if (!nextName || nextName.length > MAX_FILE_NAME_LENGTH) {
    return { ok: false, error: "invalid_name" };
  }

  const folder = await findFolderForAction(id);
  if (!folder || !canAccessFile(guard, folder.ownerId)) {
    return { ok: false, error: "not_found" };
  }

  const sibling = await prisma.fileFolder.findFirst({
    where: {
      ownerId: folder.ownerId,
      parentId: folder.parentId,
      name: nextName,
      id: { not: folder.id },
    },
    select: { id: true },
  });
  if (sibling) return { ok: false, error: "folder_exists" };

  try {
    await prisma.fileFolder.update({
      where: { id: folder.id },
      data: { name: nextName },
    });
  } catch (error) {
    console.error("renameFolder failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateFilePages();
  return { ok: true };
}

/**
 * 删除文件夹: 文件夹本身硬删除, 其中的文件全部软删除。
 *
 * 子文件夹会随外键级联删除, 所以先把整棵子树的文件找出来统一软删除,
 * 再删根节点; 对象本体随后尽力清理。
 */
export async function deleteFolder(id: string): Promise<FileActionResult> {
  const guard = await guardFileAction();
  if (!guard.ok) return guard;

  const folder = await findFolderForAction(id);
  if (!folder || !canAccessFile(guard, folder.ownerId)) {
    return { ok: false, error: "not_found" };
  }

  const folderIds = await collectFolderSubtree(folder.id);

  const files = await prisma.fileObject.findMany({
    where: { folderId: { in: folderIds }, status: "READY" },
    select: { id: true, key: true },
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.fileObject.updateMany({
        where: { folderId: { in: folderIds }, status: { not: "DELETED" } },
        data: { status: "DELETED", deletedAt: new Date() },
      });
      await tx.fileFolder.delete({ where: { id: folder.id } });
    });
  } catch (error) {
    console.error("deleteFolder failed:", error);
    return { ok: false, error: "unknown" };
  }

  // 元数据已经不可见, 对象清理失败只记日志
  await Promise.all(
    files.map((file) =>
      deleteObject(file.key).catch((error) => {
        console.error("deleteFolder: failed to remove object:", error);
      }),
    ),
  );

  revalidateFilePages();
  return { ok: true };
}

/** 收集以 rootId 为根的整棵文件夹树 (含自身) */
async function collectFolderSubtree(rootId: string): Promise<string[]> {
  const ids = [rootId];
  let frontier = [rootId];

  // 树深有限, 这里用循环而不是递归, 顺便作为防御性上限
  for (let depth = 0; depth < 50 && frontier.length > 0; depth += 1) {
    const children = await prisma.fileFolder.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = children.map((child) => child.id);
    ids.push(...frontier);
  }

  return ids;
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
