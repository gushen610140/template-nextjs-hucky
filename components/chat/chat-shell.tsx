"use client";

import {
  Bot,
  ChevronDown,
  MessageSquare,
  Pencil,
  Send,
  Square,
  Trash2,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ConfirmDeleteDialog } from "@/components/rbac/confirm-delete-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TooltipButton } from "@/components/ui/tooltip-button";
import type {
  ChatAgentOption,
  ChatCitation,
  ChatConversationDetail,
  ChatConversationSummary,
  ChatMessageRow,
} from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type ChatShellProps = {
  agents: ChatAgentOption[];
  conversations: ChatConversationSummary[];
  active: ChatConversationDetail | null;
};

type StreamStartPayload = {
  userMessageId: string;
  assistantMessageId: string;
  title: string;
  citations?: ChatCitation[] | null;
};

function nowIso() {
  return new Date().toISOString();
}

export function ChatShell({
  agents,
  conversations: initialConversations,
  active: initialActive,
}: ChatShellProps) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const router = useRouter();

  const options = agents;
  const firstAgentId = options[0]?.id ?? null;

  const [conversations, setConversations] =
    useState<ChatConversationSummary[]>(initialConversations);
  const [active, setActive] = useState<ChatConversationDetail | null>(
    initialActive,
  );
  const [messages, setMessages] = useState<ChatMessageRow[]>(
    initialActive?.messages ?? [],
  );
  const [agentId, setAgentId] = useState<string | null>(
    options.some((option) => option.id === initialActive?.agentId)
      ? (initialActive?.agentId ?? firstAgentId)
      : firstAgentId,
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 新消息到达时滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function errorText(code: string) {
    const key = `errors.${code}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  }

  function updateConversation(next: ChatConversationSummary) {
    setConversations((current) => {
      const rest = current.filter((item) => item.id !== next.id);
      return [next, ...rest];
    });
  }

  function notifyConversationsChanged() {
    window.dispatchEvent(new Event("ai-conversations-changed"));
  }

  async function handleAgentChange(nextAgentId: string) {
    setAgentId(nextAgentId);
    if (!active || nextAgentId === active.agentId) return;

    try {
      const response = await fetch(`/api/ai/conversations/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: nextAgentId }),
      });
      const data = (await response.json().catch(() => null)) as {
        conversation?: ChatConversationSummary;
        error?: string;
      } | null;

      if (!response.ok || !data?.conversation) {
        setError(errorText(data?.error ?? "unknown"));
        return;
      }

      const next = data.conversation;
      setActive((current) => (current ? { ...current, ...next } : current));
      updateConversation(next);
    } catch {
      setError(t("errors.unknown"));
    }
  }

  async function handleRename(title: string) {
    if (!active) return false;

    const response = await fetch(`/api/ai/conversations/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = (await response.json().catch(() => null)) as {
      conversation?: ChatConversationSummary;
      error?: string;
    } | null;

    if (!response.ok || !data?.conversation) {
      setError(errorText(data?.error ?? "unknown"));
      return false;
    }

    const next = data.conversation;
    setActive((current) => (current ? { ...current, ...next } : current));
    updateConversation(next);
    notifyConversationsChanged();
    return true;
  }

  async function handleDelete() {
    if (!active) return { ok: false as const, error: t("errors.unknown") };

    const response = await fetch(`/api/ai/conversations/${active.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      return { ok: false as const, error: errorText("unknown") };
    }

    const remaining = conversations.filter((item) => item.id !== active.id);
    setConversations(remaining);
    notifyConversationsChanged();
    router.push(
      remaining[0]
        ? `/${locale}/dashboard/chat/${remaining[0].id}`
        : `/${locale}/dashboard/chat`,
    );
    return { ok: true as const };
  }

  async function updateAssistant(
    messageId: string,
    patch: Partial<ChatMessageRow>,
  ) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, ...patch } : message,
      ),
    );
  }

  async function handleSend() {
    const content = input.trim();
    if (!content || streaming || !agentId) return;

    setError(null);

    let conversation = active;
    if (!conversation) {
      try {
        const response = await fetch("/api/ai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, title: t("newChatTitle") }),
        });
        const data = (await response.json().catch(() => null)) as {
          conversation?: ChatConversationSummary;
          error?: string;
        } | null;

        if (!response.ok || !data?.conversation) {
          setError(errorText(data?.error ?? "unknown"));
          return;
        }

        conversation = { ...data.conversation, messages: [] };
        setActive(conversation);
        setConversations((current) => [
          data.conversation as ChatConversationSummary,
          ...current,
        ]);
        notifyConversationsChanged();
        window.history.replaceState(
          null,
          "",
          `/${locale}/dashboard/chat/${conversation.id}`,
        );
      } catch {
        setError(t("errors.unknown"));
        return;
      }
    } else if (conversation.agentId !== agentId) {
      try {
        const response = await fetch(
          `/api/ai/conversations/${conversation.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agentId }),
          },
        );
        const data = (await response.json().catch(() => null)) as {
          conversation?: ChatConversationSummary;
          error?: string;
        } | null;

        if (!response.ok || !data?.conversation) {
          setError(errorText(data?.error ?? "unknown"));
          return;
        }

        conversation = { ...conversation, ...data.conversation };
        setActive(conversation);
        updateConversation(data.conversation);
      } catch {
        setError(t("errors.unknown"));
        return;
      }
    }

    const currentAgent = options.find((option) => option.id === agentId);
    const timestamp = nowIso();
    const userMessage: ChatMessageRow = {
      id: `local-user-${Date.now()}`,
      sequence: messages.length + 1,
      role: "USER",
      content,
      status: "COMPLETED",
      providerName: null,
      modelName: null,
      inputTokens: null,
      outputTokens: null,
      citations: null,
      createdAt: timestamp,
    };
    const assistantMessage: ChatMessageRow = {
      id: `local-assistant-${Date.now()}`,
      sequence: messages.length + 2,
      role: "ASSISTANT",
      content: "",
      status: "STREAMING",
      providerName: currentAgent?.providerName ?? conversation.providerName,
      modelName: currentAgent?.modelName ?? conversation.modelName,
      inputTokens: null,
      outputTokens: null,
      citations: null,
      createdAt: timestamp,
    };

    setInput("");
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let assistantId = assistantMessage.id;

    try {
      const response = await fetch(
        `/api/ai/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
          signal: controller.signal,
        },
      );

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "request_failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const raw = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");

          let event = "message";
          let data = "";
          for (const line of raw.split("\n")) {
            if (line.startsWith("event:")) {
              event = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              data += line.slice(5).trim();
            }
          }
          if (!data) continue;

          const payload = JSON.parse(data) as Record<string, unknown>;

          if (event === "start") {
            const start = payload as unknown as StreamStartPayload;
            const previousId = assistantId;
            assistantId = start.assistantMessageId;

            setMessages((current) =>
              current.map((message) => {
                if (message.id === previousId) {
                  return {
                    ...message,
                    id: start.assistantMessageId,
                    modelName: message.modelName,
                    citations: start.citations ?? message.citations,
                  };
                }
                if (message.id === userMessage.id) {
                  return { ...message, id: start.userMessageId };
                }
                return message;
              }),
            );

            if (start.title) {
              setConversations((current) =>
                current.map((item) =>
                  item.id === conversation.id
                    ? { ...item, title: start.title }
                    : item,
                ),
              );
              setActive((current) =>
                current ? { ...current, title: start.title } : current,
              );
            }
          } else if (event === "delta") {
            const text = typeof payload.text === "string" ? payload.text : "";
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: message.content + text }
                  : message,
              ),
            );
          } else if (event === "done") {
            await updateAssistant(assistantId, {
              status: "COMPLETED",
            });
          } else if (event === "aborted") {
            await updateAssistant(assistantId, { status: "ABORTED" });
          } else if (event === "error") {
            await updateAssistant(assistantId, { status: "FAILED" });
            setError(t("errors.generation_failed"));
          }
        }
      }
    } catch (caught) {
      const aborted =
        controller.signal.aborted ||
        (caught instanceof Error && caught.name === "AbortError");

      await updateAssistant(assistantId, {
        status: aborted ? "ABORTED" : "FAILED",
      });

      if (!aborted) {
        setError(
          caught instanceof Error
            ? errorText(caught.message)
            : t("errors.unknown"),
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  const composerDisabled = options.length === 0 || streaming;

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 shrink-0 overflow-hidden border-t md:h-[calc(100dvh-5rem)]">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-3">
          <div className="mr-auto min-w-0">
            <h1 className="truncate font-medium">
              {active?.title ?? t("newChatTitle")}
            </h1>
            <p className="truncate text-muted-foreground text-xs">
              {active?.agentName ?? t("agentHint")}
            </p>
          </div>

          <Select
            value={agentId ?? ""}
            onValueChange={handleAgentChange}
            disabled={options.length === 0 || streaming}
          >
            <SelectTrigger
              size="sm"
              className="max-w-56"
              aria-label={t("agent")}
            >
              <SelectValue placeholder={t("agentHint")} />
            </SelectTrigger>
            <SelectContent>
              {options.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {active && (
            <>
              <TooltipButton label={t("rename")}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setRenameOpen(true)}
                  aria-label={t("rename")}
                >
                  <Pencil />
                </Button>
              </TooltipButton>
              <TooltipButton label={t("delete")}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  onClick={() => setDeleteOpen(true)}
                  aria-label={t("delete")}
                >
                  <Trash2 />
                </Button>
              </TooltipButton>
            </>
          )}
        </header>

        {options.length === 0 && (
          <div className="shrink-0 p-4">
            <Alert>
              <AlertDescription>{t("noAgents")}</AlertDescription>
            </Alert>
          </div>
        )}

        {error && (
          <div className="shrink-0 px-4 pt-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div
          className="min-h-0 flex-1 overflow-y-auto px-4 py-6"
          data-lenis-prevent
        >
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-2 text-center">
              <MessageSquare className="size-8 text-muted-foreground" />
              <p className="font-medium">{t("welcomeTitle")}</p>
              <p className="text-muted-foreground text-sm">
                {t("welcomeDescription")}
              </p>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "USER" && "justify-end",
                  )}
                >
                  {message.role !== "USER" && (
                    <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border bg-muted">
                      <Bot className="size-4" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm",
                      message.role === "USER"
                        ? "bg-primary text-primary-foreground"
                        : "border bg-card",
                    )}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {message.content ||
                        (message.status === "STREAMING" ? t("thinking") : "")}
                    </div>
                    {message.role === "ASSISTANT" &&
                      (message.status === "FAILED" ||
                        message.status === "ABORTED") && (
                        <div className="mt-1 text-muted-foreground text-xs">
                          {message.status === "FAILED" && t("failed")}
                          {message.status === "ABORTED" && t("aborted")}
                        </div>
                      )}
                    {message.role === "ASSISTANT" &&
                      message.citations &&
                      message.citations.length > 0 && (
                        <details className="group mt-2 border-t pt-2">
                          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-muted-foreground text-xs [&::-webkit-details-marker]:hidden">
                            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
                            {t("sources")} ({message.citations.length})
                          </summary>
                          <ul className="mt-2 grid gap-1">
                            {message.citations.map((citation, index) => (
                              <li
                                key={`${citation.fileId}-${citation.chunkIndex}-${index}`}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <span className="truncate text-muted-foreground">
                                  {citation.libraryName} / {citation.fileName}
                                </span>
                                <span className="shrink-0 tabular-nums text-muted-foreground">
                                  {citation.score.toFixed(3)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                  </div>
                  {message.role === "USER" && (
                    <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border bg-muted">
                      <User className="size-4" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={t("inputPlaceholder")}
              disabled={streaming || options.length === 0}
              rows={3}
              className="min-h-20 resize-none"
            />
            {streaming ? (
              <Button
                variant="outline"
                onClick={() => abortRef.current?.abort()}
                aria-label={t("stop")}
              >
                <Square />
                {t("stop")}
              </Button>
            ) : (
              <Button
                onClick={() => void handleSend()}
                disabled={!input.trim() || !agentId || composerDisabled}
                aria-label={t("send")}
              >
                <Send />
                {t("send")}
              </Button>
            )}
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-muted-foreground text-xs">
            {t("inputHint")}
          </p>
        </div>
      </section>

      {renameOpen && active && (
        <RenameDialog
          initialTitle={active.title}
          onClose={() => setRenameOpen(false)}
          onSubmit={handleRename}
        />
      )}

      {deleteOpen && active && (
        <ConfirmDeleteDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteOpen(false);
          }}
          title={t("deleteTitle")}
          description={t("deleteDescription", { title: active.title })}
          confirmLabel={t("delete")}
          cancelLabel={t("cancel")}
          pendingLabel={t("deleting")}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function RenameDialog({
  initialTitle,
  onClose,
  onSubmit,
}: {
  initialTitle: string;
  onClose: () => void;
  onSubmit: (title: string) => Promise<boolean>;
}) {
  const t = useTranslations("Chat");
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    const ok = await onSubmit(title.trim());
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t("renameTitle")}</DialogTitle>
            <DialogDescription>{t("renameDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="chat-title">{t("title")}</Label>
            <Input
              id="chat-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
