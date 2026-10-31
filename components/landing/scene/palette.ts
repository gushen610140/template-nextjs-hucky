export type ScenePalette = {
  background: string;
  floor: string;
  wall: string;
  ceiling: string;
  line: string;
  surface: string;
  accent: string;
  accentSoft: string;
  screen: string;
  glow: string;
};

export function getScenePalette(isDark: boolean): ScenePalette {
  if (isDark) {
    return {
      background: "#080808",
      floor: "#0d0d0d",
      wall: "#141414",
      ceiling: "#101010",
      line: "#242424",
      surface: "#1d1d1d",
      accent: "#f2f2ee",
      accentSoft: "#6f6f6a",
      screen: "#050505",
      glow: "#ffffff",
    };
  }

  return {
    background: "#f2f2ef",
    floor: "#e9e9e5",
    wall: "#fbfbf8",
    ceiling: "#f7f7f4",
    line: "#d4d4ce",
    surface: "#ffffff",
    accent: "#141414",
    accentSoft: "#8c8c86",
    screen: "#101010",
    glow: "#ffffff",
  };
}
