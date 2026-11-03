"use client";

import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

/** Markdown 预览; 不渲染原始 HTML, 链接统一新开标签 */
export function MarkdownPreview({ content }: { content: string }) {
  return (
    <div
      className="mx-auto h-full min-h-0 w-full max-w-3xl overflow-y-auto rounded-xl border bg-card p-6 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:font-heading [&_h1]:font-semibold [&_h1]:text-2xl [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:font-heading [&_h2]:font-semibold [&_h2]:text-xl [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:font-semibold [&_h3]:text-base [&_hr]:my-6 [&_img]:max-w-full [&_img]:rounded-lg [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:bg-muted/60 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
      data-lenis-prevent
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ href, children, ...props }) => (
            <a href={href} target="_blank" rel="noreferrer" {...props}>
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
