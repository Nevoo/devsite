import { MeshTransmissionMaterial, Text, useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import useExplore from "@/src/hooks/useExplore";
import { useExploreState } from "@/src/state/explore";
import gsap from "gsap";

export default function BackgroundDistortion() {
  const materialRef = useRef();
  const textGroupRef = useRef();
  const meshRef = useRef();
  const textRefs = useRef([]);
  const isExploring = useExploreState((state) => state.isExploring);

  useExplore(materialRef, {
    exploringProps: {
      distortion: 10,
      distortionScale: 0.5,
    },
    notExploringProps: {
      distortion: 0,
      distortionScale: 0,
    },
  });

  // Handle text animations
  useEffect(() => {
    if (!textGroupRef.current) return;

    textGroupRef.current.children.forEach((text, index) => {
      gsap.to(text, {
        fillOpacity: isExploring ? 1 : 0,
        duration: isExploring ? 1 : 0.5,
        delay: isExploring ? 0.2 * index : 0.4,
        ease: "power2.inOut",
      });
    });
  }, [isExploring]);

  const textPositions = [
    [0, 2, -5],
    [0, 0, -5],
    [0, -2, -5],
  ];

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[10, 10, 0.1]} position={[0, 0, -4]} />
      <MeshTransmissionMaterial
        ref={materialRef}
        ior={1.2}
        thickness={1.5}
        anisotropy={0.1}
        chromaticAberration={0.5}
        distortion={0}
        distortionScale={0}
        temporalDistortion={0.01}
      />
      <group ref={textGroupRef}>
        {textPositions.map((position, index) => (
          <Text
            key={index}
            ref={(el) => (textRefs.current[index] = el)}
            position={position}
            fontSize={2}
            font="fonts/Dirtyline-36daysoftype.otf"
            color="white"
            anchorX="center"
            anchorY="middle"
            side={THREE.DoubleSide}
            pointerEvents="none"
            fillOpacity={0}
          >
            eXpLoRe
          </Text>
        ))}
      </group>
    </mesh>
  );
}
