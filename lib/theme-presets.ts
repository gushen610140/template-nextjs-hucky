const SCALE_STOPS = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
] as const;

type ScaleStop = (typeof SCALE_STOPS)[number];
type Scale = Record<ScaleStop, string>;

const BASE_SCALES = {
  neutral: {
    "50": "oklch(98.5% 0 0)",
    "100": "oklch(97% 0 0)",
    "200": "oklch(92.2% 0 0)",
    "300": "oklch(87% 0 0)",
    "400": "oklch(70.8% 0 0)",
    "500": "oklch(55.6% 0 0)",
    "600": "oklch(43.9% 0 0)",
    "700": "oklch(37.1% 0 0)",
    "800": "oklch(26.9% 0 0)",
    "900": "oklch(20.5% 0 0)",
    "950": "oklch(14.5% 0 0)",
  },
  stone: {
    "50": "oklch(98.5% 0.001 106.423)",
    "100": "oklch(97% 0.001 106.424)",
    "200": "oklch(92.3% 0.003 48.717)",
    "300": "oklch(86.9% 0.005 56.366)",
    "400": "oklch(70.9% 0.01 56.259)",
    "500": "oklch(55.3% 0.013 58.071)",
    "600": "oklch(44.4% 0.011 73.639)",
    "700": "oklch(37.4% 0.01 67.558)",
    "800": "oklch(26.8% 0.007 34.298)",
    "900": "oklch(21.6% 0.006 56.043)",
    "950": "oklch(14.7% 0.004 49.25)",
  },
  zinc: {
    "50": "oklch(98.5% 0 0)",
    "100": "oklch(96.7% 0.001 286.375)",
    "200": "oklch(92% 0.004 286.32)",
    "300": "oklch(87.1% 0.006 286.286)",
    "400": "oklch(70.5% 0.015 286.067)",
    "500": "oklch(55.2% 0.016 285.938)",
    "600": "oklch(44.2% 0.017 285.786)",
    "700": "oklch(37% 0.013 285.805)",
    "800": "oklch(27.4% 0.006 286.033)",
    "900": "oklch(21% 0.006 285.885)",
    "950": "oklch(14.1% 0.005 285.823)",
  },
  mauve: {
    "50": "oklch(98.5% 0 0)",
    "100": "oklch(96% 0.003 325.6)",
    "200": "oklch(92.2% 0.005 325.62)",
    "300": "oklch(86.5% 0.012 325.68)",
    "400": "oklch(71.1% 0.019 323.02)",
    "500": "oklch(54.2% 0.034 322.5)",
    "600": "oklch(43.5% 0.029 321.78)",
    "700": "oklch(36.4% 0.029 323.89)",
    "800": "oklch(26.3% 0.024 320.12)",
    "900": "oklch(21.2% 0.019 322.12)",
    "950": "oklch(14.5% 0.008 326)",
  },
  olive: {
    "50": "oklch(98.8% 0.003 106.5)",
    "100": "oklch(96.6% 0.005 106.5)",
    "200": "oklch(93% 0.007 106.5)",
    "300": "oklch(88% 0.011 106.6)",
    "400": "oklch(73.7% 0.021 106.9)",
    "500": "oklch(58% 0.031 107.3)",
    "600": "oklch(46.6% 0.025 107.3)",
    "700": "oklch(39.4% 0.023 107.4)",
    "800": "oklch(28.6% 0.016 107.4)",
    "900": "oklch(22.8% 0.013 107.4)",
    "950": "oklch(15.3% 0.006 107.1)",
  },
  mist: {
    "50": "oklch(98.7% 0.002 197.1)",
    "100": "oklch(96.3% 0.002 197.1)",
    "200": "oklch(92.5% 0.005 214.3)",
    "300": "oklch(87.2% 0.007 219.6)",
    "400": "oklch(72.3% 0.014 214.4)",
    "500": "oklch(56% 0.021 213.5)",
    "600": "oklch(45% 0.017 213.2)",
    "700": "oklch(37.8% 0.015 216)",
    "800": "oklch(27.5% 0.011 216.9)",
    "900": "oklch(21.8% 0.008 223.9)",
    "950": "oklch(14.8% 0.004 228.8)",
  },
  taupe: {
    "50": "oklch(98.6% 0.002 67.8)",
    "100": "oklch(96% 0.002 17.2)",
    "200": "oklch(92.2% 0.005 34.3)",
    "300": "oklch(86.8% 0.007 39.5)",
    "400": "oklch(71.4% 0.014 41.2)",
    "500": "oklch(54.7% 0.021 43.1)",
    "600": "oklch(43.8% 0.017 39.3)",
    "700": "oklch(36.7% 0.016 35.7)",
    "800": "oklch(26.8% 0.011 36.5)",
    "900": "oklch(21.4% 0.009 43.1)",
    "950": "oklch(14.7% 0.004 49.3)",
  },
} satisfies Record<string, Scale>;

