import type {
  AiModality,
  AiModelKind,
  AiProviderType,
  RagFileStatus,
} from "@/lib/generated/prisma/enums";

/** 管理端与客户端之间传递的可序列化 AI 数据。 */

export const AI_PROVIDER_TYPES = [
  "OPENAI",
  "OPENAI_COMPATIBLE",
  "ANTHROPIC",
  "GOOGLE",
] as const;

export const AI_MODEL_KINDS = ["CHAT", "EMBEDDING"] as const;

export const AI_MODALITIES = [
  "TEXT",
  "IMAGE",
  "AUDIO",
  "VIDEO",
  "VECTOR",
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
  kind: AiModelKind;
  inputModalities: AiModality[];
  outputModalities: AiModality[];
  embeddingDimension: number | null;
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
  knowledgeBaseIds: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type RagLibraryOption = {
  id: string;
  name: string;
  embeddingModelName: string;
  readyFileCount: number;
};

/** 智能体 / RAG 表单里的模型选项。 */
export type AiModelOption = {
  id: string;
  displayName: string;
  providerName: string;
  isActive: boolean;
  kind: AiModelKind;
  inputModalities: AiModality[];
  outputModalities: AiModality[];
  embeddingDimension: number | null;
};

/** 对话页可选的已启用智能体; 模型与供应商只用于展示。 */
export type ChatAgentOption = {
  id: string;
  name: string;
  description: string | null;
  providerName: string;
  modelName: string;
  knowledgeBaseCount: number;
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

export type ChatCitation = {
  libraryId: string;
  libraryName: string;
  fileId: string;
  fileName: string;
  chunkIndex: number;
  score: number;
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
  citations: ChatCitation[] | null;
  createdAt: string;
};

export type ChatConversationDetail = ChatConversationSummary & {
  messages: ChatMessageRow[];
};

// ─── RAG ────────────────────────────────────────────────

export type RagLibraryRow = {
  id: string;
  name: string;
  description: string | null;
  embeddingModelId: string;
  embeddingModelName: string;
  providerName: string;
  vectorSize: number;
  fileCount: number;
  readyFileCount: number;
  hasVectors: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RagLibraryFileRow = {
  id: string;
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  status: RagFileStatus;
  chunkCount: number;
  processedChunks: number;
  error: string | null;
  vectorizedAt: string | null;
  /** 文件内容在向量化后发生变化, 需要重新向量化。 */
  stale: boolean;
};

export type RagFileCandidate = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  folderId: string | null;
  createdAt: string;
};

export type RagFolderCandidate = {
  id: string;
  name: string;
  parentId: string | null;
};
