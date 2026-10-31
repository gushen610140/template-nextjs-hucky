"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { HoverInfo } from "@/components/landing/scene/interaction";
import type { LandingMode } from "@/components/landing/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingHud({
  mode,
  hover,
  onResume,
}: {
  mode: LandingMode;
  hover: HoverInfo;
  onResume: () => void;
}) {
  const t = useTranslations("Landing");

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {mode !== "intro" && mode !== "leaving" && (
        <div className="absolute top-6 left-6 flex items-center gap-3">
          <span className="text-xs font-semibold tracking-[0.35em] uppercase">
            Hucky
          </span>
          <span
            className={cn(
              "size-1.5 rounded-full",
              mode === "explore" ? "bg-foreground/70" : "bg-foreground/20",
            )}
          />
        </div>
      )}

      {mode === "explore" && (
        <>
          <div className="absolute top-6 right-6 text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
            ESC · {t("releaseCursor")}
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span
              className={cn(
                "block size-[5px] rounded-full bg-foreground transition-opacity duration-200",
                hover ? "opacity-30" : "opacity-70",
              )}
            />
            <span
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/20 transition-all duration-200",
                hover
                  ? "size-7 border-foreground/30 opacity-100"
                  : "size-3 opacity-60",
              )}
            />
          </div>

          {hover ? (
            <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-background/85 px-5 py-2.5 text-xs backdrop-blur">
              <span className="font-medium">{hover.label}</span>
              <span className="h-3 w-px bg-border" />
              <span className="text-muted-foreground">{hover.hint}</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                E
              </kbd>
            </div>
          ) : (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
              {t("hintMove")}
            </div>
          )}
        </>
      )}

      {mode === "paused" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onResume}
            className="pointer-events-auto rounded-full bg-background/80 px-6 tracking-normal normal-case backdrop-blur"
          >
            {t("hintResume")}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function LandingIntro({
  onEnter,
  onSkip,
}: {
  onEnter: () => void;
  onSkip: () => void;
}) {
  const t = useTranslations("Landing");

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-b from-background/85 via-background/45 to-background/85 px-6 text-center">
      <p className="text-[10px] tracking-[0.6em] text-muted-foreground uppercase">
        Hucky · Space 01
      </p>
      <h1 className="mt-6 max-w-2xl font-heading text-5xl leading-none tracking-tight text-balance md:text-7xl">
        {t("introTitle")}
      </h1>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
        {t("introSubtitle")}
      </p>
      <Button
        type="button"
        size="lg"
        onClick={onEnter}
        className="pointer-events-auto mt-9 rounded-full bg-foreground px-7 tracking-normal text-background normal-case hover:bg-foreground/90"
      >
        {t("enter")}
        <ArrowRight data-icon="inline-end" />
      </Button>
      <p className="mt-6 text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
        {t("hintMove")}
      </p>
      <button
        type="button"
        onClick={onSkip}
        className="pointer-events-auto mt-12 text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
      >
        {t("skip")}
      </button>
    </div>
  );
}
