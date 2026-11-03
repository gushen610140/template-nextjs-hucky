import { Readable } from "node:stream";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { getOfficeDocumentInfo } from "@/lib/onlyoffice/documents";
import { getOnlyOfficeSettings } from "@/lib/onlyoffice/env";
import { verifyOnlyOfficeToken } from "@/lib/onlyoffice/jwt";
import { prisma } from "@/lib/prisma";
import { buildObjectKey } from "@/lib/storage/keys";
import { MAX_UPLOAD_BYTES } from "@/lib/storage/limits";
import { deleteObject, headObject, putObject } from "@/lib/storage/objects";

export const runtime = "nodejs";
// Vercel Hobby 上限为 60s; Pro 可以调高。大文件需要更长执行时间。
export const maxDuration = 60;

type CallbackBody = {
  status?: number;
  url?: string;
  token?: string;
};

function errorResponse(message: string, status = 400) {
  console.error("onlyoffice callback:", message);
  return NextResponse.json({ error: 1 }, { status });
}

function allowedEditedUrl(raw: string, dsUrl: string, internalUrl?: string) {
  try {
    const target = new URL(raw);
    const origins = [new URL(dsUrl).origin];
    if (internalUrl) origins.push(new URL(internalUrl).origin);
    return origins.includes(target.origin);
  } catch {
    return false;
  }
}

/**
 * OnlyOffice 保存回调。
 *
 * 编辑后的文件由 DS 提供 URL, 本服务下载后写入 RustFS, 再把 FileObject
 * 指向新对象。旧对象在数据库更新成功后删除, 因此写入失败不会破坏原文件。
 */
export async function POST(request: NextRequest) {
  const settings = getOnlyOfficeSettings();
  if (!settings.ok) {
    return errorResponse(
      `missing configuration: ${settings.missing.join(", ")}`,
      500,
    );
  }

  const callbackToken = new URL(request.url).searchParams.get("token");
  const callbackPayload = callbackToken
    ? await verifyOnlyOfficeToken(callbackToken)
    : null;
  const fileId = callbackPayload?.fileId;
  if (typeof fileId !== "string") {
    return errorResponse("invalid callback token", 401);
  }

  let body: CallbackBody;
  try {
    body = (await request.json()) as CallbackBody;
  } catch {
    return errorResponse("invalid JSON body");
  }

  // DS 回调 token 默认放在 body.token; 配了 JWT_HEADER 时可能在 Authorization。
  const bodyToken =
    body.token ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bodyToken || !(await verifyOnlyOfficeToken(bodyToken))) {
    return errorResponse("invalid document server token", 401);
  }

  const status = Number(body.status);
  if (status !== 2 && status !== 6) {
    // 1/4 不产生文件内容; 3/7 是 DS 侧错误, 记录即可
    if (status === 3 || status === 7) {
      console.error("onlyoffice callback: document server save failed", status);
    }
    return NextResponse.json({ error: 0 });
  }

  if (
    !body.url ||
    !allowedEditedUrl(
      body.url,
      settings.value.dsUrl,
      settings.value.internalUrl,
    )
  ) {
    return errorResponse("edited file URL is not allowed");
  }

  const file = await prisma.fileObject.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      ownerId: true,
      key: true,
      name: true,
      mimeType: true,
      status: true,
    },
  });

  if (
    !file ||
    file.status !== "READY" ||
    !getOfficeDocumentInfo(file.name, file.mimeType)
  ) {
    return errorResponse("file is no longer editable", 404);
  }

  let download: Response;
  try {
    download = await fetch(body.url, {
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
  } catch (error) {
    console.error("onlyoffice callback: download failed:", error);
    return errorResponse("failed to download edited file", 502);
  }

  if (!download.ok || !download.body) {
    return errorResponse(
      `edited file download returned ${download.status}`,
      502,
    );
  }

  const contentLength = Number(download.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES) {
    return errorResponse("edited file exceeds the upload limit", 413);
  }

  const newKey = buildObjectKey(file.ownerId, file.name);
  try {
    const body = Readable.fromWeb(
      download.body as import("node:stream/web").ReadableStream,
    );
    await putObject(newKey, body, file.mimeType);

    const stored = await headObject(newKey);
    if (!stored) throw new Error("uploaded object not found");
    if (stored.size > MAX_UPLOAD_BYTES) {
      await deleteObject(newKey).catch(() => undefined);
      return errorResponse("edited file exceeds the upload limit", 413);
    }

    const updated = await prisma.fileObject.updateMany({
      where: { id: file.id, status: "READY" },
      data: {
        key: newKey,
        size: BigInt(stored.size),
        etag: stored.etag,
      },
    });

    if (updated.count === 0) {
      await deleteObject(newKey).catch(() => undefined);
      return errorResponse("file was deleted while editing", 404);
    }

    if (file.key !== newKey) {
      await deleteObject(file.key).catch((error) => {
        console.error(
          "onlyoffice callback: failed to remove old object:",
          error,
        );
      });
    }
  } catch (error) {
    console.error("onlyoffice callback: save failed:", error);
    await deleteObject(newKey).catch(() => undefined);
    return errorResponse("failed to persist edited file", 500);
  }

  revalidatePath("/[locale]/dashboard/files", "page");
  revalidatePath("/[locale]/dashboard/files/all", "page");
  revalidatePath("/[locale]/dashboard/files/[id]", "page");
  revalidatePath("/[locale]/dashboard/files/[id]/edit", "page");

  return NextResponse.json({ error: 0 });
}