const PRIMARY_SCALES = {
  emerald: {
    "50": "oklch(97.9% 0.021 166.113)",
    "100": "oklch(95% 0.052 163.051)",
    "200": "oklch(90.5% 0.093 164.15)",
    "300": "oklch(84.5% 0.143 164.978)",
    "400": "oklch(76.5% 0.177 163.223)",
    "500": "oklch(69.6% 0.17 162.48)",
    "600": "oklch(59.6% 0.145 163.225)",
    "700": "oklch(50.8% 0.118 165.612)",
    "800": "oklch(43.2% 0.095 166.913)",
    "900": "oklch(37.8% 0.077 168.94)",
    "950": "oklch(26.2% 0.051 172.552)",
  },
  blue: {
    "50": "oklch(97% 0.014 254.604)",
    "100": "oklch(93.2% 0.032 255.585)",
    "200": "oklch(88.2% 0.059 254.128)",
    "300": "oklch(80.9% 0.105 251.813)",
    "400": "oklch(70.7% 0.165 254.624)",
    "500": "oklch(62.3% 0.214 259.815)",
    "600": "oklch(54.6% 0.245 262.881)",
    "700": "oklch(48.8% 0.243 264.376)",
    "800": "oklch(42.4% 0.199 265.638)",
    "900": "oklch(37.9% 0.146 265.522)",
    "950": "oklch(28.2% 0.091 267.935)",
  },
  violet: {
    "50": "oklch(96.9% 0.016 293.756)",
    "100": "oklch(94.3% 0.029 294.588)",
    "200": "oklch(89.4% 0.057 293.283)",
    "300": "oklch(81.1% 0.111 293.571)",
    "400": "oklch(70.2% 0.183 293.541)",
    "500": "oklch(60.6% 0.25 292.717)",
    "600": "oklch(54.1% 0.281 293.009)",
    "700": "oklch(49.1% 0.27 292.581)",
    "800": "oklch(43.2% 0.232 292.759)",
    "900": "oklch(38% 0.189 293.745)",
    "950": "oklch(28.3% 0.141 291.089)",
  },
  rose: {
    "50": "oklch(96.9% 0.015 12.422)",
    "100": "oklch(94.1% 0.03 12.58)",
    "200": "oklch(89.2% 0.058 10.001)",
    "300": "oklch(81% 0.117 11.638)",
    "400": "oklch(71.2% 0.194 13.428)",
    "500": "oklch(64.5% 0.246 16.439)",
    "600": "oklch(58.6% 0.253 17.585)",
    "700": "oklch(51.4% 0.222 16.935)",
    "800": "oklch(45.5% 0.188 13.697)",
    "900": "oklch(41% 0.159 10.272)",
    "950": "oklch(27.1% 0.105 12.094)",
  },
  orange: {
    "50": "oklch(98% 0.016 73.684)",
    "100": "oklch(95.4% 0.038 75.164)",
    "200": "oklch(90.1% 0.076 70.697)",
    "300": "oklch(83.7% 0.128 66.29)",
    "400": "oklch(75% 0.183 55.934)",
    "500": "oklch(70.5% 0.213 47.604)",
    "600": "oklch(64.6% 0.222 41.116)",
    "700": "oklch(55.3% 0.195 38.402)",
    "800": "oklch(47% 0.157 37.304)",
    "900": "oklch(40.8% 0.123 38.172)",
    "950": "oklch(26.6% 0.079 36.259)",
  },
  red: {
    "50": "oklch(97.1% 0.013 17.38)",
    "100": "oklch(93.6% 0.032 17.717)",
    "200": "oklch(88.5% 0.062 18.334)",
    "300": "oklch(80.8% 0.114 19.571)",
    "400": "oklch(70.4% 0.191 22.216)",
    "500": "oklch(63.7% 0.237 25.331)",
    "600": "oklch(57.7% 0.245 27.325)",
    "700": "oklch(50.5% 0.213 27.518)",
    "800": "oklch(44.4% 0.177 26.899)",
    "900": "oklch(39.6% 0.141 25.723)",
    "950": "oklch(25.8% 0.092 26.042)",
  },
  yellow: {
    "50": "oklch(98.7% 0.026 102.212)",
    "100": "oklch(97.3% 0.071 103.193)",
    "200": "oklch(94.5% 0.129 101.54)",
    "300": "oklch(90.5% 0.182 98.111)",
    "400": "oklch(85.2% 0.199 91.936)",
    "500": "oklch(79.5% 0.184 86.047)",
    "600": "oklch(68.1% 0.162 75.834)",
    "700": "oklch(55.4% 0.135 66.442)",
    "800": "oklch(47.6% 0.114 61.907)",
    "900": "oklch(42.1% 0.095 57.708)",
    "950": "oklch(28.6% 0.066 53.813)",
  },
  teal: {
    "50": "oklch(98.4% 0.014 180.72)",
    "100": "oklch(95.3% 0.051 180.801)",
    "200": "oklch(91% 0.096 180.426)",
    "300": "oklch(85.5% 0.138 181.071)",
    "400": "oklch(77.7% 0.152 181.912)",
    "500": "oklch(70.4% 0.14 182.503)",
    "600": "oklch(60% 0.118 184.704)",
    "700": "oklch(51.1% 0.096 186.391)",
    "800": "oklch(43.7% 0.078 188.216)",
    "900": "oklch(38.6% 0.063 188.416)",
    "950": "oklch(27.7% 0.046 192.524)",
  },
} satisfies Record<string, Scale>;

