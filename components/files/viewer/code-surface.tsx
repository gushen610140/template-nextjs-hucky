"use client";

import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import type { CodeLanguage } from "@/lib/files/preview";
import { cn } from "@/lib/utils";

type CodeSurfaceProps = {
  value: string;
  language: CodeLanguage | null;
  editable: boolean;
  onChange?: (value: string) => void;
  className?: string;
};

function languageExtension(language: CodeLanguage | null) {
  switch (language) {
    case "javascript":
      return [javascript({ jsx: true })];
    case "typescript":
      return [javascript({ jsx: true, typescript: true })];
    case "json":
      return [json()];
    case "markdown":
      return [markdown()];
    case "python":
      return [python()];
    case "html":
      return [html()];
    case "css":
      return [css()];
    case "xml":
      return [xml()];
    case "sql":
      return [sql()];
    case "yaml":
      return [yaml()];
    default:
      return [];
  }
}

/** CodeMirror 包装; 语言包按需静态引入, 整个 chunk 只在打开文本文件时加载 */
export function CodeSurface({
  value,
  language,
  editable,
  onChange,
  className,
}: CodeSurfaceProps) {
  const { resolvedTheme } = useTheme();
  const extensions = useMemo(
    () => [...languageExtension(language), EditorView.lineWrapping],
    [language],
  );

  return (
    <div
      className={cn(
        "h-full min-h-0 overflow-hidden rounded-lg border bg-card text-sm",
        className,
      )}
      data-lenis-prevent
    >
      <CodeMirror
        value={value}
        height="100%"
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        editable={editable}
        readOnly={!editable}
        extensions={extensions}
        onChange={onChange}
        basicSetup={{
          foldGutter: true,
          highlightActiveLine: editable,
          highlightActiveLineGutter: editable,
        }}
        className="h-full [&_.cm-editor]:h-full [&_.cm-scroller]:font-mono"
      />
    </div>
  );
}
