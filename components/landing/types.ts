export type LandingMode = "intro" | "explore" | "paused" | "panel" | "leaving";

export type LandingControls = {
  lock: () => void;
  unlock: () => void;
};
