import React, { useRef, useEffect } from "react";
import {
  MeshPortalMaterial,
  useGLTF,
  useVideoTexture,
  Text,
} from "@react-three/drei";
import { useResponsiveCamera } from "../hooks/useResponsiveCamera";
import { useCameraState } from "../state/camera";
import { useShallow } from "zustand/react/shallow";
import { useFrame } from "@react-three/fiber";
import "./carousel/bent-plane-geometry";
import * as THREE from "three";
import gsap from "gsap";
import {
  PortfolioContent,
  GalleryContent,
  AboutContent,
} from "./PortalContent";

export default function CameraNew(props) {
  const group = useRef();
  const displayRef = useRef();
  const textRef = useRef();

  const { nodes, materials } = useGLTF("/model/Remodel.glb");

  useResponsiveCamera();

  const {
    scale,
    position,
    rotation,
    mode,
    isShutterActive,
    portalActive,
    setMode,
    setPortalActive,
  } = useCameraState(
    useShallow((state) => ({
      scale: state.scale,
      position: state.position,
      rotation: state.rotation,
      mode: state.mode,
      isShutterActive: state.isShutterActive,
      portalActive: state.portalActive,
      setMode: state.setMode,
      setPortalActive: state.setPortalActive,
    }))
  );

  // Handle shutter animation
  useEffect(() => {
    if (isShutterActive && displayRef.current) {
      const material = displayRef.current.material;
      gsap.to(material, {
        opacity: 0,
        duration: 0.15,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut",
      });
    }
  }, [isShutterActive]);

  // Handle portal zoom
  useEffect(() => {
    if (portalActive) {
      gsap.to(group.current.position, {
        z: 2,
        duration: 1,
        ease: "power2.inOut",
      });
      gsap.to(group.current.rotation, {
        y: rotation[1] + Math.PI,
        duration: 1.5,
        ease: "power2.inOut",
      });
    } else {
      gsap.to(group.current.position, {
        z: 0,
        duration: 1,
        ease: "power2.inOut",
      });
      gsap.to(group.current.rotation, {
        y: rotation[1],
        duration: 1.5,
        ease: "power2.inOut",
      });
    }
  }, [portalActive, rotation]);

  // Mode text animation
  useFrame((state) => {
    if (textRef.current) {
      textRef.current.position.y =
        1.5 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group
      ref={group}
      {...props}
      dispose={null}
      scale={scale}
      position={position}
      rotation={rotation}
    >
      <Text
        ref={textRef}
        position={[0, 1.5, 0]}
        fontSize={0.15}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {mode.toUpperCase()}
      </Text>

      <group name="Scene">
        <group name="Display001" position={[0.006, 0.002, 0]}>
          <mesh
            name="Plane004"
            castShadow
            receiveShadow
            geometry={nodes.Plane004.geometry}
            material={materials.Noise}
          />
          <mesh
            ref={displayRef}
            name="Plane004_1"
            castShadow
            receiveShadow
            geometry={nodes.Plane004_1.geometry}
            onClick={() => setPortalActive(!portalActive)}
          >
            <MeshPortalMaterial>
              {mode === "portfolio" && <PortfolioContent />}
              {mode === "gallery" && <GalleryContent />}
              {mode === "about" && <AboutContent />}
            </MeshPortalMaterial>
          </mesh>
        </group>
        <group name="Cam001" position={[-0.002, 0.001, 0]}>
          <mesh
            name="Plane002"
            castShadow
            receiveShadow
            geometry={nodes.Plane002.geometry}
            material={materials["Material.006"]}
          />
          <mesh
            name="Plane002_1"
            castShadow
            receiveShadow
            geometry={nodes.Plane002_1.geometry}
            material={materials["Material.005"]}
          />
          <mesh
            name="Plane002_2"
            castShadow
            receiveShadow
            geometry={nodes.Plane002_2.geometry}
            material={materials["Material.009"]}
            onClick={() => {
              const modes = ["portfolio", "gallery", "about"];
              const currentIndex = modes.indexOf(mode);
              const nextIndex = (currentIndex + 1) % modes.length;
              setMode(modes[nextIndex]);
            }}
          />
        </group>
        <mesh
          name="Circle002"
          castShadow
          receiveShadow
          geometry={nodes.Circle002.geometry}
          material={nodes.Circle002.material}
          position={[0.014, 0.107, 0.082]}
          rotation={[0.078, 0.061, -1.341]}
        />
        <mesh
          name="Circle005"
          castShadow
          receiveShadow
          geometry={nodes.Circle005.geometry}
          material={nodes.Circle005.material}
          position={[0.014, 0.107, 0.067]}
          rotation={[0.078, 0.061, -1.341]}
        />
        <mesh
          name="Detail"
          castShadow
          receiveShadow
          geometry={nodes.Detail.geometry}
          material={materials.Noise}
          position={[0.018, 0.059, -0.052]}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/model/Remodel.glb");

function VideoMaterial({ url }) {
  const texture = useVideoTexture(url);
  return (
    <meshBasicMaterial map={texture} toneMapped={false} transparent={true} />
  );
}

function BackgroundVideo({ isExploring }) {
  const size = useAspect(1920, 1080);
  const meshRef = useRef();
  const targetOpacity = useRef(1);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const material = meshRef.current.material;
      const target = isExploring ? 0 : 1;
      material.opacity = THREE.MathUtils.lerp(
        material.opacity,
        target,
        delta * 3
      );
    }
  });

  return (
    <mesh
      ref={meshRef}
      scale={size}
      position={[0, 0.05, 0.025]}
      rotation={[0, Math.PI / 2, 0]}
    >
      <planeGeometry />
      <VideoMaterial url="/video/landing.mp4" />
    </mesh>
  );
}
