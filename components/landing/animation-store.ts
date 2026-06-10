/**
 * Shared animation state object.
 * GSAP ScrollTrigger mutates this; Three.js reads it in useFrame.
 * Flat structure for GSAP compatibility.
 */
export const animState = {
  // Group position / rotation / scale
  posX: 0,
  posY: 0,
  posZ: -20,
  rotX: 0,
  rotY: -0.3,
  scale: 0.5,

  // Material color (RGB, 0-1 range)
  colorR: 0.85,
  colorG: 0.85,
  colorB: 0.85,
  metalness: 0.9,
  roughness: 0.1,
  emissiveIntensity: 0,

  // Letter scatter
  spread: 0,
  l0Rot: 0, l0OffY: 0,
  l1Rot: 0, l1OffY: 0,
  l2Rot: 0, l2OffY: 0,
  l3Rot: 0, l3OffY: 0,
  l4Rot: 0, l4OffY: 0,

  // Global opacity
  opacity: 1,
};
