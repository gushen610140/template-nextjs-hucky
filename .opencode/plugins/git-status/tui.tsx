import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Plugin } from "@opencode/plugin/tui";

const execFileAsync = promisify(execFile);
const REFRESH_MS = 2_000;
const MAX_LINES = 12;
const MAX_LINE_LENGTH = 80;

const formatOutput = (output: string) => {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return "(clean)";

  const visible = lines
    .slice(0, MAX_LINES)
    .map((line) =>
      line.length > MAX_LINE_LENGTH
        ? `${line.slice(0, MAX_LINE_LENGTH - 3)}...`
        : line,
    );
  if (lines.length > MAX_LINES) {
    visible.push(`... +${lines.length - MAX_LINES} lines`);
  }
  return visible.join("\n");
};

export default Plugin.define({
  id: "git-status",
  async setup(context) {
    const [state, updateState] = context.storage.memory("git-status", {
      initial: { text: "loading..." },
    });

    const directory = () =>
      (context.location ?? context.data.location.default())?.directory;

    const refresh = async () => {
      const cwd = directory();
      if (!cwd) {
        await updateState((draft) => {
          draft.text = "no project location";
        });
        return;
      }

      try {
        const { stdout } = await execFileAsync("git", ["status", "-sb"], {
          cwd,
          windowsHide: true,
          maxBuffer: 1024 * 1024,
          timeout: 5_000,
        });
        await updateState((draft) => {
          draft.text = formatOutput(stdout);
        });
      } catch (error) {
        await updateState((draft) => {
          draft.text =
            error instanceof Error
              ? error.message.split(/\r?\n/)[0]
              : String(error);
        });
      }
    };

    const timer = setInterval(() => void refresh(), REFRESH_MS);
    void refresh();

    const unregister = context.ui.slot({
      append: "sidebar.content",
      render: () => (
        <text
          fg={context.theme.text.base}
        >{`git status -sb\n${state().text}`}</text>
      ),
    });

    return () => {
      clearInterval(timer);
      unregister();
    };
  },
});
