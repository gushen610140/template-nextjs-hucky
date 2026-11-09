import { Rpc } from "@opencode/plugin/rpc";

export type FeishuStatus = {
  enabled: boolean;
  sdkLoaded: boolean;
  wsState: string;
  reconnectAttempts: number;
  messageCount: number;
  busyChats: string[];
  lastEventAt: string | null;
  lastError: string | null;
  lastScreenshotCommit: string | null;
  lastScreenshotAt: string | null;
  lastScreenshotError: string | null;
};

export const FeishuBridge = Rpc.define({
  id: "hucky.feishu-bridge",
  events: {},
  methods: {
    status: {
      input: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      output: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          sdkLoaded: { type: "boolean" },
          wsState: { type: "string" },
          reconnectAttempts: { type: "number" },
          messageCount: { type: "number" },
          busyChats: { type: "array", items: { type: "string" } },
          lastEventAt: { type: ["string", "null"] },
          lastError: { type: ["string", "null"] },
          lastScreenshotCommit: { type: ["string", "null"] },
          lastScreenshotAt: { type: ["string", "null"] },
          lastScreenshotError: { type: ["string", "null"] },
        },
        required: [
          "enabled",
          "sdkLoaded",
          "wsState",
          "reconnectAttempts",
          "messageCount",
          "busyChats",
          "lastEventAt",
          "lastError",
          "lastScreenshotCommit",
          "lastScreenshotAt",
          "lastScreenshotError",
        ],
        additionalProperties: false,
      },
    },
  },
});
