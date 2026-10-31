"use client";

import { Canvas } from "@react-three/fiber";
import {
  Experience,
  type ExperienceProps,
} from "@/components/landing/scene/experience";
import { SPAWN } from "@/components/landing/scene/layout";

export default function SceneCanvas(props: ExperienceProps) {
  return (
    <Canvas
      flat
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{
        fov: 66,
        near: 0.1,
        far: 60,
        position: SPAWN,
      }}
    >
      <Experience {...props} />
    </Canvas>
  );
}
