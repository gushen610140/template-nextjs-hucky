"use server";

import { revalidatePath } from "next/cache";
import { guardAiAction } from "@/lib/ai/action-guard";
import { encryptSecret } from "@/lib/ai/crypto";
import { invalidateEmbeddingCache } from "@/lib/ai/embeddings";
import { invalidateModelCache } from "@/lib/ai/models";
import type { AiActionResult } from "@/lib/ai/types";
import type { AiProviderType } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  isForeignKeyConstraintError,
  isUniqueConstraintError,
} from "@/lib/prisma-errors";

const NAME_MAX_LENGTH = 80;
const BASE_URL_MAX_LENGTH = 500;
const API_KEY_MAX_LENGTH = 500;

const PROVIDER_TYPES = new Set<AiProviderType>([
  "OPENAI",
  "ANTHROPIC",
  "GOOGLE",
  "OPENAI_COMPATIBLE",
]);

function normalizeBaseUrl(raw: string): string | null | "invalid" {
  const value = raw.trim();
  if (!value) return null;
  if (value.length > BASE_URL_MAX_LENGTH) return "invalid";

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "invalid";
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return "invalid";
  }
}

function normalizeName(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0 || value.length > NAME_MAX_LENGTH) return null;
  return value;
}

function revalidateAiPages() {
  for (const segment of ["providers", "models"]) {
    revalidatePath(`/[locale]/dashboard/${segment}`, "page");
  }
}

export async function createProvider(input: {
  name: string;
  type: AiProviderType;
  baseUrl: string;
  apiKey: string;
  isActive: boolean;
  sortOrder: number;
}): Promise<AiActionResult> {
  const guard = await guardAiAction();
  if (!guard.ok) return guard;

  const name = normalizeName(input.name);
  if (!name) return { ok: false, error: "invalid_name" };

  if (!PROVIDER_TYPES.has(input.type)) {
    return { ok: false, error: "invalid_type" };
  }

  const baseUrl = normalizeBaseUrl(input.baseUrl);
  if (baseUrl === "invalid") return { ok: false, error: "invalid_base_url" };

  const apiKey = input.apiKey.trim();
  if (apiKey.length === 0 || apiKey.length > API_KEY_MAX_LENGTH) {
    return { ok: false, error: "invalid_api_key" };
  }

  try {
    await prisma.aiProvider.create({
      data: {
        name,
        type: input.type,
        baseUrl,
        apiKeyCipher: encryptSecret(apiKey),
        isActive: Boolean(input.isActive),
        sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "name_taken" };
    }
    console.error("createProvider failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateAiPages();
  return { ok: true };
}

export async function updateProvider(input: {
  id: string;
  name: string;
  type: AiProviderType;
  baseUrl: string;
  /** 留空表示不修改现有密钥 */
  apiKey: string;
  isActive: boolean;
  sortOrder: number;
}): Promise<AiActionResult> {
  const guard = await guardAiAction();
  if (!guard.ok) return guard;

  const target = await prisma.aiProvider.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "not_found" };

  const name = normalizeName(input.name);
  if (!name) return { ok: false, error: "invalid_name" };

  if (!PROVIDER_TYPES.has(input.type)) {
    return { ok: false, error: "invalid_type" };
  }

  const baseUrl = normalizeBaseUrl(input.baseUrl);
  if (baseUrl === "invalid") return { ok: false, error: "invalid_base_url" };

  const apiKey = input.apiKey.trim();
  if (apiKey.length > API_KEY_MAX_LENGTH) {
    return { ok: false, error: "invalid_api_key" };
  }

  try {
    await prisma.aiProvider.update({
      where: { id: target.id },
      data: {
        name,
        type: input.type,
        baseUrl,
        isActive: Boolean(input.isActive),
        sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
        ...(apiKey ? { apiKeyCipher: encryptSecret(apiKey) } : {}),
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "name_taken" };
    }
    console.error("updateProvider failed:", error);
    return { ok: false, error: "unknown" };
  }

  invalidateModelCache();
  invalidateEmbeddingCache();
  revalidateAiPages();
  return { ok: true };
}

export async function deleteProvider(id: string): Promise<AiActionResult> {
  const guard = await guardAiAction();
  if (!guard.ok) return guard;

  const target = await prisma.aiProvider.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "not_found" };

  try {
    await prisma.aiProvider.delete({ where: { id: target.id } });
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return { ok: false, error: "provider_in_use" };
    }
    console.error("deleteProvider failed:", error);
    return { ok: false, error: "unknown" };
  }

  invalidateModelCache();
  invalidateEmbeddingCache();
  revalidateAiPages();
  return { ok: true };
}