export const SHADOW_PRESETS = {
  none: {
    "2xs": "0 0 #0000",
    xs: "0 0 #0000",
    sm: "0 0 #0000",
    md: "0 0 #0000",
    lg: "0 0 #0000",
    xl: "0 0 #0000",
    "2xl": "0 0 #0000",
    DEFAULT: "0 0 #0000",
    inner: "0 0 #0000",
  },
  soft: {
    "2xs": "0 1px rgb(0 0 0 / 0.03)",
    xs: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
    sm: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.06)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.06), 0 8px 10px -6px rgb(0 0 0 / 0.06)",
    "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.15)",
    DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
    inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.03)",
  },
  default: {
    "2xs": "0 1px rgb(0 0 0 / 0.05)",
    xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
    DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
  },
  strong: {
    "2xs": "0 1px rgb(0 0 0 / 0.08)",
    xs: "0 1px 2px 0 rgb(0 0 0 / 0.1)",
    sm: "0 1px 3px 0 rgb(0 0 0 / 0.18), 0 1px 2px -1px rgb(0 0 0 / 0.18)",
    md: "0 4px 8px -1px rgb(0 0 0 / 0.2), 0 2px 4px -2px rgb(0 0 0 / 0.2)",
    lg: "0 10px 18px -3px rgb(0 0 0 / 0.22), 0 4px 6px -4px rgb(0 0 0 / 0.22)",
    xl: "0 20px 30px -5px rgb(0 0 0 / 0.25), 0 8px 10px -6px rgb(0 0 0 / 0.25)",
    "2xl": "0 25px 55px -12px rgb(0 0 0 / 0.4)",
    DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.18), 0 1px 2px -1px rgb(0 0 0 / 0.18)",
    inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.1)",
  },
} as const;

export const BASE_COLORS = Object.keys(BASE_SCALES) as BaseColor[];
export const PRIMARY_COLORS = Object.keys(PRIMARY_SCALES) as PrimaryColor[];

export type BaseColor = keyof typeof BASE_SCALES;
export type PrimaryColor = keyof typeof PRIMARY_SCALES;
export type RadiusPreset = keyof typeof RADIUS_PRESETS;
export type ShadowPreset = keyof typeof SHADOW_PRESETS;

export const RADIUS_PRESETS = {
  none: "0rem",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  default: "0.875rem",
  xl: "1rem",
} as const;

export type ThemeCustomization = {
  baseColor: BaseColor;
  primaryColor: PrimaryColor;
  radius: RadiusPreset;
  shadow: ShadowPreset;
};

export const DEFAULT_THEME_CUSTOMIZATION: ThemeCustomization = {
  baseColor: "neutral",
  primaryColor: "emerald",
  radius: "default",
  shadow: "default",
};

export const THEME_CUSTOMIZATION_STORAGE_KEY = "hucky-theme-customization";

export function getBasePreview(color: BaseColor): string {
  return BASE_SCALES[color]["400"];
}

