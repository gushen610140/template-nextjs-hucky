"use server";

import { revalidatePath } from "next/cache";
import { guardAiAction } from "@/lib/ai/action-guard";
import { invalidateModelCache, resolveChatModel } from "@/lib/ai/models";
import type { AiActionResult } from "@/lib/ai/types";
import { prisma } from "@/lib/prisma";
import {
  isForeignKeyConstraintError,
  isUniqueConstraintError,
} from "@/lib/prisma-errors";

const ID_MAX_LENGTH = 160;
const NAME_MAX_LENGTH = 120;

type ModelInput = {
  providerId: string;
  modelId: string;
  displayName: string;
  contextWindow: string;
  maxTokens: string;
  temperature: string;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
};

function revalidateAiPages() {
  for (const segment of ["providers", "models"]) {
    revalidatePath(`/[locale]/dashboard/${segment}`, "page");
  }
}

function parseOptionalInt(raw: string, min: number): number | null | "invalid" {
  const value = raw.trim();
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) return "invalid";
  return parsed;
}

function parseOptionalTemperature(raw: string): number | null | "invalid" {
  const value = raw.trim();
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 2) return "invalid";
  return parsed;
}

function normalizeText(raw: string, max: number): string | null {
  const value = raw.trim();
  if (value.length === 0 || value.length > max) return null;
  return value;
}

async function validateInput(input: ModelInput): Promise<
  | {
      ok: true;
      data: {
        modelId: string;
        displayName: string;
        contextWindow: number | null;
        maxTokens: number | null;
        temperature: number | null;
        isActive: boolean;
        isDefault: boolean;
        sortOrder: number;
      };
    }
  | { ok: false; error: string }
> {
  const provider = await prisma.aiProvider.findUnique({
    where: { id: input.providerId },
    select: { id: true },
  });
  if (!provider) return { ok: false, error: "not_found" };

  const modelId = normalizeText(input.modelId, ID_MAX_LENGTH);
  if (!modelId) return { ok: false, error: "invalid_model_id" };

  const displayName = normalizeText(input.displayName, NAME_MAX_LENGTH);
  if (!displayName) return { ok: false, error: "invalid_display_name" };

  const contextWindow = parseOptionalInt(input.contextWindow, 1);
  if (contextWindow === "invalid") {
    return { ok: false, error: "invalid_context_window" };
  }

  const maxTokens = parseOptionalInt(input.maxTokens, 1);
  if (maxTokens === "invalid") {
    return { ok: false, error: "invalid_max_tokens" };
  }

  const temperature = parseOptionalTemperature(input.temperature);
  if (temperature === "invalid") {
    return { ok: false, error: "invalid_temperature" };
  }

  return {
    ok: true,
    data: {
      modelId,
      displayName,
      contextWindow,
      maxTokens,
      temperature,
      isActive: Boolean(input.isActive),
      isDefault: Boolean(input.isDefault),
      sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
    },
  };
}

export async function createModel(input: ModelInput): Promise<AiActionResult> {
  const guard = await guardAiAction();
  if (!guard.ok) return guard;

  const validated = await validateInput(input);
  if (!validated.ok) return validated;

  try {
    await prisma.$transaction(async (tx) => {
      if (validated.data.isDefault) {
        await tx.aiModel.updateMany({
          where: { providerId: input.providerId },
          data: { isDefault: false },
        });
      }
      await tx.aiModel.create({
        data: { ...validated.data, providerId: input.providerId },
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "model_taken" };
    }
    console.error("createModel failed:", error);
    return { ok: false, error: "unknown" };
  }

  invalidateModelCache();
  revalidateAiPages();
  return { ok: true };
}

export async function updateModel(
  input: {
    id: string;
  } & ModelInput,
): Promise<AiActionResult> {
  const guard = await guardAiAction();
  if (!guard.ok) return guard;

  const target = await prisma.aiModel.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "not_found" };

  const validated = await validateInput(input);
  if (!validated.ok) return validated;

  try {
    await prisma.$transaction(async (tx) => {
      if (validated.data.isDefault) {
        await tx.aiModel.updateMany({
          where: {
            providerId: input.providerId,
            id: { not: target.id },
          },
          data: { isDefault: false },
        });
      }
      await tx.aiModel.update({
        where: { id: target.id },
        data: {
          ...validated.data,
          providerId: input.providerId,
        },
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "model_taken" };
    }
    console.error("updateModel failed:", error);
    return { ok: false, error: "unknown" };
  }

  invalidateModelCache(target.id);
  revalidateAiPages();
  return { ok: true };
}

export async function deleteModel(id: string): Promise<AiActionResult> {
  const guard = await guardAiAction();
  if (!guard.ok) return guard;

  const target = await prisma.aiModel.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "not_found" };

  try {
    await prisma.aiModel.delete({ where: { id: target.id } });
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return { ok: false, error: "model_in_use" };
    }
    console.error("deleteModel failed:", error);
    return { ok: false, error: "unknown" };
  }

  invalidateModelCache(target.id);
  revalidateAiPages();
  return { ok: true };
}

/** 用最小请求验证模型配置是否可用; 不消耗会话, 但仍会产生一次模型调用。 */
export async function testModel(id: string): Promise<AiActionResult> {
  const guard = await guardAiAction();
  if (!guard.ok) return guard;

  const resolved = await resolveChatModel(id);
  if (!resolved) return { ok: false, error: "not_found" };

  try {
    await resolved.chatModel.invoke("Reply with the single word OK.", {
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    console.error("testModel failed:", error);
    return { ok: false, error: "test_failed" };
  }

  return { ok: true };
}
