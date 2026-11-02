import { MAX_FILE_NAME_LENGTH } from "./limits";

/**
 * 对象键与用户文件名解耦:
 * - `key` 只用于 bucket 内部定位, 带 owner 前缀保证归属隔离
 * - 展示与下载使用数据库里的 `name`, 因此改名不需要移动对象
 */
export function buildObjectKey(ownerId: string, fileName: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safeName = toSafeKeySegment(fileName);
  return `${ownerId}/${year}/${month}/${crypto.randomUUID()}-${safeName}`;
}

/**
 * 去掉路径分隔符与控制字符, 只保留字母 / 数字 / `._-`。
 * 中文等非 ASCII 字符会被替换, 因为展示名另存于数据库。
 */
function toSafeKeySegment(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const sanitized = base
    .normalize("NFKC")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^[._]+/, "")
    .slice(0, MAX_FILE_NAME_LENGTH);

  return sanitized.length > 0 ? sanitized : "file";
}
