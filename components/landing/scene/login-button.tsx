"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { ScenePalette } from "@/components/landing/scene/palette";

export function LoginButton({
  palette,
  hovering,
}: {
  palette: ScenePalette;
  hovering: boolean;
}) {
  const buttonMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.05);

    if (buttonMaterial.current) {
      buttonMaterial.current.emissiveIntensity = THREE.MathUtils.damp(
        buttonMaterial.current.emissiveIntensity,
        hovering ? 1.1 : 0.12,
        9,
        step,
      );
    }

    if (ring.current) {
      const scale = THREE.MathUtils.damp(
        ring.current.scale.x,
        hovering ? 1.16 : 1,
        9,
        step,
      );
      ring.current.scale.setScalar(scale);
    }
  });

  return (
    <group>
      <mesh position={[0, 0.56, 0]}>
        <cylinderGeometry args={[0.36, 0.42, 1.12, 48]} />
        <meshStandardMaterial color={palette.surface} roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.06, 48]} />
        <meshStandardMaterial color={palette.accent} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.26, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.14, 48]} />
        <meshStandardMaterial
          ref={buttonMaterial}
          color={palette.accent}
          emissive={palette.glow}
          emissiveIntensity={0.12}
          roughness={0.35}
        />
      </mesh>
      <mesh ref={ring} position={[0, 1.2, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.31, 0.008, 8, 72]} />
        <meshBasicMaterial color={palette.accentSoft} />
      </mesh>
    </group>
  );
}
