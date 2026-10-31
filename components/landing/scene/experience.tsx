"use client";

import { ContactShadows } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Door } from "@/components/landing/scene/door";
import {
  type HoverInfo,
  Interactable,
  InteractionProvider,
  useInteractionRegistry,
} from "@/components/landing/scene/interaction";
import { INTERACT_DISTANCE } from "@/components/landing/scene/layout";
import { LoginButton } from "@/components/landing/scene/login-button";
import { getScenePalette } from "@/components/landing/scene/palette";
import { Player } from "@/components/landing/scene/player";
import { Room } from "@/components/landing/scene/room";
import { Terminal } from "@/components/landing/scene/terminal";
import type { LandingControls } from "@/components/landing/types";

export type ExperienceProps = {
  isDark: boolean;
  enabled: boolean;
  doorOpen: boolean;
  onHover: (hover: HoverInfo) => void;
  onOpenPanel: () => void;
  onLogin: () => void;
  onEnterDoor: () => void;
  onLock: () => void;
  onUnlock: () => void;
  onLockError: () => void;
  onControls: (controls: LandingControls | null) => void;
  onReady: () => void;
};

export function Experience({
  isDark,
  enabled,
  doorOpen,
  onHover,
  onOpenPanel,
  onLogin,
  onEnterDoor,
  onLock,
  onUnlock,
  onLockError,
  onControls,
  onReady,
}: ExperienceProps) {
  const t = useTranslations("Landing");
  const palette = useMemo(() => getScenePalette(isDark), [isDark]);
  const { registry, register } = useInteractionRegistry();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const enabledRef = useRef(enabled);
  const readyRef = useRef(false);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const screenCenter = useMemo(() => new THREE.Vector2(0, 0), []);

  const emitHover = useCallback(
    (id: string | null) => {
      hoveredRef.current = id;
      setHoveredId(id);

      const entry = id ? registry.current.get(id) : null;
      onHover(
        entry ? { id: entry.id, label: entry.label, hint: entry.hint } : null,
      );
    },
    [onHover, registry],
  );

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled && hoveredRef.current !== null) {
      emitHover(null);
    }
  }, [emitHover, enabled]);

  const triggerHovered = useCallback(() => {
    if (!enabledRef.current) return;

    const id = hoveredRef.current;
    if (!id) return;

    registry.current.get(id)?.onInteract();
  }, [registry]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "KeyE" || event.repeat) return;
      triggerHovered();
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      triggerHovered();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onMouseDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [triggerHovered]);

  useFrame(({ camera }) => {
    if (!readyRef.current) {
      readyRef.current = true;
      onReady();
    }

    if (!enabledRef.current) return;

    raycaster.setFromCamera(screenCenter, camera);

    const objects = Array.from(
      registry.current.values(),
      (entry) => entry.object,
    );

    if (objects.length === 0) {
      if (hoveredRef.current !== null) emitHover(null);
      return;
    }

    const hits = raycaster.intersectObjects(objects, true);
    let next: string | null = null;

    for (const hit of hits) {
      if (hit.distance > INTERACT_DISTANCE) break;

      let node: THREE.Object3D | null = hit.object;
      while (node) {
        const id = node.userData.interactionId;
        if (typeof id === "string" && registry.current.has(id)) {
          next = id;
          break;
        }
        node = node.parent;
      }

      if (next) break;
    }

    if (next !== hoveredRef.current) {
      emitHover(next);
    }
  });

  const interactionValue = useMemo(
    () => ({ register, hoveredId }),
    [hoveredId, register],
  );

  return (
    <InteractionProvider value={interactionValue}>
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.background, 13, 34]} />

      <ambientLight intensity={isDark ? 0.55 : 1.1} />
      <hemisphereLight
        args={[palette.wall, palette.floor, isDark ? 0.5 : 0.6]}
      />
      <directionalLight
        position={[4, 8, 6]}
        intensity={isDark ? 1.3 : 1.5}
        color={palette.glow}
      />
      <pointLight
        position={[0, 3.5, -7.5]}
        intensity={isDark ? 7 : 3}
        distance={12}
        color={palette.glow}
      />

      <Room palette={palette} />

      <Player
        active={enabled}
        onLock={onLock}
        onUnlock={onUnlock}
        onLockError={onLockError}
        onControls={onControls}
      />

      <ContactShadows
        position={[0, 0.01, 0]}
        scale={24}
        blur={2.4}
        far={4.5}
        opacity={isDark ? 0.55 : 0.26}
        resolution={512}
        frames={1}
        color="#000000"
      />

      <Interactable
        id="terminal"
        label={t("terminalName")}
        hint={t("terminalHint")}
        onInteract={onOpenPanel}
        position={[-3.2, 0, 1.2]}
        rotation={[0, 0.32, 0]}
      >
        {(hovering) => <Terminal palette={palette} hovering={hovering} />}
      </Interactable>

      <Interactable
        id="login"
        label={t("loginName")}
        hint={t("loginHint")}
        onInteract={onLogin}
        position={[3.2, 0, 1.2]}
        rotation={[0, -0.32, 0]}
      >
        {(hovering) => <LoginButton palette={palette} hovering={hovering} />}
      </Interactable>

      <Interactable
        id="door"
        label={t("doorName")}
        hint={t("doorHint")}
        onInteract={onEnterDoor}
        position={[0, 0, -10.15]}
      >
        {(hovering) => (
          <Door palette={palette} hovering={hovering} open={doorOpen} />
        )}
      </Interactable>
    </InteractionProvider>
  );
}
