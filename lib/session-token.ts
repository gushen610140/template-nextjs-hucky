import { createHash, randomBytes } from "node:crypto";

/**
 * Session token 的纯计算部分（不依赖 Prisma）。
 *
 * proxy 只做乐观检查，只需要 cookie 名和格式校验。把这些基础能力放在
 * 独立模块，`proxy.ts` 就不会顺着 import 把 Prisma Client 一起打包，
 * 同时 token 格式的定义也仍然只有一处。
 */

export const SESSION_COOKIE = "session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

/** `randomBytes(32).toString("base64url")` 的产物长度固定为 43 */
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/**
 * 粗略校验 cookie 值是否可能是本应用签发的 token。
 *
 * 只匹配格式，不查询数据库，因此只能用于「乐观检查」：
 * 通过不代表会话仍然有效，权威校验必须由数据层完成。
 */
export function isSessionTokenShape(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && SESSION_TOKEN_PATTERN.test(value);
}

/** token 只以 sha256 哈希落库 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 生成新的不透明 session 随机字符串(客户端持有) */
export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}
