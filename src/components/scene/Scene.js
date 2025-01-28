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

export default function Scene() {
  const { isExploring, setIsExploring } = useExploreState(
    useShallow((state) => ({
      isExploring: state.isExploring,
      setIsExploring: state.setIsExploring,
    }))
  );
  const { projects } = useProjectState();

  return (
    <>
      <LoadingScreen />
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
              <CameraNew />
              <Lights />
              <BackgroundDistortion />
              <Effects />
              <Preload all />
            </ScrollControls>
          </Suspense>
        </Canvas>
      </div>
      <ExploreButton
        handleExplore={() => setIsExploring(true)}
        handleReset={() => setIsExploring(false)}
        isExploring={isExploring}
      />
    </>
  );
}

function ExploreButton({ handleExplore, handleReset, isExploring }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center translate-y-[15vh] z-[100] pointer-events-none">
      <button
        onClick={!isExploring ? handleExplore : handleReset}
        className="bg-[#FFD803] text-black px-8 py-4 rounded-full font-semibold hover:bg-[#FFE249] transition-colors pointer-events-auto text-[36px]"
      >
        {!isExploring ? "Explore My Work" : "Back To Home"}
      </button>
    </div>
  );
}
