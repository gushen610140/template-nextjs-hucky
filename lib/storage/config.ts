/**
 * RustFS 连接配置。
 *
 * 延迟读取环境变量而不是在模块加载时校验, 这样 `next build`
 * 静态分析阶段不会因为缺少环境变量直接失败, 只有真正访问存储时才报错。
 */

export type StorageConfig = {
  /** S3 API 地址 (不是 9001 控制台端口), 预签名 URL 以该 host 签发 */
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

let cached: StorageConfig | null = null;

export function getStorageConfig(): StorageConfig {
  if (cached) return cached;

  const endpoint = process.env.RUSTFS_ENDPOINT?.trim();
  const accessKeyId = process.env.RUSTFS_ACCESS_KEY?.trim();
  const secretAccessKey = process.env.RUSTFS_SECRET_KEY?.trim();
  const bucket = process.env.RUSTFS_BUCKET?.trim();

  const missing = [
    ["RUSTFS_ENDPOINT", endpoint],
    ["RUSTFS_ACCESS_KEY", accessKeyId],
    ["RUSTFS_SECRET_KEY", secretAccessKey],
    ["RUSTFS_BUCKET", bucket],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `RustFS storage is not configured. Missing: ${missing.join(", ")}`,
    );
  }

  cached = {
    endpoint: endpoint as string,
    accessKeyId: accessKeyId as string,
    secretAccessKey: secretAccessKey as string,
    bucket: bucket as string,
  };
  return cached;
}

/** bucket 名; 文件记录里冗余一份, 便于以后迁移到多 bucket */
export function getStorageBucket(): string {
  return getStorageConfig().bucket;
}
