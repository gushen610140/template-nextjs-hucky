import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import type { AiProviderType } from "@/lib/generated/prisma/enums";

export type ChatModelConfig = {
  providerType: AiProviderType;
  baseUrl: string | null;
  apiKey: string;
  modelId: string;
  maxTokens: number | null;
  temperature: number | null;
  params: Record<string, unknown>;
};

/**
 * 按供应商类型构造 LangChain chat model。
 *
 * OPENAI_COMPATIBLE 复用 ChatOpenAI, 只额外传入 baseURL;
 * 这样自建网关 / vLLM / One API 都能走同一套字段。
 */
export function createChatModel(config: ChatModelConfig): BaseChatModel {
  const common = {
    ...config.params,
    temperature: config.temperature ?? undefined,
  };

  switch (config.providerType) {
    case "ANTHROPIC":
      return new ChatAnthropic({
        ...common,
        model: config.modelId,
        apiKey: config.apiKey,
        maxTokens: config.maxTokens ?? undefined,
        anthropicApiUrl: config.baseUrl ?? undefined,
      });
    case "GOOGLE":
      return new ChatGoogleGenerativeAI({
        ...common,
        model: config.modelId,
        apiKey: config.apiKey,
        maxOutputTokens: config.maxTokens ?? undefined,
        baseUrl: config.baseUrl ?? undefined,
      });
    case "OPENAI":
    case "OPENAI_COMPATIBLE":
      return new ChatOpenAI({
        ...common,
        model: config.modelId,
        apiKey: config.apiKey,
        maxTokens: config.maxTokens ?? undefined,
        configuration: config.baseUrl ? { baseURL: config.baseUrl } : undefined,
      });
  }
}
