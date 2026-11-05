import {
  AIMessage,
  AIMessageChunk,
  type BaseMessage,
  BaseMessageChunk,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import type { ResolvedChatModel } from "@/lib/ai/models";
import type { ChatMessageRow } from "@/lib/ai/types";

export type ChatStreamEvent =
  | { type: "text"; text: string }
  | { type: "usage"; inputTokens: number | null; outputTokens: number | null };

/** 粗略估算 token 数: 中文约 1 字 1 token, 英文约 4 字符 1 token。 */
function estimateTokens(text: string): number {
  let tokens = 0;
  for (const char of text) {
    tokens += char.charCodeAt(0) > 255 ? 1 : 0.25;
  }
  return Math.ceil(tokens);
}

/**
 * 从最近的消息向前保留, 直到接近上下文预算。
 * 至少保留最后一条, 避免用户最后一句话被裁掉。
 */
function buildMessages(
  history: ChatMessageRow[],
  contextWindow: number | null,
  maxTokens: number | null,
): BaseMessage[] {
  const messages: BaseMessage[] = [];
  if (history.length === 0) return messages;

  if (!contextWindow) {
    return history.map(toLangChainMessage);
  }

  const reserved = Math.max(maxTokens ?? 1024, 256);
  const budget = Math.max(contextWindow - reserved, 512);
  let used = 0;

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const row = history[index];
    if (!row) continue;

    const cost = estimateTokens(row.content);
    if (messages.length > 0 && used + cost > budget) break;

    messages.unshift(toLangChainMessage(row));
    used += cost;
  }

  return messages;
}

function toLangChainMessage(row: ChatMessageRow): BaseMessage {
  return row.role === "USER"
    ? new HumanMessage(row.content)
    : new AIMessage(row.content);
}

export type StreamChatParams = {
  model: ResolvedChatModel;
  history: ChatMessageRow[];
  systemPrompt?: string;
  signal: AbortSignal;
};

/**
 * 用 LangGraph 跑单轮对话, 并通过 `streamMode: "messages"` 把模型 token
 * 透传给调用方。图目前只有一个节点, 后续接工具 / RAG 时在此扩展。
 */
export async function* streamChat({
  model,
  history,
  systemPrompt,
  signal,
}: StreamChatParams): AsyncGenerator<ChatStreamEvent> {
  const messages = buildMessages(history, model.contextWindow, model.maxTokens);

  if (systemPrompt) {
    messages.unshift(new SystemMessage(systemPrompt));
  }

  const graph = new StateGraph(MessagesAnnotation)
    .addNode("model", async (state, config) => {
      const response = await model.chatModel.invoke(state.messages, config);
      return { messages: [response] };
    })
    .addEdge(START, "model")
    .addEdge("model", END)
    .compile();

  const stream = await graph.stream(
    { messages },
    { streamMode: "messages", signal },
  );

  for await (const [chunk] of stream) {
    if (!BaseMessageChunk.isInstance(chunk)) continue;

    const text = chunk.text;
    if (text) {
      yield { type: "text", text };
    }

    if (AIMessageChunk.isInstance(chunk) && chunk.usage_metadata) {
      yield {
        type: "usage",
        inputTokens: chunk.usage_metadata.input_tokens ?? null,
        outputTokens: chunk.usage_metadata.output_tokens ?? null,
      };
    }
  }
}
