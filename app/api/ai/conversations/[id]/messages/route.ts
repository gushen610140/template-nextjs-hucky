import { type NextRequest, NextResponse } from "next/server";
import { streamChat } from "@/lib/ai/chat/graph";
import {
  appendUserMessage,
  createAssistantMessage,
  finishAssistantMessage,
  getConversationHistory,
  getSendContext,
  touchConversation,
} from "@/lib/ai/chat/service";
import { resolveChatModel } from "@/lib/ai/models";
import { withPermission } from "@/lib/authz";
import { PERMISSIONS } from "@/lib/permissions";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_INPUT_LENGTH = 8000;

type RouteContext = { params: Promise<{ id: string }> };

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export const POST = withPermission<RouteContext>(
  PERMISSIONS.aiOwn,
  async (request: NextRequest, context, user) => {
    const { id } = await context.params;

    const body = (await request.json().catch(() => null)) as {
      content?: unknown;
    } | null;
    const content =
      typeof body?.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json({ error: "empty_message" }, { status: 400 });
    }
    if (content.length > MAX_INPUT_LENGTH) {
      return NextResponse.json({ error: "message_too_long" }, { status: 400 });
    }

    const conversation = await getSendContext(user.id, id);
    if (!conversation) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!conversation.modelId) {
      return NextResponse.json({ error: "model_required" }, { status: 400 });
    }

    const resolved = await resolveChatModel(conversation.modelId);
    if (!resolved) {
      return NextResponse.json({ error: "model_unavailable" }, { status: 400 });
    }

    const appended = await appendUserMessage(user.id, id, content);
    if (!appended) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const history = await getConversationHistory(id);
    const assistantMessageId = await createAssistantMessage(id, {
      providerName: resolved.providerName,
      modelName: resolved.modelName,
    });

    const encoder = new TextEncoder();
    let closed = false;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        function send(event: string, data: unknown) {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(sse(event, data)));
          } catch {
            closed = true;
          }
        }

        send("start", {
          userMessageId: appended.message.id,
          assistantMessageId,
          title: appended.title,
          modelName: resolved.modelName,
          providerName: resolved.providerName,
        });

        let text = "";
        let inputTokens: number | null = null;
        let outputTokens: number | null = null;

        try {
          for await (const chunk of streamChat({
            model: resolved,
            history,
            signal: request.signal,
          })) {
            if (chunk.type === "text") {
              text += chunk.text;
              send("delta", { text: chunk.text });
            } else {
              inputTokens = chunk.inputTokens ?? inputTokens;
              outputTokens = chunk.outputTokens ?? outputTokens;
            }
          }

          const status = request.signal.aborted ? "ABORTED" : "COMPLETED";
          await finishAssistantMessage(assistantMessageId, {
            content: text,
            status,
            inputTokens,
            outputTokens,
          });
          await touchConversation(id);

          send("done", {
            assistantMessageId,
            title: appended.title,
            status,
            usage: { inputTokens, outputTokens },
          });
        } catch (error) {
          const aborted =
            request.signal.aborted ||
            (error instanceof Error && error.name === "AbortError");

          try {
            await finishAssistantMessage(assistantMessageId, {
              content: text,
              status: aborted ? "ABORTED" : "FAILED",
              inputTokens,
              outputTokens,
            });
          } catch (persistError) {
            console.error("persist assistant message failed:", persistError);
          }

          if (aborted) {
            send("aborted", { assistantMessageId });
          } else {
            console.error("chat generation failed:", error);
            send("error", { code: "generation_failed" });
          }
        } finally {
          closed = true;
          try {
            controller.close();
          } catch {
            // 客户端已断开, 无需再关闭
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  },
);
