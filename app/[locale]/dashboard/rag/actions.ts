"use server";

import { revalidatePath } from "next/cache";
import { guardAiAction } from "@/lib/ai/action-guard";
import {
  addFilesToLibrary,
  createRagLibrary,
  deleteRagLibrary,
  enqueueAllLibraryFiles,
  enqueueLibraryFile,
  removeFileFromLibrary,
  updateRagLibrary,
} from "@/lib/ai/rag/service";
import type { AiActionResult } from "@/lib/ai/types";

function revalidateRagPages() {
  revalidatePath("/[locale]/dashboard/rag", "page");
  revalidatePath("/[locale]/dashboard/agents", "page");
}

function toResult(error: unknown): AiActionResult {
  const message = error instanceof Error ? error.message : "unknown";
  const known = new Set([
    "invalid_name",
    "invalid_description",
    "not_found",
    "no_files",
    "embedding_model_unavailable",
    "dimension_mismatch",
    "library_locked",
    "unsupported_files",
    "name_taken",
  ]);
  if (known.has(message)) return { ok: false, error: message };
  if (message.startsWith("Qdrant")) {
    return { ok: false, error: "qdrant_unavailable" };
  }
  console.error("RAG action failed:", error);
  return { ok: false, error: "unknown" };
}

export async function createLibrary(input: {
  name: string;
  description: string;
  embeddingModelId: string;
}): Promise<AiActionResult> {
  const guard = await guardAiAction();
  if (!guard.ok) return guard;

  try {
    await createRagLibrary(guard.user.id, input);
  } catch (error) {
    return toResult(error);
  }

  revalidateRagPages();
  return { ok: true };
}

export async function updateLibrary(input: {
  id: string;
  name: string;
  description: string;
  embeddingModelId: string;
}): Promise<AiActionResult> {
  const guard = await guardAiAction();
  if (!guard.ok) return guard;

  try {
    await updateRagLibrary(input);
  } catch (error) {
    return toResult(error);
  }

  revalidateRagPages();
  return { ok: true };
}

export async function deleteLibrary(id: string): Promise<AiActionResult> {
  const guard = await guardAiAction();
  if (!guard.ok) return guard;

  try {
    await deleteRagLibrary(id);
  } catch (error) {
    return toResult(error);
  }

  revalidateRagPages();
  return { ok: true };
}

export async function addLibraryFiles(input: {
  libraryId: string;
  fileIds: string[];
}): Promise<AiActionResult> {
  const guard = await guardAiAction();
  if (!guard.ok) return guard;

  try {
    await addFilesToLibrary(guard.user.id, input.libraryId, input.fileIds);
  } catch (error) {
    return toResult(error);
  }

  revalidateRagPages();
  return { ok: true };
}

export async function removeLibraryFile(input: {
  libraryId: string;
  fileId: string;
}): Promise<AiActionResult> {
  const guard = await guardAiAction();
  if (!guard.ok) return guard;

  try {
    await removeFileFromLibrary(input.libraryId, input.fileId);
  } catch (error) {
    return toResult(error);
  }

  revalidateRagPages();
  return { ok: true };
}

export async function vectorizeLibraryFile(
  libraryFileId: string,
): Promise<AiActionResult> {
  const guard = await guardAiAction();
  if (!guard.ok) return guard;

  try {
    await enqueueLibraryFile(libraryFileId);
  } catch (error) {
    return toResult(error);
  }

  revalidateRagPages();
  return { ok: true };
}

export async function vectorizeLibrary(
  libraryId: string,
): Promise<AiActionResult> {
  const guard = await guardAiAction();
  if (!guard.ok) return guard;

  try {
    await enqueueAllLibraryFiles(libraryId);
  } catch (error) {
    return toResult(error);
  }

  revalidateRagPages();
  return { ok: true };
}
