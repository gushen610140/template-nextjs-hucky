import type {
  ChatConversationDetail,
  ChatConversationSummary,
  ChatMessageRow,
} from "@/lib/ai/types";
import { prisma } from "@/lib/prisma";
import { isUniqueConstraintError } from "@/lib/prisma-errors";

const TITLE_MAX_LENGTH = 120;
const AUTO_TITLE_MAX_LENGTH = 40;
const DEFAULT_HISTORY_LIMIT = 200;

const conversationSelect = {
  id: true,
  title: true,
  providerId: true,
  modelId: true,
  providerName: true,
  modelName: true,
  lastMessageAt: true,
  updatedAt: true,
} as const;

function mapConversation(row: {
  id: string;
  title: string;
  providerId: string | null;
  modelId: string | null;
  providerName: string | null;
  modelName: string | null;
  lastMessageAt: Date;
  updatedAt: Date;
}): ChatConversationSummary {
  return {
    id: row.id,
    title: row.title,
    providerId: row.providerId,
    modelId: row.modelId,
    providerName: row.providerName,
    modelName: row.modelName,
    lastMessageAt: row.lastMessageAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapMessage(row: {
  id: string;
  sequence: number;
  role: ChatMessageRow["role"];
  content: string;
  status: ChatMessageRow["status"];
  providerName: string | null;
  modelName: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: Date;
}): ChatMessageRow {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
  };
}

function normalizeTitle(raw: string): string | null {
  const value = raw.replace(/\s+/g, " ").trim();
  if (!value) return null;
  return value.slice(0, TITLE_MAX_LENGTH);
}

function titleFromContent(content: string): string {
  return content.replace(/\s+/g, " ").trim().slice(0, AUTO_TITLE_MAX_LENGTH);
}

export async function listConversations(
  userId: string,
  limit = 100,
): Promise<ChatConversationSummary[]> {
  const rows = await prisma.aiConversation.findMany({
    where: { userId },
    orderBy: { lastMessageAt: "desc" },
    take: limit,
    select: conversationSelect,
  });

  return rows.map(mapConversation);
}

export async function getConversation(
  userId: string,
  id: string,
): Promise<ChatConversationDetail | null> {
  const conversation = await prisma.aiConversation.findFirst({
    where: { id, userId },
    select: conversationSelect,
  });
  if (!conversation) return null;

  // 取最近 N 条再翻转, 避免长对话只显示最早的消息。
  const messages = await prisma.aiMessage.findMany({
    where: { conversationId: id },
    orderBy: { sequence: "desc" },
    take: DEFAULT_HISTORY_LIMIT,
    select: {
      id: true,
      sequence: true,
      role: true,
      content: true,
      status: true,
      providerName: true,
      modelName: true,
      inputTokens: true,
      outputTokens: true,
      createdAt: true,
    },
  });

  return {
    ...mapConversation(conversation),
    messages: messages.reverse().map(mapMessage),
  };
}

export async function getSendContext(userId: string, id: string) {
  return prisma.aiConversation.findFirst({
    where: { id, userId },
    select: {
      id: true,
      modelId: true,
      providerId: true,
      providerName: true,
      modelName: true,
    },
  });
}

export async function createConversation(
  userId: string,
  input: { modelId: string; title?: string },
): Promise<ChatConversationSummary | null> {
  const model = await prisma.aiModel.findFirst({
    where: {
      id: input.modelId,
      isActive: true,
      provider: { isActive: true },
    },
    select: {
      id: true,
      displayName: true,
      provider: { select: { id: true, name: true } },
    },
  });
  if (!model) return null;

  const title = normalizeTitle(input.title ?? "") ?? "New chat";

  const conversation = await prisma.aiConversation.create({
    data: {
      userId,
      title,
      providerId: model.provider.id,
      modelId: model.id,
      providerName: model.provider.name,
      modelName: model.displayName,
    },
    select: conversationSelect,
  });

  return mapConversation(conversation);
}

export async function renameConversation(
  userId: string,
  id: string,
  title: string,
): Promise<ChatConversationSummary | null> {
  const nextTitle = normalizeTitle(title);
  if (!nextTitle) return null;

  const existing = await prisma.aiConversation.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return null;

  const conversation = await prisma.aiConversation.update({
    where: { id },
    data: { title: nextTitle },
    select: conversationSelect,
  });

  return mapConversation(conversation);
}

export async function updateConversationModel(
  userId: string,
  id: string,
  modelId: string,
): Promise<ChatConversationSummary | null> {
  const [existing, model] = await Promise.all([
    prisma.aiConversation.findFirst({
      where: { id, userId },
      select: { id: true },
    }),
    prisma.aiModel.findFirst({
      where: {
        id: modelId,
        isActive: true,
        provider: { isActive: true },
      },
      select: {
        id: true,
        displayName: true,
        provider: { select: { id: true, name: true } },
      },
    }),
  ]);

  if (!existing || !model) return null;

  const conversation = await prisma.aiConversation.update({
    where: { id },
    data: {
      providerId: model.provider.id,
      modelId: model.id,
      providerName: model.provider.name,
      modelName: model.displayName,
    },
    select: conversationSelect,
  });

  return mapConversation(conversation);
}

export async function deleteConversation(
  userId: string,
  id: string,
): Promise<boolean> {
  const existing = await prisma.aiConversation.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return false;

  await prisma.aiConversation.delete({ where: { id } });
  return true;
}

/**
 * 追加用户消息并分配会话内序号。
 *
 * 并发写同一会话可能撞上 `(conversationId, sequence)` 唯一约束,
 * 这里重试三次; 仍失败则抛给调用方。
 */
export async function appendUserMessage(
  userId: string,
  conversationId: string,
  content: string,
): Promise<{ message: ChatMessageRow; title: string } | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const conversation = await tx.aiConversation.findFirst({
          where: { id: conversationId, userId },
          select: {
            id: true,
            title: true,
            _count: { select: { messages: { where: { role: "USER" } } } },
          },
        });
        if (!conversation) return null;

        const last = await tx.aiMessage.findFirst({
          where: { conversationId },
          orderBy: { sequence: "desc" },
          select: { sequence: true },
        });
        const sequence = (last?.sequence ?? 0) + 1;

        const isFirstUserMessage = conversation._count.messages === 0;
        const title = isFirstUserMessage
          ? titleFromContent(content)
          : conversation.title;

        const message = await tx.aiMessage.create({
          data: {
            conversationId,
            sequence,
            role: "USER",
            content,
            status: "COMPLETED",
          },
          select: {
            id: true,
            sequence: true,
            role: true,
            content: true,
            status: true,
            providerName: true,
            modelName: true,
            inputTokens: true,
            outputTokens: true,
            createdAt: true,
          },
        });

        await tx.aiConversation.update({
          where: { id: conversationId },
          data: {
            lastMessageAt: message.createdAt,
            ...(isFirstUserMessage ? { title } : {}),
          },
        });

        return { message: mapMessage(message), title };
      });
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt === 2) throw error;
    }
  }

  return null;
}

