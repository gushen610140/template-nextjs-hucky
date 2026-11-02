/** 单文件上限。预签名 PUT 无法在存储侧强制大小, 由确认步骤回查对象大小兜底。 */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

/** 用户可见文件名的最大长度 */
export const MAX_FILE_NAME_LENGTH = 200;

/** 允许的文件名里出现的最小/最大 MIME 形态 */
const MIME_PATTERN = /^[\w.+-]+\/[\w.+-]+$/;

export function isValidMimeType(value: string): boolean {
  return MIME_PATTERN.test(value);
}
