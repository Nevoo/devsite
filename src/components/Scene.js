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
  MeshTransmissionMaterial,
} from "@react-three/drei";
import { Canvas, useThree, useLoader, useFrame } from "@react-three/fiber";
import CameraNew from "./Model";
import * as THREE from "three";
import { easing } from "maath";

import { TextCarousel } from "./TextCarousel";

import Rig from "./Rig";
import { useRef, useState, useEffect, forwardRef } from "react";
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
import { useFloorState } from "../state/general";
import { useResponsiveFloor } from "../hooks/useResponsiveCamera";

export default function Scene() {
  const textRef = useRef(null);
  const videoRef = useRef(null);
  const cameraRef = useRef(null);
  const floorRef = useRef(null);
  const backgroundEffectsRef = useRef(null);
  const [isExploring, setIsExploring] = useState(false);
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
        y: -0.2,
        x: 0,
        duration: 1.5,
        ease: "power2.inOut",
      });
      gsap.to(
        cameraRef.current.rotation,
        {
          y: initialRotation.current + Math.PI,
          duration: 1.5,
          ease: "power2.inOut",
        },
        "<"
      );

      initialRotation.current += Math.PI;
    }
    // Animate distortion
    const material =
      backgroundEffectsRef.current.children[0].children[0].material;
    if (material) {
      gsap.to(material, {
        distortion: 5,
        distortionScale: 0.5,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }

    // Fade in texts
    const textGroup = backgroundEffectsRef.current.children[0].children[1];

    if (textGroup) {
      textGroup.children.forEach((text, index) => {
        gsap.to(text, {
          fillOpacity: 1,
          duration: 1,
          delay: 0.2 * index,
          ease: "power2.inOut",
        });
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
    // Reset distortion
    const material =
      backgroundEffectsRef.current.children[0].children[0].material;
    if (material) {
      gsap.to(material, {
        distortion: 0,
        distortionScale: 0,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }

    // Fade out texts
    const textGroup = backgroundEffectsRef.current.children[0].children[1];
    if (textGroup) {
      textGroup.children.forEach((text) => {
        gsap.to(text, {
          fillOpacity: 0,
          duration: 0.5,
          delay: 0.5,
          ease: "power2.inOut",
        });
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
          <Float floatIntensity={0.2} rotationIntensity={0.2}>
            <group ref={cameraRef} rotation={[0, 0, 0]}>
              <CameraNew />
            </group>
          </Float>

          <group ref={backgroundEffectsRef}>
            <BackgroundEffects />
          </group>

          <Rig></Rig>

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
      <div className="fixed inset-0 flex items-center justify-center translate-y-[15vh] z-[100] pointer-events-none">
        <button
          onClick={!isExploring ? handleExplore : handleReset}
          className="bg-[#FFD803] text-black px-8 py-4 rounded-full font-semibold hover:bg-[#FFE249] transition-colors pointer-events-auto text-[36px]"
        >
          {!isExploring ? "Explore My Work" : "Back To Home"}
        </button>
      </div>
    </>
  );
}

const BackgroundEffects = forwardRef(function (props, ref) {
  const materialRef = useRef();
  const textGroupRef = useRef();
  const textRefs = useRef([]);
  const textPositions = [
    [0, 2, -5],
    [0, 0, -5],
    [0, -2, -5],
  ];

  useFrame((state, delta) => {});

  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[10, 10, 0.1]} position={[0, 0, -4]} />
        <MeshTransmissionMaterial
          ref={materialRef}
          ior={1.2}
          thickness={1.5}
          anisotropy={0.1}
          chromaticAberration={0.04}
          distortion={0}
          distortionScale={0}
          temporalDistortion={0.01}
        />
      </mesh>

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
    </group>
  );
});

const Floor = forwardRef(function (props, ref) {
  return (
    <mesh
      ref={ref}
      receiveShadow
      rotation={[-Math.PI / 2, 0, 0]}
      position={props.position}
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
  );
});

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
