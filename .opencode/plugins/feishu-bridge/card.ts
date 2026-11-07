export type CardStatus = "running" | "done" | "error";

const TEXT_LIMIT = 6000;

function clip(text: string) {
  if (text.length <= TEXT_LIMIT) return text;
  return `…（前略）\n${text.slice(-TEXT_LIMIT)}`;
}

function template(status: CardStatus) {
  if (status === "done") return "green";
  if (status === "error") return "red";
  return "blue";
}

export function buildCard(input: {
  title: string;
  meta?: string;
  text: string;
  status: CardStatus;
  tools?: Array<{ name: string; count: number; running: number }>;
}) {
  const elements: Record<string, unknown>[] = [
    {
      tag: "div",
      text: {
        tag: "lark_md",
        content: clip(input.text.trim() || "处理中…"),
      },
    },
  ];

  if (input.tools && input.tools.length > 0) {
    elements.push({
      tag: "note",
      elements: [
        {
          tag: "plain_text",
          content: input.tools
            .map(
              (tool) =>
                `${tool.name}×${tool.count}${tool.running > 0 ? ` (${tool.running} running)` : ""}`,
            )
            .join(" · "),
        },
      ],
    });
  }

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: input.title },
      ...(input.meta
        ? { subtitle: { tag: "plain_text", content: input.meta } }
        : {}),
      template: template(input.status),
    },
    elements,
  };
}

export function buildMessageCard(input: { title: string; text: string }) {
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: input.title },
      template: "blue",
    },
    elements: [
      {
        tag: "div",
        text: { tag: "lark_md", content: clip(input.text) },
      },
    ],
  };
}

export function buildPermissionCard(input: {
  title: string;
  action: string;
  resources: string[];
  message?: string;
  requestID: string;
  sessionID: string;
}) {
  const value = (decision: "once" | "always" | "reject") => ({
    kind: "feishu-permission",
    requestID: input.requestID,
    sessionID: input.sessionID,
    decision,
  });

  const body = [
    `**${input.action}**`,
    ...input.resources.map((item) => `- ${item}`),
    input.message ? `\n${input.message}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: `${input.title} 权限请求` },
      template: "orange",
    },
    elements: [
      { tag: "div", text: { tag: "lark_md", content: body } },
      {
        tag: "action",
        actions: [
          {
            tag: "button",
            text: { tag: "plain_text", content: "允许一次" },
            type: "primary",
            value: value("once"),
          },
          {
            tag: "button",
            text: { tag: "plain_text", content: "始终允许" },
            type: "default",
            value: value("always"),
          },
          {
            tag: "button",
            text: { tag: "plain_text", content: "拒绝" },
            type: "danger",
            value: value("reject"),
          },
        ],
      },
    ],
  };
}
