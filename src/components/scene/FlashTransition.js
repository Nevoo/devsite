import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useCameraState } from "@/src/state/camera";
import { useShallow } from "zustand/react/shallow";

// Easing functions for smooth transitions
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutExpo = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

export default function FlashTransition() {
  const meshRef = useRef();
  const materialRef = useRef();
  const isFlashing = useRef(false);
  const flashIntensity = useRef(0);
  const startTime = useRef(0);
  const isGalleryPage = useRef(false);

  const { isAnimating } = useCameraState(
    useShallow((state) => ({
      isAnimating: state.isAnimating,
    }))
  );

  useEffect(() => {
    // Check if we're on the gallery page by looking at the URL
    isGalleryPage.current = window.location.pathname === '/gallery';

    if (isAnimating) {
      isFlashing.current = true;
      flashIntensity.current = 0;
      startTime.current = Date.now();
    } else if (isGalleryPage.current) {
      // We're on gallery page without isAnimating - this means we came from a transition
      // Start the flash at full white and fade out
      isFlashing.current = true;
      flashIntensity.current = 0.95;
      startTime.current = Date.now() - 600; // Simulate we started 600ms ago (when navigation happened)
    }
  }, [isAnimating]);

  useFrame(() => {
    if (!materialRef.current || !isFlashing.current) return;

    const elapsed = (Date.now() - startTime.current) / 1000; // Convert to seconds

    if (elapsed < 0.3) {
      // Smooth fade in over 300ms using easeInOutCubic
      const progress = elapsed / 0.3;
      const easedProgress = easeInOutCubic(progress);
      flashIntensity.current = easedProgress * 0.95; // Near full white
    } else if (elapsed < 1.2) {
      // Stay at full white until 1.2s (gallery has time to load)
      flashIntensity.current = 0.95;
    } else if (elapsed < 1.8) {
      // Smooth fade out over 600ms using easeOutExpo
      const fadeProgress = (elapsed - 1.2) / 0.6;
      const easedFade = easeOutExpo(fadeProgress);
      flashIntensity.current = 0.95 * (1 - easedFade);
    } else {
      // Finished
      isFlashing.current = false;
      flashIntensity.current = 0;
    }

    materialRef.current.opacity = flashIntensity.current;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -0.5]} frustumCulled={false}>
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#ffffff"
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
