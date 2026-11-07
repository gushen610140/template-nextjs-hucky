export type ToolStatus = "running" | "done" | "error";
export type ToolLine = { name: string; status: ToolStatus };

const TEXT_LIMIT = 6000;

function clip(text: string) {
  if (text.length <= TEXT_LIMIT) return text;
  return `…（前略）\n${text.slice(-TEXT_LIMIT)}`;
}

function marker(status: ToolStatus) {
  if (status === "running") return "▸";
  if (status === "done") return "✓";
  return "✗";
}

export function buildCard(input: {
  text: string;
  tools: ToolLine[];
  status: "running" | "done" | "error";
  meta?: string;
  note?: string;
}) {
  const template =
    input.status === "done" ? "green" : input.status === "error" ? "red" : "blue";

  const elements: Record<string, unknown>[] = [];

  if (input.meta) {
    elements.push({
      tag: "note",
      elements: [{ tag: "plain_text", content: input.meta }],
    });
  }

  elements.push({
    tag: "div",
    text: {
      tag: "lark_md",
      content: clip(input.text.trim() || "处理中…"),
    },
  });

  if (input.tools.length > 0) {
    elements.push({ tag: "hr" });
    elements.push({
      tag: "div",
      text: {
        tag: "lark_md",
        content: input.tools
          .slice(-8)
          .map((tool) => `${marker(tool.status)} ${tool.name}`)
          .join("\n"),
      },
    });
  }

  if (input.note) {
    elements.push({
      tag: "note",
      elements: [{ tag: "plain_text", content: input.note }],
    });
  }

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: "OpenCode" },
      template,
    },
    elements,
  };
}

export function buildPermissionCard(input: {
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
      title: { tag: "plain_text", content: "OpenCode 权限请求" },
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
