import manifest from "../generated/shots.json";

export type ShotMeta = { file: string; width: number; height: number };

export const shots = manifest as Record<string, ShotMeta>;

export const hasShot = (key: string): boolean => Boolean(shots[key]);

export const shotSrc = (key: string): string | null =>
  shots[key] ? `screenshots/${shots[key].file}` : null;
