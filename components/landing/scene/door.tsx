"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { ScenePalette } from "@/components/landing/scene/palette";

export function Door({
  palette,
  hovering,
  open,
}: {
  palette: ScenePalette;
  hovering: boolean;
  open: boolean;
}) {
  const pivot = useRef<THREE.Group>(null);
  const handleMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const seamMaterial = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.05);

    if (pivot.current) {
      pivot.current.rotation.y = THREE.MathUtils.damp(
        pivot.current.rotation.y,
        open ? -Math.PI / 2 : 0,
        4.2,
        step,
      );
    }

    if (handleMaterial.current) {
      handleMaterial.current.emissiveIntensity = THREE.MathUtils.damp(
        handleMaterial.current.emissiveIntensity,
        hovering ? 1.3 : 0.1,
        9,
        step,
      );
    }

    if (seamMaterial.current) {
      seamMaterial.current.emissiveIntensity = THREE.MathUtils.damp(
        seamMaterial.current.emissiveIntensity,
        hovering ? 2 : 0.2,
        9,
        step,
      );
    }
  });

  return (
    <group>
      <mesh position={[0, 2.2, -0.04]}>
        <planeGeometry args={[2.86, 4.36]} />
        <meshBasicMaterial color={palette.glow} toneMapped={false} />
      </mesh>

      <mesh position={[0, 4.5, 0]}>
        <boxGeometry args={[3.34, 0.1, 0.2]} />
        <meshStandardMaterial color={palette.accent} roughness={0.5} />
      </mesh>
      <mesh position={[-1.66, 2.22, 0]}>
        <boxGeometry args={[0.1, 4.56, 0.2]} />
        <meshStandardMaterial color={palette.accent} roughness={0.5} />
      </mesh>
      <mesh position={[1.66, 2.22, 0]}>
        <boxGeometry args={[0.1, 4.56, 0.2]} />
        <meshStandardMaterial color={palette.accent} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[3.34, 0.04, 0.22]} />
        <meshStandardMaterial color={palette.accent} roughness={0.5} />
      </mesh>

      <group ref={pivot} position={[-1.5, 0, 0]}>
        <mesh position={[1.5, 2.22, 0]}>
          <boxGeometry args={[2.86, 4.4, 0.08]} />
          <meshStandardMaterial color={palette.surface} roughness={0.7} />
        </mesh>
        <mesh position={[1.5, 2.22, 0.055]}>
          <boxGeometry args={[2.5, 3.94, 0.015]} />
          <meshStandardMaterial color={palette.wall} roughness={0.85} />
        </mesh>

        <mesh position={[2.58, 2.1, 0.09]}>
          <cylinderGeometry args={[0.028, 0.028, 0.52, 20]} />
          <meshStandardMaterial
            ref={handleMaterial}
            color={palette.accent}
            emissive={palette.glow}
            emissiveIntensity={0.1}
            roughness={0.35}
          />
        </mesh>
        <mesh position={[2.58, 2.34, 0.06]}>
          <boxGeometry args={[0.05, 0.03, 0.06]} />
          <meshStandardMaterial color={palette.accent} roughness={0.4} />
        </mesh>
        <mesh position={[2.58, 1.86, 0.06]}>
          <boxGeometry args={[0.05, 0.03, 0.06]} />
          <meshStandardMaterial color={palette.accent} roughness={0.4} />
        </mesh>

        <mesh position={[2.72, 2.22, 0.05]}>
          <boxGeometry args={[0.012, 3.5, 0.012]} />
          <meshStandardMaterial
            ref={seamMaterial}
            color={palette.accent}
            emissive={palette.glow}
            emissiveIntensity={0.2}
            roughness={0.4}
          />
        </mesh>
      </group>
    </group>
  );
}
