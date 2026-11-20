import COS from "cos-nodejs-sdk-v5";
import { type FontId, getFontObjectKey } from "@/lib/font-presets";

/**
 * 字体专用 COS 配置。
 *
 * 与部署流水线使用的 COS_* 是两套完全独立的桶和角色:
 * - 部署桶: GitHub Actions 里的 secrets.COS_SECRET_ID / vars.COS_BUCKET
 * - 字体桶: 运行时环境变量 FONT_COS_*, 桶 hucky-fonts-1301215062
 * 变量名刻意加 FONT_ 前缀, 避免任何一侧改配置时串到另一侧。
 */
type FontCosConfig = {
  secretId: string;
  secretKey: string;
  bucket: string;
  region: string;
};

/** 预签名 URL 有效期; 只用于一次点击的下载, 不需要长时效 */
export const FONT_URL_TTL_SECONDS = 10 * 60;

let client: COS | null = null;

export function getFontCosConfig(): FontCosConfig {
  const secretId = process.env.FONT_COS_SECRET_ID;
  const secretKey = process.env.FONT_COS_SECRET_KEY;
  const bucket = process.env.FONT_COS_BUCKET;
  const region = process.env.FONT_COS_REGION;

  const missing = [
    ["FONT_COS_SECRET_ID", secretId],
    ["FONT_COS_SECRET_KEY", secretKey],
    ["FONT_COS_BUCKET", bucket],
    ["FONT_COS_REGION", region],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`字体 COS 未配置, 缺少: ${missing.join(", ")}`);
  }

  return {
    secretId: secretId as string,
    secretKey: secretKey as string,
    bucket: bucket as string,
    region: region as string,
  };
}

export function getFontCosClient(): COS {
  if (client) return client;

  const config = getFontCosConfig();
  client = new COS({
    SecretId: config.secretId,
    SecretKey: config.secretKey,
  });
  return client;
}

export type FontDownloadTarget = {
  url: string;
  /** 字节数; 用于浏览器端进度条, 取不到时为 0 */
  size: number;
  expiresIn: number;
};

/**
 * 为字体生成私有桶的临时下载地址。
 * 只允许注册表里的 id, 调用方必须先用 isFontId 校验, 避免签出任意对象。
 */
export async function getFontDownloadTarget(
  id: FontId,
): Promise<FontDownloadTarget> {
  const { bucket, region } = getFontCosConfig();
  const cos = getFontCosClient();
  const key = getFontObjectKey(id);

  const url = cos.getObjectUrl({
    Bucket: bucket,
    Region: region,
    Key: key,
    Sign: true,
    Expires: FONT_URL_TTL_SECONDS,
    Protocol: "https:",
  });

  let size = 0;
  try {
    const head = await cos.headObject({
      Bucket: bucket,
      Region: region,
      Key: key,
    });
    const raw = head.headers?.["content-length"];
    size = raw ? Number(raw) : 0;
  } catch (error) {
    // 文件不存在时让 POST/GET 请求自己失败, 这里只负责给出可读状态
    throw new Error(
      `字体对象不存在或不可读: ${key} (${error instanceof Error ? error.message : String(error)})`,
    );
  }

  return { url, size, expiresIn: FONT_URL_TTL_SECONDS };
}
