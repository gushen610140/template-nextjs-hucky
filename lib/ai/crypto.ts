import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

/**
 * 供应商 API Key 的对称加密。
 *
 * 数据库只保存密文, 后台列表只回显末四位。密文格式:
 * `v1.<iv>.<authTag>.<ciphertext>` (各段 base64url)。
 *
 * `AI_SECRET_KEY` 是任意长度的口令, 用固定 salt 派生 32 字节密钥。
 * 更换该变量会导致已有密文无法解密, 因此部署后不要随意修改。
 */

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const SALT = "hucky-ai-provider-key";

function getSecret(): string {
  const secret = process.env.AI_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error("AI_SECRET_KEY is not configured.");
  }
  return secret;
}

function deriveKey(): Buffer {
  return scryptSync(getSecret(), SALT, 32);
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, deriveKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, ciphertext] = payload.split(".");
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error("Invalid encrypted secret.");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    deriveKey(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** 后台回显用: 只暴露末四位, 不足以还原密钥。 */
export function secretLast4(plaintext: string): string {
  return plaintext.slice(-4);
}
