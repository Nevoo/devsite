"use client";

import {
  Float,
  MeshReflectorMaterial,
  Preload,
  useAspect,
  useVideoTexture,
  Text,
  MeshTransmissionMaterial,
  Scroll,
} from "@react-three/drei";
import { Canvas, useThree, useLoader, useFrame } from "@react-three/fiber";
import {
  Suspense,
  useState,
  useEffect,
  useRef,
  forwardRef,
  useLayoutEffect,
} from "react";
import { ScrollControls, useScroll } from "@react-three/drei";
import CameraNew from "./Model";
import Lights from "./Lights";
import gsap from "gsap";
import { useProjectState } from "../../state/general";
import LoadingScreen from "../LoadingScreen";
import BackgroundDistortion from "./BackgroundDistortion";
import Effects from "./Effects";
import ProjectTitle from "./ProjectTitle";

import Rig from "../Rig";
import "../carousel/bent-plane-geometry";
import { useFloorState } from "../../state/general";
import { useResponsiveFloor } from "../../hooks/useResponsiveCamera";

export default function Scene() {
  const cameraRef = useRef(null);
  const floorRef = useRef(null);
  const backgroundEffectsRef = useRef(null);
  const [isExploring, setIsExploring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const initialRotation = useRef(0);
  const { projects } = useProjectState();
  const timelineRef = useRef();

  useEffect(() => {
    // Reset loading state when needed
    setIsLoading(true);
  }, []); // Add dependencies if you want to trigger loading in specific scenarios

  const handleExplore = () => {
    if (!cameraRef.current) return;

    // Create initial timeline if it doesn't exist
    if (!timelineRef.current) {
      const tl = gsap.timeline({ paused: true });
      timelineRef.current = tl;
    }

    // Enable exploring before animations start
    setIsExploring(true);

    // Initial camera movement
    const ctx = gsap.context(() => {
      gsap.to(cameraRef.current.position, {
        x: 1.3,
        z: 1,
        y: -0.2,
        duration: 1.5,
        ease: "power2.inOut",
      });

      gsap.to(cameraRef.current.rotation, {
        y: initialRotation.current + Math.PI,
        duration: 1.5,
        ease: "power2.inOut",
      });
    });

    initialRotation.current += Math.PI;

    // Animate distortion
    const material =
      backgroundEffectsRef.current?.children[0]?.children[0]?.material;
    if (material) {
      gsap.to(material, {
        distortion: 10,
        distortionScale: 0.5,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }

    // Fade in texts
    const textGroup = backgroundEffectsRef.current?.children[0]?.children[1];
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

    // Cleanup function
    return () => ctx.revert();
  };

  const handleReset = () => {
    setIsExploring(false);
    // Reset camera
    if (cameraRef.current) {
      gsap.to(cameraRef.current.position, {
        x: 0,
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
          <Suspense fallback={null}>
            <ScrollControls
              pages={projects.length}
              damping={0.2}
              enabled={isExploring}
            >
              <ProjectTitle projects={projects} />
              <group ref={cameraRef} rotation={[0, 0, 0]}>
                <Float floatIntensity={0.2} rotationIntensity={0.2}>
                  <CameraNew />
                </Float>
              </group>
              <group ref={backgroundEffectsRef}>
                <BackgroundDistortion />
              </group>
            </ScrollControls>
            <Effects />
            <Lights />
            <Floor ref={floorRef} />
          </Suspense>
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
