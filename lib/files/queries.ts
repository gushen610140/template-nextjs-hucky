import { prisma } from "@/lib/prisma";
import type { FileRow } from "./types";

/** 列表上限; 一期不做分页, 超出后按时间倒序截断 */
const LIST_LIMIT = 200;

/**
 * 文件列表。
 *
 * - 传 `ownerId` 只查某个人的文件 ("我的文件")
 * - 不传则查全站文件 ("文件管理", 调用方必须已通过 file:manage 校验)
 *
 * 软删除的行 (status = DELETED) 不会出现在列表里。
 */
export async function listFiles(
  options: { ownerId?: string } = {},
): Promise<FileRow[]> {
  const rows = await prisma.fileObject.findMany({
    where: {
      status: "READY",
      ...(options.ownerId ? { ownerId: options.ownerId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: LIST_LIMIT,
    select: {
      id: true,
      name: true,
      mimeType: true,
      size: true,
      createdAt: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    mimeType: row.mimeType,
    size: Number(row.size),
    createdAt: row.createdAt.toISOString(),
    owner: row.owner,
  }));
}

/** 单个文件的操作视图 (含软删除的行, 供软删除重试与幂等判断) */
export async function findFileForAction(id: string) {
  return prisma.fileObject.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      key: true,
      name: true,
      mimeType: true,
      size: true,
      status: true,
    },
  });
}
