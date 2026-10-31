"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import type * as THREE from "three";

export type InteractionEntry = {
  id: string;
  object: THREE.Object3D;
  label: string;
  hint: string;
  onInteract: () => void;
};

export type HoverInfo = {
  id: string;
  label: string;
  hint: string;
} | null;

type InteractionContextValue = {
  register: (entry: InteractionEntry) => () => void;
  hoveredId: string | null;
};

const InteractionContext = createContext<InteractionContextValue | null>(null);

export const InteractionProvider = InteractionContext.Provider;

export function useInteraction() {
  const context = useContext(InteractionContext);
  if (!context) {
    throw new Error("useInteraction must be used within InteractionProvider");
  }
  return context;
}

export function Interactable({
  id,
  label,
  hint,
  onInteract,
  position,
  rotation,
  children,
}: {
  id: string;
  label: string;
  hint: string;
  onInteract: () => void;
  position?: [number, number, number];
  rotation?: [number, number, number];
  children: ReactNode | ((hovering: boolean) => ReactNode);
}) {
  const ref = useRef<THREE.Group>(null);
  const { register, hoveredId } = useInteraction();
  const hovering = hoveredId === id;

  useEffect(() => {
    const object = ref.current;
    if (!object) return;

    return register({ id, object, label, hint, onInteract });
  }, [id, label, hint, onInteract, register]);

  return (
    <group
      ref={ref}
      position={position}
      rotation={rotation}
      userData={{ interactionId: id }}
    >
      {typeof children === "function" ? children(hovering) : children}
    </group>
  );
}

export function useInteractionRegistry() {
  const registry = useRef(new Map<string, InteractionEntry>());

  const register = useCallback((entry: InteractionEntry) => {
    registry.current.set(entry.id, entry);
    return () => {
      registry.current.delete(entry.id);
    };
  }, []);

  return { registry, register };
}
