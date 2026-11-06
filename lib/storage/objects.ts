import type { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
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
 * 服务端写入对象 (OnlyOffice callback 保存用)。
 *
 * 用 lib-storage 流式上传, 避免把 200MB 文件一次性读进内存。
 * 调用方负责在写完后用 `headObject` 回查真实大小 / ETag。
 */
export async function putObject(
  key: string,
  body: Readable | ReadableStream | Uint8Array,
  contentType: string,
): Promise<void> {
  const upload = new Upload({
    client: getS3Client(),
    params: {
      Bucket: getStorageBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    },
  });

  await upload.done();
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

/**
 * 读取完整对象, 用于 RAG 文本解析。
 *
 * 调用方先通过 `headObject` / 文件记录限制大小, 这里再兜底检查,
 * 避免异常大文件一次性读进内存。
 */
export async function readObjectBytes(
  key: string,
  maxBytes: number,
): Promise<Uint8Array> {
  return withStorageRetry(async () => {
    const result = await getS3Client().send(
      new GetObjectCommand({ Bucket: getStorageBucket(), Key: key }),
    );
    const bytes =
      (await result.Body?.transformToByteArray()) ?? new Uint8Array();

    if (bytes.length > maxBytes) {
      throw new Error("object_too_large");
    }
    return bytes;
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
