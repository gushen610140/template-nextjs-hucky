import { Plugin } from "@opencode/plugin/tui";
import { FeishuBridge, type FeishuStatus } from "./rpc";

const REFRESH_MS = 1_500;

function describeError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const detail = error as { message?: unknown; type?: unknown };
    if (typeof detail.message === "string" && detail.message.length > 0) {
      return detail.message;
    }
    if (typeof detail.type === "string") return detail.type;
    try {
      return JSON.stringify(error);
    } catch {
      return "unknown error";
    }
  }
  return String(error);
}

export default Plugin.define({
  id: "hucky.feishu-bridge-tui",

  async setup(context) {
    const [state, updateState] = context.storage.memory("feishu-bridge", {
      initial: {
        data: null as FeishuStatus | null,
        error: "",
      },
    });

    const location = () =>
      context.location ?? context.data.location.default();

    const refresh = async () => {
      try {
        const data = (await context.client
          .rpc(FeishuBridge)
          .status({}, { location: location() })) as FeishuStatus;
        await updateState((draft) => {
          draft.data = data;
          draft.error = "";
        });
      } catch (error) {
        await updateState((draft) => {
          draft.error = describeError(error);
        });
      }
    };

    const timer = setInterval(() => void refresh(), REFRESH_MS);
    void refresh();

    const unregister = context.ui.slot({
      append: "sidebar.content",
      render: () => {
        const data = state.data;
        const status = data
          ? data.enabled
            ? data.wsState
            : "off"
          : "unavailable";
        const detail = state.error
          ? `error: ${state.error.split(/\r?\n/)[0].slice(0, 48)}`
          : data
            ? `${data.busyChats.length > 0 ? `busy ${data.busyChats.length}` : "idle"} · ${data.messageCount} events`
            : "no server response";

        return (
          <box flexDirection="column">
            <text fg={context.theme.text.muted}>{"\nFEISHU"}</text>
            <text fg={context.theme.text.base}>{status}</text>
            <text fg={context.theme.text.faint}>{detail}</text>
          </box>
        );
      },
    });

    return () => {
      clearInterval(timer);
      unregister();
    };
  },
});
