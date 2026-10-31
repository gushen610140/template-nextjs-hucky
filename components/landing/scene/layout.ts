export const EYE_HEIGHT = 1.65;

export const SPAWN: [number, number, number] = [0, EYE_HEIGHT, 6.4];

export const WALK_BOUNDS = {
  minX: -5.6,
  maxX: 5.6,
  minZ: -8.4,
  maxZ: 7.6,
};

export const PLAYER_RADIUS = 0.36;

export const INTERACT_DISTANCE = 3.6;

export type SceneCollider = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export const SCENE_COLLIDERS: SceneCollider[] = [
  // Settings terminal
  { minX: -4.3, maxX: -2.2, minZ: 0, maxZ: 2.3 },
  // Login pedestal
  { minX: 2.2, maxX: 4.3, minZ: 0, maxZ: 2.3 },
];

/** Room shell dimensions, shared by the geometry and the lighting setup. */
export const ROOM = {
  width: 13,
  depth: 22,
  height: 5,
  backZ: -10.5,
  frontZ: 11,
};
