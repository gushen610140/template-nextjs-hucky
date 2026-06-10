"use client";

import { useRef, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import { Text3D, Center } from "@react-three/drei";
import * as THREE from "three";
import { animState } from "./animation-store";

const LETTERS = ["H", "u", "c", "k", "y"];
// Approximate x positions for each letter to form "Hucky" (will be centered)
const BASE_X = [-1.85, -0.65, 0.2, 1.0, 1.85];

const FONT_URL =
  "https://threejs.org/examples/fonts/helvetiker_bold.typeface.json";

function LetterMesh({
  letter,
  baseX,
  index,
}: {
  letter: string;
  baseX: number;
  index: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    if (!meshRef.current || !materialRef.current) return;

    // Apply spread + per-letter scatter
    const spreadX = baseX * (1 + animState.spread * 1.5);
    const rotKey = `l${index}Rot` as keyof typeof animState;
    const offYKey = `l${index}OffY` as keyof typeof animState;

    meshRef.current.position.x = spreadX;
    meshRef.current.position.y = animState[offYKey] as number;
    meshRef.current.rotation.z = animState[rotKey] as number;

    const mat = materialRef.current;
    mat.color.setRGB(animState.colorR, animState.colorG, animState.colorB);
    mat.metalness = animState.metalness;
    mat.roughness = animState.roughness;
    mat.emissiveIntensity = animState.emissiveIntensity;
    mat.opacity = animState.opacity;
  });

  return (
    <Text3D
      ref={meshRef}
      font={FONT_URL}
      size={1.5}
      height={0.4}
      bevelEnabled
      bevelSize={0.05}
      bevelThickness={0.05}
      curveSegments={12}
      position={[baseX, 0, 0]}
    >
      {letter}
      <meshStandardMaterial
        ref={materialRef}
        color={new THREE.Color(0.85, 0.85, 0.85)}
        metalness={0.9}
        roughness={0.1}
        emissive={new THREE.Color(0.1, 0.8, 0.5)}
        emissiveIntensity={0}
        transparent
        opacity={1}
      />
    </Text3D>
  );
}

export function LuckyText() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;

    groupRef.current.position.set(
      animState.posX,
      animState.posY,
      animState.posZ,
    );
    groupRef.current.rotation.set(animState.rotX, animState.rotY, 0);
    groupRef.current.scale.setScalar(animState.scale);
  });

  return (
    <Center>
      <group ref={groupRef}>
        <Suspense fallback={null}>
          {LETTERS.map((letter, i) => (
            <LetterMesh
              key={letter}
              letter={letter}
              baseX={BASE_X[i]}
              index={i}
            />
          ))}
        </Suspense>
      </group>
    </Center>
  );
}
