import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client, PRESIGN_TTL_SECONDS } from "./client";
import { getStorageBucket } from "./config";

/**
 * 上传直传地址。
 *
 * `ContentType` 参与签名, 客户端 PUT 时必须原样带上同一个头,
 * 否则 RustFS 会返回签名不匹配。
 */
export async function createUploadUrl(
  key: string,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getStorageBucket(),
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(getS3Client(), command, {
    expiresIn: PRESIGN_TTL_SECONDS,
  });
}

/**
 * 预览直读地址。
 *
 * 与下载地址的区别只是 `inline`: 浏览器直接渲染而不是另存为。
 * 仅用于图片 / PDF / 音视频, 文本类由服务端读取, HTML 永远不走这里。
 */
export async function createPreviewUrl(
  key: string,
  contentType: string,
  fileName: string,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getStorageBucket(),
    Key: key,
    ResponseContentType: contentType,
    ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(
      fileName,
    )}`,
  });

  return getSignedUrl(getS3Client(), command, {
    expiresIn: PRESIGN_TTL_SECONDS,
  });
}

/**
 * 下载直传地址。
 *
 * 用 response-content-disposition 让浏览器按原文件名保存,
 * 因为对象键里的文件名是清洗过的 ASCII 形式。
 */
export async function createDownloadUrl(
  key: string,
  fileName: string,
  contentType: string,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getStorageBucket(),
    Key: key,
    ResponseContentType: contentType,
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(
      fileName,
    )}`,
  });

  return getSignedUrl(getS3Client(), command, {
    expiresIn: PRESIGN_TTL_SECONDS,
  });
}