export function getPrimaryPreview(color: PrimaryColor): string {
  return PRIMARY_SCALES[color]["600"];
}

const DARK_BORDER = "color-mix(in oklch, var(--base-400) 28%, transparent)";
const DARK_INPUT = "color-mix(in oklch, var(--base-400) 34%, transparent)";

export function getThemeVariables(
  customization: ThemeCustomization,
  mode: "light" | "dark",
): Record<string, string> {
  const base = BASE_SCALES[customization.baseColor];
  const primary = PRIMARY_SCALES[customization.primaryColor];
  const isLight = mode === "light";
  const primaryMain = isLight ? primary["700"] : primary["600"];
  const primaryForeground =
    customization.primaryColor === "yellow" ? primary["950"] : primary["50"];

  const variables: Record<string, string> = {
    "--base-400": base["400"],
    "--background": isLight ? "oklch(1 0 0)" : base["950"],
    "--foreground": isLight ? base["950"] : base["50"],
    "--card": isLight ? "oklch(1 0 0)" : base["900"],
    "--card-foreground": isLight ? base["950"] : base["50"],
    "--popover": isLight ? "oklch(1 0 0)" : base["900"],
    "--popover-foreground": isLight ? base["950"] : base["50"],
    "--primary": primaryMain,
    "--primary-foreground": primaryForeground,
    "--secondary": isLight ? base["100"] : base["800"],
    "--secondary-foreground": isLight ? base["900"] : base["50"],
    "--muted": isLight ? base["100"] : base["800"],
    "--muted-foreground": isLight ? base["500"] : base["400"],
    "--accent": isLight ? base["100"] : base["800"],
    "--accent-foreground": isLight ? base["900"] : base["50"],
    "--destructive": isLight
      ? "oklch(0.577 0.245 27.325)"
      : "oklch(0.704 0.191 22.216)",
    "--border": isLight ? base["200"] : DARK_BORDER,
    "--input": isLight ? base["200"] : DARK_INPUT,
    "--ring": isLight ? base["400"] : base["500"],
    "--chart-1": isLight ? primary["400"] : primary["300"],
    "--chart-2": isLight ? primary["500"] : primary["400"],
    "--chart-3": isLight ? primary["600"] : primary["500"],
    "--chart-4": isLight ? primary["700"] : primary["600"],
    "--chart-5": isLight ? primary["800"] : primary["700"],
    "--sidebar": isLight ? base["50"] : base["900"],
    "--sidebar-foreground": isLight ? base["950"] : base["50"],
    "--sidebar-primary": primaryMain,
    "--sidebar-primary-foreground": primaryForeground,
    "--sidebar-accent": isLight ? base["100"] : base["800"],
    "--sidebar-accent-foreground": isLight ? base["900"] : base["50"],
    "--sidebar-border": isLight ? base["200"] : DARK_BORDER,
    "--sidebar-ring": isLight ? base["400"] : base["500"],
    "--color-fd-background": isLight ? "oklch(1 0 0)" : base["950"],
    "--color-fd-foreground": isLight ? base["950"] : base["50"],
    "--color-fd-card": isLight ? "oklch(1 0 0)" : base["900"],
    "--color-fd-card-foreground": isLight ? base["950"] : base["50"],
    "--color-fd-popover": isLight ? "oklch(1 0 0)" : base["900"],
    "--color-fd-popover-foreground": isLight ? base["950"] : base["50"],
    "--color-fd-primary": primaryMain,
    "--color-fd-primary-foreground": primaryForeground,
    "--color-fd-secondary": isLight ? base["100"] : base["800"],
    "--color-fd-secondary-foreground": isLight ? base["900"] : base["50"],
    "--color-fd-muted": isLight ? base["100"] : base["800"],
    "--color-fd-muted-foreground": isLight ? base["500"] : base["400"],
    "--color-fd-accent": isLight ? base["100"] : base["800"],
    "--color-fd-accent-foreground": isLight ? base["900"] : base["50"],
    "--color-fd-border": isLight ? base["200"] : DARK_BORDER,
    "--color-fd-ring": isLight ? base["400"] : base["500"],
    "--color-fd-overlay": "oklch(0 0 0 / 0.5)",
    "--radius": RADIUS_PRESETS[customization.radius],
  };

  const shadow = SHADOW_PRESETS[customization.shadow];
  for (const key of Object.keys(shadow)) {
    variables[`--app-shadow-${key}`] = shadow[key as keyof typeof shadow];
  }

  return variables;
}
