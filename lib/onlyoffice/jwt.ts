import { type JWTPayload, jwtVerify, SignJWT } from "jose";
import { getOnlyOfficeSettings } from "./env";

/**
 * OnlyOffice 的 config / callback 共用同一个 HS256 secret。
 * token 只在本服务签发和校验, 不放进客户端可修改的字段。
 */
function secretKey(): Uint8Array {
  const settings = getOnlyOfficeSettings();
  if (!settings.ok) {
    throw new Error(
      `OnlyOffice is not configured: missing ${settings.missing.join(", ")}`,
    );
  }
  return new TextEncoder().encode(settings.value.jwtSecret);
}

export async function signOnlyOfficeToken(
  payload: Record<string, unknown>,
  expiresIn = "12h",
): Promise<string> {
  return new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey());
}

export async function verifyOnlyOfficeToken(
  token: string,
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload;
  } catch (error) {
    console.error("onlyoffice: token verification failed:", error);
    return null;
  }
}
