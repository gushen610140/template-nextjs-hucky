import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { FILE_PAGE_SIZE } from "./query-params";
import type {
  FileListResult,
  FileListState,
  FileRow,
  FolderCrumb,
  FolderRow,
} from "./types";

const MAX_FOLDER_DEPTH = 20;

/**
 * 文件列表 (分页 + 搜索 + 排序 + 文件夹)。
 *
 * - 传 `ownerId` 只查某个人的文件 ("我的文件"), 并按 folderId 过滤当前目录
 * - 不传则查全站文件 ("文件管理"), 平铺展示, 忽略 folderId
 *
 * 关键词同时匹配文件名和上传者 (名称 / 邮箱); 软删除的文件不会出现。
 */
export async function listFilePage(options: {
  ownerId?: string;
  state: FileListState;
}): Promise<FileListResult> {
  const { ownerId, state } = options;

  // 校验 folder 归属: 不属于当前用户时按根目录处理, 而不是返回空列表
  const breadcrumb = ownerId
    ? await loadBreadcrumb(state.folderId, ownerId)
    : [{ id: null, name: "" }];
  const folderId = ownerId && breadcrumb.length > 1 ? state.folderId : null;
  const normalizedState: FileListState = { ...state, folderId };

  // 有搜索词时跨整个属主范围查找, 否则只看当前目录
  const searching = state.q.length > 0;

  const where: Prisma.FileObjectWhereInput = {
    status: "READY",
    ...(ownerId ? { ownerId } : {}),
    ...(ownerId && !searching ? { folderId } : {}),
    ...(searching
      ? {
          // 只按文件名搜索; 上传者通过用户筛选器定位, 不再混进关键词
          name: { contains: state.q, mode: "insensitive" as const },
        }
      : {}),
  };

  const total = await prisma.fileObject.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / FILE_PAGE_SIZE));
  const page = Math.min(Math.max(1, state.page), pageCount);

  const [rows, folders] = await Promise.all([
    prisma.fileObject.findMany({
      where,
      orderBy: buildOrderBy(state),
      skip: (page - 1) * FILE_PAGE_SIZE,
      take: FILE_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true,
        folderId: true,
        createdAt: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    }),
    ownerId
      ? listFolders({
          ownerId,
          parentId: searching ? undefined : folderId,
          q: state.q,
        })
      : Promise.resolve<FolderRow[]>([]),
  ]);

  return {
    files: rows.map(
      (row): FileRow => ({
        id: row.id,
        name: row.name,
        mimeType: row.mimeType,
        size: Number(row.size),
        folderId: row.folderId,
        createdAt: row.createdAt.toISOString(),
        owner: row.owner,
      }),
    ),
    folders,
    total,
    pageCount,
    state: { ...normalizedState, page },
    breadcrumb,
  };
}

async function listFolders(options: {
  ownerId: string;
  /** undefined 表示不限层级 (搜索时跨目录); null 表示根目录 */
  parentId?: string | null;
  q: string;
}): Promise<FolderRow[]> {
  const rows = await prisma.fileFolder.findMany({
    where: {
      ownerId: options.ownerId,
      ...(options.parentId === undefined ? {} : { parentId: options.parentId }),
      ...(options.q
        ? { name: { contains: options.q, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { files: { where: { status: "READY" } } } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    fileCount: row._count.files,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** 从当前目录一路向上取祖先, 用于面包屑; 找不到归属时返回根目录 */
async function loadBreadcrumb(
  folderId: string | null,
  ownerId: string,
): Promise<FolderCrumb[]> {
  const root: FolderCrumb = { id: null, name: "" };
  if (!folderId) return [root];

  const chain: FolderCrumb[] = [];
  let cursor: string | null = folderId;

  for (let depth = 0; depth < MAX_FOLDER_DEPTH && cursor; depth += 1) {
    const folder: { id: string; name: string; parentId: string | null } | null =
      await prisma.fileFolder.findFirst({
        where: { id: cursor, ownerId },
        select: { id: true, name: true, parentId: true },
      });
    if (!folder) break;
    chain.unshift({ id: folder.id, name: folder.name });
    cursor = folder.parentId;
  }

  return chain.length > 0 ? [root, ...chain] : [root];
}

function buildOrderBy(
  state: FileListState,
): Prisma.FileObjectOrderByWithRelationInput[] {
  // id 作为次级排序, 保证分页边界稳定
  const tieBreaker: Prisma.FileObjectOrderByWithRelationInput = { id: "asc" };

  if (state.sort === "name") return [{ name: state.dir }, tieBreaker];
  if (state.sort === "size") return [{ size: state.dir }, tieBreaker];
  return [{ createdAt: state.dir }, tieBreaker];
}

/** 单个文件的操作视图 (含软删除的行, 供软删除重试与幂等判断) */
export async function findFileForAction(id: string) {
  return prisma.fileObject.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      folderId: true,
      key: true,
      name: true,
      mimeType: true,
      size: true,
      status: true,
    },
  });
}

/** 文件夹的操作视图, 用于移动文件前校验归属 */
export async function findFolderForAction(id: string) {
  return prisma.fileFolder.findUnique({
    where: { id },
    select: { id: true, ownerId: true, name: true, parentId: true },
  });
}
