import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "./client";
import { getStorageBucket } from "./config";

export type StoredObject = {
  size: number;
  contentType: string | null;
  etag: string | null;
};

/** 对象元信息; 不存在时返回 null (而不是抛错) */
export async function headObject(key: string): Promise<StoredObject | null> {
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
}

/** 删除对象本体; 数据库侧是软删除, 这里只清存储 */
export async function deleteObject(key: string): Promise<void> {
  try {
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: getStorageBucket(), Key: key }),
    );
  } catch (error) {
    // 已经不存在时忽略, 保证软删除可以重试
    if (isNotFound(error)) return;
    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, $metadata } = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return name === "NotFound" || name === "NoSuchKey" || $metadata?.httpStatusCode === 404;
}
