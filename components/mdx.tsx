import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { DocsCallout } from "@/components/docs/callout";
import { Mermaid } from "@/components/mermaid";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    // 文档里的提示框统一走 shadcn Alert，而不是 Fumadocs 自带样式
    Callout: DocsCallout,
    Mermaid,
    ...components,
    // fumadocs 的默认组件表里 `log` 被推断为 Component<never>，与 mdx 的
    // 索引签名冲突；这里只做类型收敛，不影响运行时。
  } as MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
