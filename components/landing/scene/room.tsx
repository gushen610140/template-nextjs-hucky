"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { ROOM } from "@/components/landing/scene/layout";
import type { ScenePalette } from "@/components/landing/scene/palette";

function FloatingSphere({
  color,
  position,
}: {
  color: string;
  position: [number, number, number];
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y =
      position[1] + Math.sin(state.clock.elapsedTime * 0.6) * 0.12;
    ref.current.rotation.y = state.clock.elapsedTime * 0.15;
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.42, 48, 48]} />
      <meshStandardMaterial color={color} roughness={0.35} />
    </mesh>
  );
}

export function Room({ palette }: { palette: ScenePalette }) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color={palette.floor} roughness={1} />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, -1.5]}>
        <planeGeometry args={[1.6, 15]} />
        <meshStandardMaterial color={palette.line} roughness={1} />
      </mesh>

      <mesh position={[0, ROOM.height / 2, ROOM.backZ]}>
        <planeGeometry args={[ROOM.width, ROOM.height]} />
        <meshStandardMaterial color={palette.wall} roughness={1} />
      </mesh>

      <mesh
        rotation-y={Math.PI / 2}
        position={[-ROOM.width / 2, ROOM.height / 2, 0]}
      >
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshStandardMaterial color={palette.wall} roughness={1} />
      </mesh>

      <mesh
        rotation-y={-Math.PI / 2}
        position={[ROOM.width / 2, ROOM.height / 2, 0]}
      >
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshStandardMaterial color={palette.wall} roughness={1} />
      </mesh>

      <mesh rotation-x={Math.PI / 2} position={[0, ROOM.height, 0]}>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color={palette.ceiling} roughness={1} />
      </mesh>

      <mesh position={[0, ROOM.height - 0.02, 0]}>
        <boxGeometry args={[0.08, 0.02, 16]} />
        <meshBasicMaterial color={palette.accent} />
      </mesh>

      <mesh position={[0, 0.04, ROOM.backZ + 0.03]}>
        <boxGeometry args={[ROOM.width, 0.08, 0.03]} />
        <meshBasicMaterial color={palette.line} />
      </mesh>
      <mesh position={[-ROOM.width / 2 + 0.03, 0.04, 0]}>
        <boxGeometry args={[0.03, 0.08, ROOM.depth]} />
        <meshBasicMaterial color={palette.line} />
      </mesh>
      <mesh position={[ROOM.width / 2 - 0.03, 0.04, 0]}>
        <boxGeometry args={[0.03, 0.08, ROOM.depth]} />
        <meshBasicMaterial color={palette.line} />
      </mesh>

      <mesh position={[-4.6, 2.5, ROOM.backZ + 0.04]}>
        <boxGeometry args={[0.02, 4.6, 0.02]} />
        <meshBasicMaterial color={palette.line} />
      </mesh>
      <mesh position={[4.6, 2.5, ROOM.backZ + 0.04]}>
        <boxGeometry args={[0.02, 4.6, 0.02]} />
        <meshBasicMaterial color={palette.line} />
      </mesh>

      <mesh position={[5.9, 2.4, -4.4]}>
        <boxGeometry args={[0.08, 3.2, 1.5]} />
        <meshStandardMaterial color={palette.surface} roughness={0.8} />
      </mesh>

      <FloatingSphere color={palette.accent} position={[-4.7, 2.5, -5.4]} />
    </group>
  );
}
