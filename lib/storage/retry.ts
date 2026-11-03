/**
 * 对象存储调用的瞬时故障重试。
 *
 * `ENOTFOUND` 这类 DNS 抖动通常只持续几百毫秒到几秒,
 * AWS SDK 自带的 3 次快速重试之后仍然失败时, 这里再补一轮指数退避。
 * 只重试网络错误与 5xx; 404、签名错误、权限错误一律立即抛出。
 */

const TRANSIENT_CODES = new Set([
  "EAI_AGAIN",
  "ECONNABORTED",
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETDOWN",
  "ENETUNREACH",
  "ENOTFOUND",
  "EPIPE",
  "ETIMEDOUT",
]);

export function isTransientStorageError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const { code, name, $metadata } = error as {
    code?: string;
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };

  if (code && TRANSIENT_CODES.has(code)) return true;
  if (name === "TimeoutError" || name === "NetworkingError") return true;

  return (
    typeof $metadata?.httpStatusCode === "number" &&
    $metadata.httpStatusCode >= 500
  );
}

export async function withStorageRetry<T>(
  operation: () => Promise<T>,
  options: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientStorageError(error) || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)),
      );
    }
  }

  throw lastError;
}
