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

  const { nodes, materials } = useGLTF("/model/remodel-knobs.glb");

  // Debug log to inspect model structure
  useEffect(() => {
    console.log("GLTF Nodes:", nodes);
    console.log("GLTF Materials:", materials);
  }, [nodes, materials]);

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
    } else {
      gsap.to(group.current.position, {
        z: 0,
        duration: 1,
        ease: "power2.inOut",
      });
    }
  }, [portalActive, rotation]);

  return (
    <group
      ref={group}
      {...props}
      dispose={null}
      scale={scale}
      position={position}
      rotation={rotation}
    >
      <group name="Scene">
        <group name="Cam" position={[-0.002, 0.001, 0]}>
          <mesh
            name="Plane001"
            castShadow
            receiveShadow
            geometry={nodes.Plane001.geometry}
            material={materials.Noise}
          />
          <mesh
            name="Plane001_1"
            castShadow
            receiveShadow
            geometry={nodes.Plane001_1.geometry}
            material={materials["Material.003"]}
          />
          <mesh
            name="Plane001_2"
            castShadow
            receiveShadow
            geometry={nodes.Plane001_2.geometry}
            material={materials["Material.002"]}
          />
          <mesh
            name="Plane001_3"
            castShadow
            receiveShadow
            geometry={nodes.Plane001_3.geometry}
            material={materials["Material.004"]}
          />
          <mesh
            name="Plane001_4"
            castShadow
            receiveShadow
            geometry={nodes.Plane001_4.geometry}
            material={materials.Material}
          />
        </group>
        <group name="Display001" position={[0.006, 0.002, 0]}>
          <mesh
            name="Plane004"
            castShadow
            receiveShadow
            geometry={nodes.Plane004.geometry}
            material={materials.Noise}
          />
          <mesh
            name="Plane004_1"
            castShadow
            receiveShadow
            geometry={nodes.Plane004_1.geometry}
            material={materials["Material.002"]}
            onClick={() => setPortalActive(!portalActive)}
          >
            <MeshPortalMaterial>
              <group rotation={[0, -rotation[1], 0]}>
                {mode === "portfolio" && <PortfolioContent />}
                {mode === "gallery" && <GalleryContent />}
                {mode === "about" && <AboutContent />}
              </group>
            </MeshPortalMaterial>
          </mesh>
        </group>
        <mesh
          name="Circle002"
          castShadow
          receiveShadow
          geometry={nodes.Circle002.geometry}
          material={materials["Material.002"]}
          position={[0.014, 0.107, 0.082]}
          rotation={[0.078, 0.061, -1.341]}
        />
        <mesh
          name="Circle001"
          castShadow
          receiveShadow
          geometry={nodes.Circle001.geometry}
          material={materials["Material.002"]}
          position={[0.014, 0.107, -0.025]}
          rotation={[0.078, 0.061, -1.341]}
        />
        <mesh
          name="Circle003"
          castShadow
          receiveShadow
          geometry={nodes.Circle003.geometry}
          material={materials["Material.002"]}
          position={[0.014, 0.106, -0.081]}
          rotation={[0.078, 0.061, -1.341]}
        />
        <mesh
          name="Circle004"
          castShadow
          receiveShadow
          geometry={nodes.Circle004.geometry}
          material={materials["Material.002"]}
          position={[0.016, 0.065, -0.047]}
          rotation={[0.085, -0.001, -Math.PI / 2]}
        />
        <mesh
          name="Circle005"
          castShadow
          receiveShadow
          geometry={nodes.Circle005.geometry}
          material={materials["Material.002"]}
          position={[0.014, 0.107, 0.067]}
          rotation={[0.078, 0.061, -1.341]}
        />
        <mesh
          name="Circle006"
          castShadow
          receiveShadow
          geometry={nodes.Circle006.geometry}
          material={nodes.Circle006.material}
          position={[-0.044, 0.109, -0.077]}
          rotation={[-0.026, 0.126, 0.23]}
        />
        <mesh
          name="Circle007"
          castShadow
          receiveShadow
          geometry={nodes.Circle007.geometry}
          material={nodes.Circle007.material}
          position={[-0.017, 0.116, -0.086]}
          rotation={[0.003, 0.167, 0]}
        />
        <mesh
          name="Circle008"
          castShadow
          receiveShadow
          geometry={nodes.Circle008.geometry}
          material={nodes.Circle008.material}
          position={[-0.017, 0.116, -0.068]}
          rotation={[-0.026, 0.186, 0.019]}
        />
        <mesh
          name="Circle009"
          castShadow
          receiveShadow
          geometry={nodes.Circle009.geometry}
          material={materials["Material.002"]}
          position={[0.016, 0.013, -0.046]}
          rotation={[0.085, -0.001, -Math.PI / 2]}
        />
        <mesh
          name="Circle010"
          castShadow
          receiveShadow
          geometry={nodes.Circle010.geometry}
          material={materials["Material.002"]}
          position={[0.016, 0.013, -0.065]}
          rotation={[0.085, -0.001, -Math.PI / 2]}
        />
        <mesh
          name="IsoButton"
          castShadow
          receiveShadow
          geometry={nodes.IsoButton.geometry}
          material={materials["Material.002"]}
          position={[0.014, 0.038, -0.055]}
          rotation={[0, 0, -Math.PI / 2]}
        />
        <mesh
          name="Detail"
          castShadow
          receiveShadow
          geometry={nodes.Detail.geometry}
          material={materials.Noise}
          position={[0.018, 0.059, -0.052]}
        />
        <mesh
          name="Idk"
          castShadow
          receiveShadow
          geometry={nodes.Idk.geometry}
          material={materials["Material.001"]}
          position={[0, 0.116, -0.061]}
          scale={1.193}
        />
        <mesh
          name="Knob"
          castShadow
          receiveShadow
          geometry={nodes.Knob.geometry}
          material={materials["Material.002"]}
          position={[0.001, 0.119, -0.087]}
        />
        <mesh
          name="ModeKnob"
          castShadow
          receiveShadow
          geometry={nodes.ModeKnob.geometry}
          material={materials["Material.002"]}
          position={[-0.009, 0.125, -0.033]}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/remodel-knobs.glb");

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
