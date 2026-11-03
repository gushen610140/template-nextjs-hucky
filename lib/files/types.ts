/**
 * 文件页面与客户端组件之间传递的数据形状。
 * 和 RBAC 页面一致: `Date` 转 ISO 字符串, `BigInt` 转 number。
 */

export type FileRow = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  folderId: string | null;
  createdAt: string;
  owner: {
    id: string;
    name: string | null;
    email: string;
  };
};

export type FolderRow = {
  id: string;
  name: string;
  fileCount: number;
  createdAt: string;
};

/** 面包屑节点; `id` 为 null 表示根目录 */
export type FolderCrumb = {
  id: string | null;
  name: string;
};

export const FILE_SORTS = ["name", "size", "createdAt"] as const;
export type FileSort = (typeof FILE_SORTS)[number];

export type SortDirection = "asc" | "desc";

/** 由 URL 查询参数解析出的列表状态 */
export type FileListState = {
  q: string;
  sort: FileSort;
  dir: SortDirection;
  page: number;
  folderId: string | null;
};

/** 一次列表查询的完整结果 (文件 + 子文件夹 + 分页 + 面包屑) */
export type FileListResult = {
  files: FileRow[];
  folders: FolderRow[];
  total: number;
  pageCount: number;
  state: FileListState;
  breadcrumb: FolderCrumb[];
  /** 当前属主下尚未确认的上传数; 平铺管理员视图为 0 */
  pendingCount: number;
};

/** 预览页需要的单文件详情 (含存储键, 只在服务端使用) */
export type FileDetail = {
  id: string;
  ownerId: string;
  folderId: string | null;
  key: string;
  name: string;
  mimeType: string;
  size: number;
  etag: string | null;
  status: "PENDING" | "READY" | "DELETED";
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string | null;
    email: string;
  };
  folder: { id: string; name: string } | null;
};

/** Server Action 的统一返回值; 失败时返回错误码, 由客户端翻译成文案。 */
export type FileActionResult = { ok: true } | { ok: false; error: string };

/** 创建上传目标的结果: 客户端拿到预签名地址后直接 PUT 到 RustFS。 */
export type FileUploadTarget =
  | { ok: true; id: string; uploadUrl: string; contentType: string }
  | { ok: false; error: string };

/** 下载地址; 客户端用它做跳转, 不经过 Next.js 转发文件流。 */
export type FileDownloadTarget =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** 编辑保存第一步: 拿到同对象键的预签名 PUT */
export type FileEditTarget =
  | { ok: true; uploadUrl: string; contentType: string }
  | { ok: false; error: string };

/** 编辑保存第二步: 回查对象并刷新元数据 */
export type FileEditResult =
  | { ok: true; size: number; updatedAt: string }
  | { ok: false; error: string };

/** 修复未完成上传: 回查对象并补成 READY, 缺失对象则清理记录 */
export type FileRecoveryResult =
  | { ok: true; recovered: number; removed: number; failed: number }
  | { ok: false; error: string };
