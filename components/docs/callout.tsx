import {
  CircleAlert,
  CircleCheck,
  Info,
  Lightbulb,
  TriangleAlert,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type CalloutType = "info" | "warn" | "warning" | "error" | "success" | "idea";

const ICONS = {
  info: Info,
  warn: TriangleAlert,
  warning: TriangleAlert,
  error: CircleAlert,
  success: CircleCheck,
  idea: Lightbulb,
} satisfies Record<CalloutType, typeof Info>;

type DocsCalloutProps = Omit<ComponentProps<"div">, "title"> & {
  type?: CalloutType;
  title?: ReactNode;
  icon?: ReactNode;
};

/**
 * 文档提示框：用 shadcn Alert 二次包装，替代 Fumadocs 自带的 Callout。
 * 这样文档正文和业务组件共用同一套语义色 token。
 */
export function DocsCallout({
  type = "info",
  title,
  icon,
  className,
  children,
  ...props
}: DocsCalloutProps) {
  const Icon = ICONS[type];
  const isWarning = type === "warn" || type === "warning";

  return (
    <Alert
      className={cn(
        "my-6",
        isWarning && "border-primary/40 bg-primary/5 [&>svg]:text-primary",
        className,
      )}
      variant={type === "error" ? "destructive" : "default"}
      {...props}
    >
      {icon ?? <Icon />}
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
