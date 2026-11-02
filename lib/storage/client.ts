import { S3Client } from "@aws-sdk/client-s3";
import { getStorageConfig } from "./config";

/**
 * RustFS 固定区域。RustFS 只接受 us-east-1 的签名, 不做多区域,
 * 因此不放进环境变量, 避免部署时填错导致签名失败。
 */
export const RUSTFS_REGION = "us-east-1";

/**
 * 预签名 URL 的有效秒数, 上传和下载共用。
 * 上传: 足够慢速网络完成一次 PUT; 下载: 足够点击后立即开始传输。
 */
export const PRESIGN_TTL_SECONDS = 15 * 60;

let client: S3Client | null = null;

/**
 * RustFS 走 path-style (`endpoint/bucket/key`), 虚拟主机风格需要
 * `RUSTFS_SERVER_DOMAINS` 才能用, 所以这里强制开启。
 *
 * 新版 AWS SDK 默认附加 CRC32 校验头, 部分 S3 兼容实现不认;
 * 设为 WHEN_REQUIRED 保持与 RustFS 兼容。
 */
export function getS3Client(): S3Client {
  if (client) return client;

  const config = getStorageConfig();
  client = new S3Client({
    endpoint: config.endpoint,
    region: RUSTFS_REGION,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}
