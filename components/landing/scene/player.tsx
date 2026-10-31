"use client";

import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import {
  EYE_HEIGHT,
  PLAYER_RADIUS,
  SCENE_COLLIDERS,
  SPAWN,
  WALK_BOUNDS,
} from "@/components/landing/scene/layout";
import type { LandingControls } from "@/components/landing/types";

type Keys = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
};

const IDLE_KEYS: Keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
};

function isBlocked(x: number, z: number) {
  if (
    x < WALK_BOUNDS.minX + PLAYER_RADIUS ||
    x > WALK_BOUNDS.maxX - PLAYER_RADIUS ||
    z < WALK_BOUNDS.minZ + PLAYER_RADIUS ||
    z > WALK_BOUNDS.maxZ - PLAYER_RADIUS
  ) {
    return true;
  }

  return SCENE_COLLIDERS.some(
    (collider) =>
      x > collider.minX - PLAYER_RADIUS &&
      x < collider.maxX + PLAYER_RADIUS &&
      z > collider.minZ - PLAYER_RADIUS &&
      z < collider.maxZ + PLAYER_RADIUS,
  );
}

export function Player({
  active,
  onLock,
  onUnlock,
  onControls,
}: {
  active: boolean;
  onLock: () => void;
  onUnlock: () => void;
  onControls: (controls: LandingControls | null) => void;
}) {
  const { camera } = useThree();
  const keys = useRef<Keys>({ ...IDLE_KEYS });
  const velocity = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const wish = useRef(new THREE.Vector3());
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
    if (!active) {
      keys.current = { ...IDLE_KEYS };
    }
  }, [active]);

  useEffect(() => {
    const update = (code: string, pressed: boolean) => {
      switch (code) {
        case "KeyW":
        case "ArrowUp":
          keys.current.forward = pressed;
          return true;
        case "KeyS":
        case "ArrowDown":
          keys.current.backward = pressed;
          return true;
        case "KeyA":
        case "ArrowLeft":
          keys.current.left = pressed;
          return true;
        case "KeyD":
        case "ArrowRight":
          keys.current.right = pressed;
          return true;
        case "ShiftLeft":
        case "ShiftRight":
          keys.current.sprint = pressed;
          return true;
        default:
          return false;
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (update(event.code, true)) event.preventDefault();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (update(event.code, false)) event.preventDefault();
    };

    const onBlur = () => {
      keys.current = { ...IDLE_KEYS };
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    camera.position.set(...SPAWN);
    camera.rotation.set(0, 0, 0);
  }, [camera]);

  useFrame((_, delta) => {
    camera.position.y = EYE_HEIGHT;

    const step = Math.min(delta, 0.05);

    if (!activeRef.current) {
      velocity.current.multiplyScalar(Math.max(0, 1 - step * 12));
      return;
    }

    camera.getWorldDirection(forward.current);
    forward.current.y = 0;

    if (forward.current.lengthSq() < 1e-6) {
      return;
    }

    forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up).normalize();

    wish.current.set(0, 0, 0);
    if (keys.current.forward) wish.current.add(forward.current);
    if (keys.current.backward) wish.current.sub(forward.current);
    if (keys.current.right) wish.current.add(right.current);
    if (keys.current.left) wish.current.sub(right.current);

    if (wish.current.lengthSq() > 0) {
      wish.current.normalize().multiplyScalar(keys.current.sprint ? 5.2 : 2.9);
    }

    velocity.current.lerp(wish.current, 1 - Math.exp(-11 * step));

    const nextX = camera.position.x + velocity.current.x * step;
    if (isBlocked(nextX, camera.position.z)) {
      velocity.current.x = 0;
    } else {
      camera.position.x = nextX;
    }

    const nextZ = camera.position.z + velocity.current.z * step;
    if (isBlocked(camera.position.x, nextZ)) {
      velocity.current.z = 0;
    } else {
      camera.position.z = nextZ;
    }
  });

  const setRef = useCallback(
    (instance: { lock: () => void; unlock: () => void } | null) => {
      onControls(instance);
    },
    [onControls],
  );

  return (
    <PointerLockControls
      ref={setRef}
      makeDefault
      selector="#landing-surface"
      onLock={onLock}
      onUnlock={onUnlock}
    />
  );
}
