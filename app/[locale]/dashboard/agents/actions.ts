"use server";

import { revalidatePath } from "next/cache";
import { guardAiAction } from "@/lib/ai/action-guard";
import type { AiActionResult } from "@/lib/ai/types";
import { prisma } from "@/lib/prisma";
import { isUniqueConstraintError } from "@/lib/prisma-errors";

const NAME_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 300;
const PROMPT_MAX_LENGTH = 20_000;

type AgentInput = {
  name: string;
  description: string;
  modelId: string;
  systemPrompt: string;
  isActive: boolean;
  sortOrder: number;
};

function revalidateAgentPages() {
  revalidatePath("/[locale]/dashboard/agents", "page");
}

function normalizeName(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0 || value.length > NAME_MAX_LENGTH) return null;
  return value;
}

function normalizeDescription(raw: string): string | null | "invalid" {
  const value = raw.trim();
  if (value.length > DESCRIPTION_MAX_LENGTH) return "invalid";
  return value || null;
}

function normalizePrompt(raw: string): string | null {
  const value = raw.trim();
  if (value.length > PROMPT_MAX_LENGTH) return null;
  return value;
}

async function validateInput(input: AgentInput): Promise<
  | {
      ok: true;
      data: {
        name: string;
        description: string | null;
        modelId: string;
        systemPrompt: string;
        isActive: boolean;
        sortOrder: number;
      };
    }
  | { ok: false; error: string }
> {
  const name = normalizeName(input.name);
  if (!name) return { ok: false, error: "invalid_name" };

  const description = normalizeDescription(input.description);
  if (description === "invalid") {
    return { ok: false, error: "invalid_description" };
  }

  const systemPrompt = normalizePrompt(input.systemPrompt);
  if (systemPrompt === null) {
    return { ok: false, error: "invalid_prompt" };
  }

  const model = await prisma.aiModel.findUnique({
    where: { id: input.modelId },
    select: { id: true },
  });
  if (!model) return { ok: false, error: "invalid_model" };

  return {
    ok: true,
    data: {
      name,
      description,
      modelId: model.id,
      systemPrompt,
      isActive: Boolean(input.isActive),
      sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
    },
  };
}

export async function createAgent(input: AgentInput): Promise<AiActionResult> {
  const guard = await guardAiAction();
  if (!guard.ok) return guard;

  const validated = await validateInput(input);
  if (!validated.ok) return validated;

  try {
    await prisma.aiAgent.create({ data: validated.data });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "name_taken" };
    }
    console.error("createAgent failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateAgentPages();
  return { ok: true };
}

export async function updateAgent(
  input: { id: string } & AgentInput,
): Promise<AiActionResult> {
  const guard = await guardAiAction();
  if (!guard.ok) return guard;

  const target = await prisma.aiAgent.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "not_found" };

  const validated = await validateInput(input);
  if (!validated.ok) return validated;

  try {
    await prisma.aiAgent.update({
      where: { id: target.id },
      data: validated.data,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "name_taken" };
    }
    console.error("updateAgent failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateAgentPages();
  return { ok: true };
}

export async function deleteAgent(id: string): Promise<AiActionResult> {
  const guard = await guardAiAction();
  if (!guard.ok) return guard;

  const target = await prisma.aiAgent.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "not_found" };

  try {
    await prisma.aiAgent.delete({ where: { id: target.id } });
  } catch (error) {
    console.error("deleteAgent failed:", error);
    return { ok: false, error: "unknown" };
  }

  revalidateAgentPages();
  return { ok: true };
}
