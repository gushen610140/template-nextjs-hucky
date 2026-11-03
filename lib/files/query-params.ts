import {
  FILE_SORTS,
  type FileListState,
  type FileSort,
  type SortDirection,
} from "./types";

/** 每页条数; 分页只在服务端做, 客户端不缓存整表 */
export const FILE_PAGE_SIZE = 20;

const MAX_QUERY_LENGTH = 100;

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * 把 URL 查询参数收敛成受控状态:
 * 非法 sort / dir / page 一律回落到默认值, 避免把任意输入带进 Prisma。
 */
export function parseFileListState(params: RawSearchParams): FileListState {
  const q = (first(params.q) ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const rawSort = first(params.sort);
  const rawDir = first(params.dir);
  const rawPage = Number.parseInt(first(params.page) ?? "1", 10);

  const sort: FileSort = FILE_SORTS.includes(rawSort as FileSort)
    ? (rawSort as FileSort)
    : "createdAt";
  const dir: SortDirection = rawDir === "asc" ? "asc" : "desc";

  return {
    q,
    sort,
    dir,
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
    folderId: first(params.folder) || null,
  };
}
