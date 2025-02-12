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
import { useResponsiveFloor } from "../../hooks/useResponsiveCamera";
import { useExploreState } from "@/src/state/explore";
import { useShallow } from "zustand/react/shallow";
import * as THREE from "three";
import ExploreButton from "../cta/ExploreButton";
import { useLoadingState } from "@/src/state/loading";

export default function Scene({ onLoadingComplete }) {
  const { isExploring, setIsExploring } = useExploreState(
    useShallow((state) => ({
      isExploring: state.isExploring,
      setIsExploring: state.setIsExploring,
    }))
  );
  const { projects } = useProjectState();
  const floatRef = useRef();
  const { isLoading, setIsLoading } = useLoadingState(
    useShallow((state) => ({
      isLoading: state.isLoading,
      setIsLoading: state.setIsLoading,
    }))
  );

  useEffect(() => {
    if (floatRef.current) {
      gsap.to(floatRef.current, {
        duration: 0.8,
        ease: "power2.inOut",
        floatIntensity: isExploring ? 0.1 : 0.2,
        speed: isExploring ? 0.5 : 2,
        rotationIntensity: isExploring ? 0.1 : 0.2,
      });
    }
  }, [isExploring]);

  useEffect(() => {
    if (!isLoading) return;

    const timer = setTimeout(() => {
      onLoadingComplete?.();
      setIsLoading(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onLoadingComplete, isLoading, setIsLoading]);

  return (
    <>
      {isLoading && <LoadingScreen />}
      <div className="container">
        <Canvas
          camera={{ position: [0, 0, 4], fov: 50, far: 100 }}
          onCreated={({ gl }) => {
            gl.gammaFactor = 2.2;
            gl.outputEncoding = THREE.sRGBEncoding;
          }}
        >
          <color attach="background" args={["black"]} />
          <Suspense fallback={null}>
            <ScrollControls
              pages={projects.length}
              damping={0.2}
              enabled={isExploring}
            >
              <ProjectTitle projects={projects} />
              {/* <GaussianBlur3D /> */}
              <Float
                ref={floatRef}
                floatIntensity={0.2}
                speed={2}
                rotationIntensity={0.2}
              >
                <CameraNew />
              </Float>
              <Lights />
              <BackgroundDistortion />
              <Effects />
              <Preload all />
            </ScrollControls>
          </Suspense>
        </Canvas>
      </div>
    </>
  );
}
