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

/** 管理端智能体列表行。 */
export type AiAgentRow = {
  id: string;
  name: string;
  description: string | null;
  modelId: string;
  modelName: string;
  providerName: string;
  systemPrompt: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** 智能体表单里的模型选项。 */
export type AiModelOption = {
  id: string;
  displayName: string;
  providerName: string;
  isActive: boolean;
};

/** 对话页可选的已启用智能体; 模型与供应商只用于展示。 */
export type ChatAgentOption = {
  id: string;
  name: string;
  description: string | null;
  providerName: string;
  modelName: string;
};

export type ChatConversationSummary = {
  id: string;
  title: string;
  agentId: string | null;
  agentName: string | null;
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
