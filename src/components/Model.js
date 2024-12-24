import React, { useRef } from "react";
import { MeshPortalMaterial, useAspect, useGLTF, useVideoTexture } from "@react-three/drei";
// import { ImageCarousel } from "./carousel/image-carousel";
import { useResponsiveCamera } from "../hooks/useResponsiveCamera";
import { useCameraState } from "../state/camera";
import { useShallow } from "zustand/react/shallow";
import { useFrame } from "@react-three/fiber";
import './carousel/bent-plane-geometry';
import * as THREE from "three";
import { ImageCarousel } from "./carousel/image-carousel";

export default function CameraNew(props) {
    const group = useRef()

    const { nodes, materials } = useGLTF("/model/Remodel.glb");

    useResponsiveCamera();

    const { scale, position, rotation } = useCameraState(
        useShallow((state) => ({
            scale: state.scale,
            position: state.position,
            rotation: state.rotation,
        }))
    );

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
                // material={materials['Material.002']}
              >


                <MeshPortalMaterial>
                  {/* <ImageCarousel /> */}
                    <BackgroundVideo />
                </MeshPortalMaterial>

              </mesh>
            </group>
            <group name="Cam001" position={[-0.002, 0.001, 0]}>
              <mesh
                name="Plane002"
                castShadow
                receiveShadow
                geometry={nodes.Plane002.geometry}
                material={materials['Material.006']}
              />
              <mesh
                name="Plane002_1"
                castShadow
                receiveShadow
                geometry={nodes.Plane002_1.geometry}
                material={materials['Material.005']}
              />
              <mesh
                name="Plane002_2"
                castShadow
                receiveShadow
                geometry={nodes.Plane002_2.geometry}
                material={materials['Material.009']}
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
      )
}

useGLTF.preload("/model/Remodel.glb");


function VideoMaterial({ url }) {
  const texture = useVideoTexture(url)
  return <meshBasicMaterial map={texture} toneMapped={false} transparent={true} />
}

function BackgroundVideo({ isExploring }) {
  const size = useAspect(16, 9, 0.03);
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
      <mesh ref={meshRef} scale={size} position={[0, 0.05, 0.025]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry />
          <VideoMaterial url="/video/landing.mp4" />
      </mesh>
  );
}