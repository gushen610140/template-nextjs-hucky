"use client";

import { ArrowLeft, MessageSquare, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { ChatConversationSummary, RagLibraryRow } from "@/lib/ai/types";

export type AiSubSidebarMode = "chat" | "rag";

export function AiSubSidebar({
  mode,
  onBack,
}: {
  mode: AiSubSidebarMode;
  onBack: () => void;
}) {
  const tChat = useTranslations("Chat");
  const tRag = useTranslations("Rag");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const [conversations, setConversations] = useState<ChatConversationSummary[]>(
    [],
  );
  const [libraries, setLibraries] = useState<RagLibraryRow[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (mode !== "chat") return;
    let cancelled = false;

    async function load() {
      const response = await fetch("/api/ai/conversations");
      const data = (await response.json().catch(() => null)) as {
        conversations?: ChatConversationSummary[];
      } | null;
      if (!cancelled && data?.conversations) {
        setConversations(data.conversations);
      }
    }

    void load();
    window.addEventListener("ai-conversations-changed", load);
    return () => {
      cancelled = true;
      window.removeEventListener("ai-conversations-changed", load);
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "rag") return;
    let cancelled = false;

    async function load() {
      const response = await fetch("/api/ai/rag/libraries");
      const data = (await response.json().catch(() => null)) as {
        libraries?: RagLibraryRow[];
      } | null;
      if (!cancelled && data?.libraries) {
        setLibraries(data.libraries);
      }
    }

    void load();
    window.addEventListener("ai-rag-libraries-changed", load);
    return () => {
      cancelled = true;
      window.removeEventListener("ai-rag-libraries-changed", load);
    };
  }, [mode]);

  function closeMobile() {
    setOpenMobile(false);
  }

  async function handleNewChat() {
    if (creating) return;
    setCreating(true);
    try {
      const agentsResponse = await fetch("/api/ai/agents");
      const agentsData = (await agentsResponse.json().catch(() => null)) as {
        agents?: Array<{ id: string }>;
      } | null;
      const agentId = agentsData?.agents?.[0]?.id;
      if (!agentId) {
        router.push(`/${locale}/dashboard/chat`);
        closeMobile();
        return;
      }

      const response = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, title: tChat("newChatTitle") }),
      });
      const data = (await response.json().catch(() => null)) as {
        conversation?: ChatConversationSummary;
      } | null;
      const conversation = data?.conversation;
      if (conversation) {
        setConversations((current) => [conversation, ...current]);
        router.push(`/${locale}/dashboard/chat/${conversation.id}`);
      }
      closeMobile();
    } finally {
      setCreating(false);
    }
  }

  function handleNewLibrary() {
    router.push(`/${locale}/dashboard/rag?create=${Date.now()}`);
    closeMobile();
  }

  const label = mode === "chat" ? tChat("conversations") : tRag("title");

  return (
    <>
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                onBack();
                closeMobile();
              }}
              tooltip={tChat("backToMain")}
            >
              <ArrowLeft />
              <span>{tChat("backToMain")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup className="min-h-0 flex-1">
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            {mode === "chat" ? (
              <SidebarMenuButton
                onClick={() => void handleNewChat()}
                disabled={creating}
                tooltip={tChat("newChat")}
              >
                <Plus />
                <span>{tChat("newChat")}</span>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                onClick={handleNewLibrary}
                tooltip={tRag("create")}
              >
                <Plus />
                <span>{tRag("create")}</span>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>

          {mode === "chat"
            ? conversations.map((conversation) => (
                <SidebarMenuItem key={conversation.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.includes(
                      `/dashboard/chat/${conversation.id}`,
                    )}
                    tooltip={conversation.title}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        router.push(
                          `/${locale}/dashboard/chat/${conversation.id}`,
                        );
                        closeMobile();
                      }}
                    >
                      <MessageSquare />
                      <span className="truncate">{conversation.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            : libraries.map((library) => (
                <SidebarMenuItem key={library.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.includes(`/dashboard/rag/${library.id}`)}
                    tooltip={library.name}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        router.push(`/${locale}/dashboard/rag/${library.id}`);
                        closeMobile();
                      }}
                    >
                      <span className="truncate">{library.name}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
