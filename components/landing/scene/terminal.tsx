"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { ScenePalette } from "@/components/landing/scene/palette";

const SCREEN_LINES = [
  { y: 0.21, width: 0.92, opacity: 0.8 },
  { y: 0.05, width: 0.64, opacity: 0.45 },
  { y: -0.11, width: 0.78, opacity: 0.3 },
];

export function Terminal({
  palette,
  hovering,
}: {
  palette: ScenePalette;
  hovering: boolean;
}) {
  const screenMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const indicatorMaterial = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.05);

    if (screenMaterial.current) {
      screenMaterial.current.emissiveIntensity = THREE.MathUtils.damp(
        screenMaterial.current.emissiveIntensity,
        hovering ? 0.62 : 0.08,
        9,
        step,
      );
    }

    if (indicatorMaterial.current) {
      indicatorMaterial.current.emissiveIntensity = THREE.MathUtils.damp(
        indicatorMaterial.current.emissiveIntensity,
        hovering ? 1.6 : 0.35,
        9,
        step,
      );
    }
  });

  return (
    <group>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.5, 1.1, 0.62]} />
        <meshStandardMaterial color={palette.surface} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <boxGeometry args={[1.56, 0.035, 0.68]} />
        <meshStandardMaterial color={palette.accent} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.21, 0]}>
        <boxGeometry args={[0.26, 0.18, 0.22]} />
        <meshStandardMaterial color={palette.accent} roughness={0.5} />
      </mesh>

      <group position={[0, 1.64, 0]} rotation-x={-0.14}>
        <mesh>
          <boxGeometry args={[1.54, 0.94, 0.08]} />
          <meshStandardMaterial color={palette.accent} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0, 0.046]}>
          <planeGeometry args={[1.4, 0.8]} />
          <meshStandardMaterial
            ref={screenMaterial}
            color={palette.screen}
            emissive={palette.glow}
            emissiveIntensity={0.08}
            roughness={0.85}
          />
        </mesh>

        <group position={[0, 0, 0.055]}>
          {SCREEN_LINES.map((line) => (
            <mesh key={line.y} position={[-0.7 + line.width / 2, line.y, 0]}>
              <planeGeometry args={[line.width, 0.014]} />
              <meshBasicMaterial
                color={palette.glow}
                opacity={line.opacity}
                transparent
                toneMapped={false}
              />
            </mesh>
          ))}
          <mesh position={[0.62, 0.3, 0]}>
            <circleGeometry args={[0.018, 24]} />
            <meshBasicMaterial color={palette.glow} toneMapped={false} />
          </mesh>
        </group>
      </group>

      <mesh position={[0.58, 0.62, 0.315]}>
        <circleGeometry args={[0.035, 32]} />
        <meshStandardMaterial
          ref={indicatorMaterial}
          color={palette.accent}
          emissive={palette.glow}
          emissiveIntensity={0.35}
          roughness={0.4}
        />
      </mesh>

      <mesh position={[-0.5, 1.135, 0.18]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.34, 0.16]} />
        <meshStandardMaterial color={palette.line} roughness={0.9} />
      </mesh>
    </group>
  );
}
