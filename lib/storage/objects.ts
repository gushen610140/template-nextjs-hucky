import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getS3Client } from "./client";
import { getStorageBucket } from "./config";
import { withStorageRetry } from "./retry";

export type StoredObject = {
  size: number;
  contentType: string | null;
  etag: string | null;
};

/** 对象元信息; 不存在时返回 null (而不是抛错) */
export async function headObject(key: string): Promise<StoredObject | null> {
  return withStorageRetry(async () => {
    try {
      const result = await getS3Client().send(
        new HeadObjectCommand({ Bucket: getStorageBucket(), Key: key }),
      );

      return {
        size: Number(result.ContentLength ?? 0),
        contentType: result.ContentType ?? null,
        etag: result.ETag?.replace(/"/g, "") ?? null,
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  });
}

/**
 * 读取对象开头的一段字节, 用于文本预览。
 *
 * 文本内容不经过浏览器直连: 既避免 CORS, 也把读取量卡在 `maxBytes`。
 * `truncated` 以 S3 返回的 ContentRange 总长度为准。
 */
export async function readObjectPrefix(
  key: string,
  maxBytes: number,
): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  return withStorageRetry(async () => {
    try {
      const result = await getS3Client().send(
        new GetObjectCommand({
          Bucket: getStorageBucket(),
          Key: key,
          Range: `bytes=0-${Math.max(0, maxBytes - 1)}`,
        }),
      );

      const bytes =
        (await result.Body?.transformToByteArray()) ?? new Uint8Array();
      const total = Number(result.ContentRange?.split("/")[1] ?? bytes.length);

      return {
        bytes,
        truncated: Number.isFinite(total) && total > bytes.length,
      };
    } catch (error) {
      // 空文件时 Range 请求可能返回 416; 按空内容处理
      if (isRangeNotSatisfiable(error)) {
        return { bytes: new Uint8Array(), truncated: false };
      }
      throw error;
    }
  });
}

/** 删除对象本体; 数据库侧是软删除, 这里只清存储 */
export async function deleteObject(key: string): Promise<void> {
  await withStorageRetry(async () => {
    try {
      await getS3Client().send(
        new DeleteObjectCommand({ Bucket: getStorageBucket(), Key: key }),
      );
    } catch (error) {
      // 已经不存在时忽略, 保证软删除可以重试
      if (isNotFound(error)) return;
      throw error;
    }
  });
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, $metadata } = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    name === "NotFound" ||
    name === "NoSuchKey" ||
    $metadata?.httpStatusCode === 404
  );
}

function isRangeNotSatisfiable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, $metadata } = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return name === "InvalidRange" || $metadata?.httpStatusCode === 416;
}
