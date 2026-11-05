import type { AiProviderType } from "@/lib/generated/prisma/enums";

/** 管理端与客户端之间传递的可序列化 AI 数据。 */

export const AI_PROVIDER_TYPES = [
  "OPENAI",
  "OPENAI_COMPATIBLE",
  "ANTHROPIC",
  "GOOGLE",
] as const;

export type AiActionResult = { ok: true } | { ok: false; error: string };

export type AiProviderRow = {
  id: string;
  name: string;
  type: AiProviderType;
  baseUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  modelCount: number;
  /** 密钥末四位; 没有密钥或解密失败时为 null */
  apiKeyLast4: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiModelRow = {
  id: string;
  providerId: string;
  providerName: string;
  providerType: AiProviderType;
  modelId: string;
  displayName: string;
  contextWindow: number | null;
  maxTokens: number | null;
  temperature: number | null;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type AiCatalogModel = {
  id: string;
  modelId: string;
  displayName: string;
  contextWindow: number | null;
  isDefault: boolean;
};

export type AiCatalogProvider = {
  id: string;
  name: string;
  type: AiProviderType;
  models: AiCatalogModel[];
};

export type AiCatalog = {
  providers: AiCatalogProvider[];
};

export type ChatConversationSummary = {
  id: string;
  title: string;
  providerId: string | null;
  modelId: string | null;
  providerName: string | null;
  modelName: string | null;
  lastMessageAt: string;
  updatedAt: string;
};

export type ChatMessageRow = {
  id: string;
  sequence: number;
  role: "SYSTEM" | "USER" | "ASSISTANT" | "TOOL";
  content: string;
  status: "STREAMING" | "COMPLETED" | "FAILED" | "ABORTED";
  providerName: string | null;
  modelName: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
};

export type ChatConversationDetail = ChatConversationSummary & {
  messages: ChatMessageRow[];
};
