import { Rpc } from "@opencode/plugin/rpc";

export type FeishuPmStatus = {
  enabled: boolean;
  watching: boolean;
  target: string | null;
  pages: string[];
  base: string;
  pollMs: number;
  lastCommit: string | null;
  lastAt: string | null;
  lastError: string | null;
  receiverState: "idle" | "starting" | "connected" | "failed";
  received: number;
  lastRequirement: string | null;
};

export const FeishuPm = Rpc.define({
  id: "hucky.feishu-pm",
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
          watching: { type: "boolean" },
          target: { type: ["string", "null"] },
          pages: { type: "array", items: { type: "string" } },
          base: { type: "string" },
          pollMs: { type: "number" },
          lastCommit: { type: ["string", "null"] },
          lastAt: { type: ["string", "null"] },
          lastError: { type: ["string", "null"] },
          receiverState: { type: "string" },
          received: { type: "number" },
          lastRequirement: { type: ["string", "null"] },
        },
        required: [
          "enabled",
          "watching",
          "target",
          "pages",
          "base",
          "pollMs",
          "lastCommit",
          "lastAt",
          "lastError",
          "receiverState",
          "received",
          "lastRequirement",
        ],
        additionalProperties: false,
      },
    },
  },
});
