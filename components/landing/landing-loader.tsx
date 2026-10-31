"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function LandingLoader({
  progress,
  done,
}: {
  progress: number;
  done: boolean;
}) {
  const t = useTranslations("Landing");

  return (
    <div
      aria-hidden={done}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-700 ease-out",
        done ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      <div className="flex flex-col items-center gap-7">
        <span className="text-[10px] font-medium tracking-[0.6em] text-muted-foreground uppercase">
          Hucky
        </span>
        <div className="h-px w-44 overflow-hidden bg-border">
          <div
            className="h-full bg-foreground transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground">
          {String(Math.round(progress)).padStart(3, "0")}
        </span>
      </div>
      <p className="absolute bottom-10 text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
        {t("loading")}
      </p>
    </div>
  );
}
