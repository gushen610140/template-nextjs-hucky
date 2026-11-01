"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Cpu,
  Gauge,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* ── Mock data ─────────────────────────────────────────────────────────── */

const REQUEST_VOLUME = [
  42, 38, 35, 31, 29, 34, 48, 72, 96, 118, 132, 141, 128, 136, 149, 162, 158,
  147, 166, 189, 204, 186, 154, 121,
];

const WEEKLY_USERS = [
  { key: "mon", value: 62 },
  { key: "tue", value: 78 },
  { key: "wed", value: 54 },
  { key: "thu", value: 88 },
  { key: "fri", value: 96 },
  { key: "sat", value: 44 },
  { key: "sun", value: 38 },
] as const;

const STATUS_SEGMENTS = [
  { key: "success", value: 82, color: "var(--chart-2)" },
  { key: "stream", value: 9, color: "var(--chart-3)" },
  { key: "cache", value: 6, color: "var(--chart-4)" },
  { key: "error", value: 3, color: "var(--chart-5)" },
] as const;

const TOP_MODELS = [
  { name: "GPT-4.1", value: 34, tokens: "428M" },
  { name: "Claude 3.7", value: 26, tokens: "326M" },
  { name: "DeepSeek V3", value: 18, tokens: "224M" },
  { name: "Gemini 2.5", value: 13, tokens: "164M" },
  { name: "Llama 4", value: 9, tokens: "112M" },
] as const;

const KPIS: {
  labelKey: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  good: boolean;
  icon: ComponentType<{ className?: string }>;
  spark: number[];
}[] = [
  {
    labelKey: "kpiUsers",
    value: "12,480",
    delta: "8.2%",
    trend: "up",
    good: true,
    icon: Users,
    spark: [18, 22, 20, 27, 25, 31, 29, 36, 34, 41, 39, 48],
  },
  {
    labelKey: "kpiRequests",
    value: "1.24M",
    delta: "12.4%",
    trend: "up",
    good: true,
    icon: Activity,
    spark: [24, 21, 26, 25, 31, 29, 34, 38, 35, 42, 45, 52],
  },
  {
    labelKey: "kpiErrorRate",
    value: "0.42%",
    delta: "0.08%",
    trend: "down",
    good: true,
    icon: Gauge,
    spark: [42, 40, 44, 38, 36, 39, 33, 31, 34, 28, 26, 24],
  },
  {
    labelKey: "kpiLatency",
    value: "184ms",
    delta: "12ms",
    trend: "down",
    good: true,
    icon: Cpu,
    spark: [52, 48, 50, 46, 44, 47, 41, 38, 40, 35, 33, 30],
  },
];

/* ── Small SVG helpers ─────────────────────────────────────────────────── */

type Point = [number, number];

function buildPoints(data: readonly number[], width: number, height: number) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return [x, y] as Point;
  });
}

function smoothPath(points: readonly Point[]) {
  if (points.length < 2) return "";

  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let index = 0; index < points.length - 1; index++) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;

    const control1: Point = [
      current[0] + (next[0] - previous[0]) / 6,
      current[1] + (next[1] - previous[1]) / 6,
    ];
    const control2: Point = [
      next[0] - (after[0] - current[0]) / 6,
      next[1] - (after[1] - current[1]) / 6,
    ];

    path += ` C ${control1[0]} ${control1[1]}, ${control2[0]} ${control2[1]}, ${next[0]} ${next[1]}`;
  }

  return path;
}

function Sparkline({
  data,
  good,
  className,
}: {
  data: readonly number[];
  good: boolean;
  className?: string;
}) {
  const width = 120;
  const height = 38;
  const points = buildPoints(data, width, height);
  const line = smoothPath(points);
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn(
        "h-10 w-28",
        good ? "text-primary" : "text-destructive",
        className,
      )}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path d={area} fill="currentColor" opacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ── Cards ─────────────────────────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  delta,
  trend,
  good,
  icon: Icon,
  spark,
}: {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  good: boolean;
  icon: ComponentType<{ className?: string }>;
  spark: number[];
}) {
  const TrendIcon = trend === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <Card size="sm" className="gap-0">
      <div className="flex items-center justify-between gap-2 px-(--card-spacing)">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <span className="text-muted-foreground text-sm">{label}</span>
        </div>
        <span
          className={cn(
            "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
            good
              ? "bg-primary/10 text-primary"
              : "bg-destructive/10 text-destructive",
          )}
        >
          <TrendIcon className="size-3" />
          {delta}
        </span>
      </div>
      <CardContent className="mt-3 flex items-end justify-between gap-2">
        <span className="font-heading text-2xl font-semibold tracking-tight">
          {value}
        </span>
        <Sparkline data={spark} good={good} />
      </CardContent>
    </Card>
  );
}

