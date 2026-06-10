"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { animState } from "./animation-store";
import { HeroSection } from "./sections/hero-section";
import { FeaturesSection } from "./sections/features-section";
import { StorySection } from "./sections/story-section";
import { TechSection } from "./sections/tech-section";
import { CtaSection } from "./sections/cta-section";

gsap.registerPlugin(ScrollTrigger);

export function ScrollOverlay() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
      });

      /* ──────────────────────────────────────────
         Section 1 (0.00 → 0.20) — 登场: Text flies in
      ────────────────────────────────────────── */
      tl.to(animState, {
        posZ: 0,
        rotY: 0.05,
        scale: 1,
        duration: 0.2,
        ease: "power2.out",
      }, 0);

      // Hero HTML
      tl.to(".hero-subtitle", { opacity: 1, y: 0, duration: 0.05 }, 0.08);
      tl.to(".hero-arrow", { opacity: 1, duration: 0.04 }, 0.12);
      // Fade out hero before next section
      tl.to(".hero-subtitle", { opacity: 0, duration: 0.03 }, 0.16);
      tl.to(".hero-arrow", { opacity: 0, duration: 0.03 }, 0.16);

      /* ──────────────────────────────────────────
         Section 2 (0.20 → 0.40) — 定位: Text moves left, scales down
      ────────────────────────────────────────── */
      tl.to(animState, {
        posX: -2,
        scale: 0.6,
        rotY: 0.5,
        duration: 0.2,
        ease: "power1.inOut",
      }, 0.2);

      // Feature cards stagger in
      tl.to(".feature-card-0", {
        opacity: 1, y: 0, duration: 0.04, ease: "power2.out",
      }, 0.22);
      tl.to(".feature-card-1", {
        opacity: 1, y: 0, duration: 0.04, ease: "power2.out",
      }, 0.26);
      tl.to(".feature-card-2", {
        opacity: 1, y: 0, duration: 0.04, ease: "power2.out",
      }, 0.30);
      // Fade out
      tl.to(".feature-card", { opacity: 0, y: -20, duration: 0.03 }, 0.37);

      /* ──────────────────────────────────────────
         Section 3 (0.40 → 0.60) — 变形: Color silver → green, glow
      ────────────────────────────────────────── */
      tl.to(animState, {
        colorR: 0.13,
        colorG: 0.77,
        colorB: 0.37,
        metalness: 0.6,
        roughness: 0.15,
        emissiveIntensity: 0.4,
        posX: -1.5,
        rotY: 0.3,
        duration: 0.2,
        ease: "power1.inOut",
      }, 0.4);

      // Story HTML
      tl.to(".story-title", { opacity: 1, y: 0, duration: 0.05 }, 0.42);
      tl.to(".story-desc", { opacity: 1, y: 0, duration: 0.05 }, 0.46);
      tl.to(".story-divider", { opacity: 1, width: 96, duration: 0.04 }, 0.50);
      // Fade out
      tl.to(".story-title", { opacity: 0, duration: 0.03 }, 0.56);
      tl.to(".story-desc", { opacity: 0, duration: 0.03 }, 0.56);
      tl.to(".story-divider", { opacity: 0, duration: 0.03 }, 0.56);

      /* ──────────────────────────────────────────
         Section 4 (0.60 → 0.80) — 解构: Letters scatter
      ────────────────────────────────────────── */
      tl.to(animState, {
        spread: 1.2,
        l0Rot: 0.4, l0OffY: 0.6,
        l1Rot: -0.5, l1OffY: -0.4,
        l2Rot: 0.3, l2OffY: 0.7,
        l3Rot: -0.6, l3OffY: -0.5,
        l4Rot: 0.5, l4OffY: 0.3,
        posX: 0,
        rotY: 0,
        scale: 0.8,
        duration: 0.2,
        ease: "power2.inOut",
      }, 0.6);

      // Tech HTML
      tl.to(".tech-title", { opacity: 1, y: 0, duration: 0.04 }, 0.62);
      tl.to(".tech-tag-0", { opacity: 1, duration: 0.02 }, 0.64);
      tl.to(".tech-tag-1", { opacity: 1, duration: 0.02 }, 0.66);
      tl.to(".tech-tag-2", { opacity: 1, duration: 0.02 }, 0.68);
      tl.to(".tech-tag-3", { opacity: 1, duration: 0.02 }, 0.70);
      tl.to(".tech-tag-4", { opacity: 1, duration: 0.02 }, 0.72);
      tl.to(".tech-tag-5", { opacity: 1, duration: 0.02 }, 0.73);
      tl.to(".tech-tag-6", { opacity: 1, duration: 0.02 }, 0.74);
      tl.to(".tech-tag-7", { opacity: 1, duration: 0.02 }, 0.75);
      // Fade out
      tl.to(".tech-title", { opacity: 0, duration: 0.03 }, 0.77);
      tl.to(".tech-tag", { opacity: 0, duration: 0.03 }, 0.77);

      /* ──────────────────────────────────────────
         Section 5 (0.80 → 1.00) — 收束 CTA: Reassemble + fade
      ────────────────────────────────────────── */
      tl.to(animState, {
        spread: 0,
        l0Rot: 0, l0OffY: 0,
        l1Rot: 0, l1OffY: 0,
        l2Rot: 0, l2OffY: 0,
        l3Rot: 0, l3OffY: 0,
        l4Rot: 0, l4OffY: 0,
        posX: 0,
        posZ: -3,
        scale: 0.7,
        opacity: 0.15,
        colorR: 0.85,
        colorG: 0.85,
        colorB: 0.85,
        emissiveIntensity: 0,
        metalness: 0.9,
        roughness: 0.1,
        duration: 0.2,
        ease: "power1.inOut",
      }, 0.8);

      // CTA HTML
      tl.to(".cta-title", { opacity: 1, y: 0, duration: 0.05 }, 0.84);
      tl.to(".cta-desc", { opacity: 1, y: 0, duration: 0.05 }, 0.87);
      tl.to(".cta-button", { opacity: 1, y: 0, duration: 0.05 }, 0.90);
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative z-10">
      <HeroSection />
      <FeaturesSection />
      <StorySection />
      <TechSection />
      <CtaSection />
    </div>
  );
}
