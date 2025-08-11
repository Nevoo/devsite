import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useCameraState } from "@/src/state/camera";
import { useShallow } from "zustand/react/shallow";

export default function FlashTransition() {
  const meshRef = useRef();
  const materialRef = useRef();
  const isFlashing = useRef(false);
  const flashIntensity = useRef(0);
  const startTime = useRef(0);

  const { isAnimating } = useCameraState(
    useShallow((state) => ({
      isAnimating: state.isAnimating,
    }))
  );

  useEffect(() => {
    if (isAnimating) {
      isFlashing.current = true;
      flashIntensity.current = 0;
      startTime.current = Date.now();
    }
  }, [isAnimating]);

  useFrame(() => {
    if (!materialRef.current || !isFlashing.current) return;

    const elapsed = (Date.now() - startTime.current) / 1000; // Convert to seconds

    if (elapsed < 0.1) {
      // Quick flash up in first 100ms
      flashIntensity.current = Math.min(elapsed * 8, 0.8); // Max intensity of 0.8
    } else if (elapsed < 0.7) {
      // Fade out over 600ms
      flashIntensity.current = Math.max(0.8 - (elapsed - 0.1) * 1.33, 0);

      if (flashIntensity.current <= 0) {
        isFlashing.current = false;
        flashIntensity.current = 0;
      }
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
