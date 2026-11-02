/**
 * 文件页面与客户端组件之间传递的数据形状。
 * 和 RBAC 页面一致: `Date` 转 ISO 字符串, `BigInt` 转 number。
 */

export type FileRow = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  owner: {
    id: string;
    name: string | null;
    email: string;
  };
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