function VolumeCard() {
  const t = useTranslations("Dashboard");
  const width = 640;
  const height = 220;
  const points = buildPoints(REQUEST_VOLUME, width, height);
  const line = smoothPath(points);
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <Card className="xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3 px-(--card-spacing)">
        <div className="flex flex-col gap-1">
          <CardTitle>{t("requestVolume")}</CardTitle>
          <span className="text-muted-foreground text-sm">
            {t("requestVolumeDescription")}
          </span>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <span className="size-1.5 rounded-full bg-primary" />
          {t("live")}
        </Badge>
      </div>
      <CardContent className="flex flex-1 flex-col">
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-3xl font-semibold tracking-tight">
            1,243,806
          </span>
          <span className="text-primary text-sm font-medium">+12.4%</span>
          <span className="text-muted-foreground text-xs">
            {t("vsLastPeriod")}
          </span>
        </div>

        <div className="mt-5 flex flex-1 flex-col">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-48 w-full md:h-56"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="volume-fill" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-2)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-2)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((row) => (
              <line
                key={row}
                x1={0}
                x2={width}
                y1={(height / 3) * row}
                y2={(height / 3) * row}
                stroke="var(--border)"
                strokeDasharray="4 6"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={area} fill="url(#volume-fill)" />
            <path
              d={line}
              fill="none"
              stroke="var(--chart-2)"
              strokeWidth={2.5}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            {[
              "00:00",
              "04:00",
              "08:00",
              "12:00",
              "16:00",
              "20:00",
              "24:00",
            ].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusCard() {
  const t = useTranslations("Dashboard");
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("requestStatus")}</CardTitle>
        <span className="text-muted-foreground text-sm">
          {t("requestStatusDescription")}
        </span>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center gap-5">
        <div className="relative">
          <svg viewBox="0 0 140 140" className="size-36" aria-hidden="true">
            <circle
              cx={70}
              cy={70}
              r={radius}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={14}
            />
            {STATUS_SEGMENTS.map((segment) => {
              const length = (segment.value / 100) * circumference;
              const dashOffset = -(offset / 100) * circumference;
              offset += segment.value;

              return (
                <circle
                  key={segment.key}
                  cx={70}
                  cy={70}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={14}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 70 70)"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading text-2xl font-semibold">82%</span>
            <span className="text-muted-foreground text-xs">
              {t("successRate")}
            </span>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2">
          {STATUS_SEGMENTS.map((segment) => (
            <div
              key={segment.key}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                {t(`status.${segment.key}`)}
              </span>
              <span className="font-medium tabular-nums">{segment.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyUsersCard() {
  const t = useTranslations("Dashboard");
  const max = Math.max(...WEEKLY_USERS.map((item) => item.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("weeklyUsers")}</CardTitle>
        <span className="text-muted-foreground text-sm">
          {t("weeklyUsersDescription")}
        </span>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end">
        <div className="flex h-44 items-end gap-2">
          {WEEKLY_USERS.map((item, index) => (
            <div
              key={item.key}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {item.value}k
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all",
                    index === 4 ? "bg-primary" : "bg-primary/25",
                  )}
                  style={{ height: `${(item.value / max) * 100}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground">
                {t(`weekdays.${item.key}`)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TopModelsCard() {
  const t = useTranslations("Dashboard");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("topModels")}</CardTitle>
        <span className="text-muted-foreground text-sm">
          {t("topModelsDescription")}
        </span>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center gap-3">
        {TOP_MODELS.map((model, index) => (
          <div key={model.name} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{model.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {model.tokens}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${model.value * 2.4}%`,
                  backgroundColor: `var(--chart-${Math.min(index + 1, 5)})`,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ActivityHeatmapCard() {
  const t = useTranslations("Dashboard");
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const weeks = 18;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 px-(--card-spacing)">
        <div className="flex flex-col gap-1">
          <CardTitle>{t("activityHeatmap")}</CardTitle>
          <span className="text-muted-foreground text-sm">
            {t("activityHeatmapDescription")}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {t("less")}
          {[0.12, 0.3, 0.5, 0.7, 0.95].map((alpha) => (
            <span
              key={alpha}
              className="size-2.5 rounded-[2px] bg-primary"
              style={{ opacity: alpha }}
            />
          ))}
          {t("more")}
        </div>
      </div>
      <CardContent className="flex flex-1 items-center">
        <div className="flex w-full gap-1.5 overflow-hidden">
          <div className="flex flex-col justify-between py-0.5 text-[10px] text-muted-foreground">
            {days.map((day) => (
              <span key={day} className="h-3 leading-3">
                {t(`weekdays.${day}`)}
              </span>
            ))}
          </div>
          <div className="grid flex-1 grid-flow-col grid-rows-7 gap-1">
            {Array.from({ length: weeks * 7 }).map((_, index) => {
              const row = index % 7;
              const col = Math.floor(index / 7);
              const value = (row * 31 + col * 17 + ((col * row) % 23)) % 100;

              return (
                <span
                  key={`${col}-${row}`}
                  className="aspect-square min-w-2 rounded-[2px] bg-primary"
                  style={{ opacity: 0.08 + (value / 100) * 0.85 }}
                />
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export function DashboardOverview() {
  const t = useTranslations("Dashboard");

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("overviewTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("overviewSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            {t("updatedJustNow")}
          </Badge>
          <Button variant="outline" size="sm">
            <CalendarDays data-icon="inline-start" />
            {t("last30Days")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((kpi) => (
          <KpiCard
            key={kpi.labelKey}
            label={t(kpi.labelKey)}
            value={kpi.value}
            delta={kpi.delta}
            trend={kpi.trend}
            good={kpi.good}
            icon={kpi.icon}
            spark={kpi.spark}
          />
        ))}
      </div>

      <div className="grid flex-1 gap-4 xl:grid-cols-3">
        <VolumeCard />
        <StatusCard />
        <WeeklyUsersCard />
        <TopModelsCard />
        <ActivityHeatmapCard />
      </div>
    </div>
  );
}
