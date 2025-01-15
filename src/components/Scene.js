"use client";

import {
  ContactShadows,
  Float,
  MeshReflectorMaterial,
  Preload,
  useAspect,
  useVideoTexture,
  Fade,
  Text,
} from "@react-three/drei";
import { Canvas, useThree, useLoader, useFrame } from "@react-three/fiber";
import CameraNew from "./Model";
import * as THREE from "three";

import { TextCarousel } from "./TextCarousel";

import Rig from "./Rig";
import { useRef, useState, useEffect } from "react";
import { ModelUpdated } from "./ModelUpdated";
import NavigationMenu from "./NavigationMenu";
import { Controls, Slider } from "./carousel/carousel";
import {
  Bloom,
  DepthOfField,
  EffectComposer,
} from "@react-three/postprocessing";
import gsap from "gsap";
import "./carousel/bent-plane-geometry";
import LoadingScreen from "./LoadingScreen";

export default function Scene() {
  const videoRef = useRef(null);
  const cameraRef = useRef(null);
  const floorRef = useRef(null);
  const [isExploring, setIsExploring] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const initialRotation = useRef(0);

  useEffect(() => {
    // Reset loading state when needed
    setIsLoading(true);
  }, []); // Add dependencies if you want to trigger loading in specific scenarios

  const handleExplore = () => {
    setIsExploring(true);
    // Animate camera
    if (cameraRef.current) {
      gsap.to(cameraRef.current.position, {
        z: 2,
        y: -0.3,
        x: 0,
        duration: 1.5,
        ease: "power2.inOut",
      });
      gsap.to(cameraRef.current.rotation, {
        y: initialRotation.current + Math.PI,
        duration: 1.5,
        ease: "power2.inOut",
      });
      initialRotation.current += Math.PI;
    }
    // Animate floor
    if (floorRef.current) {
      gsap.to(floorRef.current.position, {
        y: -0.6,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }
  };

  const handleReset = () => {
    setIsExploring(false);
    // Reset camera
    if (cameraRef.current) {
      gsap.to(cameraRef.current.position, {
        z: 0,
        y: 0,
        duration: 1.5,
        ease: "power2.inOut",
      });
      gsap.to(cameraRef.current.rotation, {
        y: initialRotation.current - Math.PI,
        duration: 1.5,
        ease: "power2.inOut",
      });
      initialRotation.current -= Math.PI;
    }
    // Reset floor
    if (floorRef.current) {
      gsap.to(floorRef.current.position, {
        y: -0.2,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }
  };

  return (
    <>
      <LoadingScreen isVisible={isLoading} />
      <div className="container">
        <Canvas camera={{ position: [0, 0, 4], fov: 50, far: 100 }}>
          <color attach="background" args={["black"]} />
          <Lights />
          <Float floatIntensity={0.5} rotationIntensity={0.5}>
            <group ref={cameraRef}>
              <CameraNew />
            </group>
            {isExploring && (
              <Text
                position={[0.4, 0.6, 2]}
                rotation={[0, 0, 0]}
                fontSize={0.1}
                font="fonts/Dirtyline-36daysoftype.otf"
                color="white"
                anchorX="center"
                anchorY="middle"
                side={THREE.DoubleSide}
              >
                portfolio
              </Text>
            )}
          </Float>
          <mesh
            ref={floorRef}
            receiveShadow
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.2, 0]}
          >
            <planeGeometry args={[100, 10]} />
            <MeshReflectorMaterial
              blur={[500, 10]}
              resolution={2048}
              mixBlur={1}
              mixStrength={180}
              roughness={1}
              depthScale={1.5}
              minDepthThreshold={0.9}
              maxDepthThreshold={1.4}
              color="#202020"
              metalness={1}
            />
          </mesh>

          {/* <BackgroundVideo isExploring={isExploring} /> */}

          <EffectComposer disableNormalPass>
            <Bloom
              luminanceThreshold={0}
              mipmapBlur
              luminanceSmoothing={0.0}
              intensity={1}
            />
            <DepthOfField
              target={[0, 0, 0]}
              focalLength={5}
              bokehScale={15}
              height={700}
            />
          </EffectComposer>
          <Preload all />
        </Canvas>
      </div>
      <div className="fixed inset-0 flex items-center justify-center translate-y-[30vh] z-[100] pointer-events-none">
        <button
          onClick={!isExploring ? handleExplore : handleReset}
          className="bg-[#FFD803] text-black px-4 py-2 rounded-full font-medium hover:bg-[#FFE249] transition-colors pointer-events-auto"
        >
          {!isExploring ? "Explore my work" : "Back to Home"}
        </button>
      </div>
    </>
  );
}

function Lights() {
  const directionalLightRef = useRef();

  return (
    <group>
      <pointLight
        distance={2}
        intensity={2}
        position={[1, 0.5, 0]}
        color="orange"
      />
      {/* <hemisphereLight intensity={0.15} groundColor="black" /> */}
      <spotLight
        decay={0}
        position={[10, 20, 10]}
        angle={0.12}
        penumbra={1}
        intensity={1}
        castShadow
        shadow-mapSize={1024}
      />

      {/* <ambientLight intensity={Math.PI} /> */}
      <directionalLight
        ref={directionalLightRef}
        position={[-5, 1, 20]}
        angle={0.1}
        intensity={Math.PI * 0.05}
      />
      {/* <Environment preset="city" blur={1} /> */}
      {/* <ContactShadows
                resolution={512}
                position={[0, -0.8, 0]}
                opacity={1}
                scale={10}
                blur={2}
                far={0.8}
            /> */}
    </group>
  );
}
