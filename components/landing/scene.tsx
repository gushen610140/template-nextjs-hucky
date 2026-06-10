"use client";

import { Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { LuckyText } from "./lucky-text";

export function Scene() {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5], fov: 75 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <directionalLight position={[-3, 2, -5]} intensity={0.4} />
          <pointLight position={[0, -3, 2]} intensity={0.5} color="#22c55e" />

          {/* Environment for reflections */}
          <Environment preset="city" />

          {/* 3D Text */}
          <LuckyText />
        </Suspense>
      </Canvas>
    </div>
  );
}