export async function createAssistantMessage(
  conversationId: string,
  snapshot: { providerName: string; modelName: string },
): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const message = await prisma.$transaction(async (tx) => {
        const last = await tx.aiMessage.findFirst({
          where: { conversationId },
          orderBy: { sequence: "desc" },
          select: { sequence: true },
        });

        return tx.aiMessage.create({
          data: {
            conversationId,
            sequence: (last?.sequence ?? 0) + 1,
            role: "ASSISTANT",
            content: "",
            status: "STREAMING",
            providerName: snapshot.providerName,
            modelName: snapshot.modelName,
          },
          select: { id: true },
        });
      });

      return message.id;
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt === 2) throw error;
    }
  }

  throw new Error("Could not allocate message sequence.");
}

export async function finishAssistantMessage(
  id: string,
  input: {
    content: string;
    status: "COMPLETED" | "FAILED" | "ABORTED";
    inputTokens?: number | null;
    outputTokens?: number | null;
  },
): Promise<void> {
  await prisma.aiMessage.update({
    where: { id },
    data: {
      content: input.content,
      status: input.status,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
    },
  });
}

export async function getConversationHistory(
  conversationId: string,
  limit = 50,
): Promise<ChatMessageRow[]> {
  const rows = await prisma.aiMessage.findMany({
    where: {
      conversationId,
      role: { in: ["USER", "ASSISTANT"] },
      status: { in: ["COMPLETED", "ABORTED"] },
      content: { not: "" },
    },
    orderBy: { sequence: "desc" },
    take: limit,
    select: {
      id: true,
      sequence: true,
      role: true,
      content: true,
      status: true,
      providerName: true,
      modelName: true,
      inputTokens: true,
      outputTokens: true,
      createdAt: true,
    },
  });

  return rows.reverse().map(mapMessage);
}

export async function touchConversation(id: string): Promise<void> {
  await prisma.aiConversation.update({
    where: { id },
    data: { lastMessageAt: new Date() },
  });
}
