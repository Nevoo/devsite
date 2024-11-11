import React, { useRef } from "react";
import {
    MeshPortalMaterial,
    MeshReflectorMaterial,
    Sky,
    useGLTF,
} from "@react-three/drei";
import { useResponsiveCamera } from "../hooks/useResponsiveCamera";
import { useCameraState } from "../state/camera";
import { useShallow } from "zustand/react/shallow";
import { ImageCarousel } from "./carousel/image-carousel";
import { DoubleSide } from "three";

export function ModelUpdated(props) {
    const { nodes, materials } = useGLTF("/model/cam-final-mats.glb");
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
            {...props}
            dispose={null}
            scale={scale}
            position={position}
            rotation={rotation}
        >
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Cam.geometry}
                material={materials["PlasticMaterial.006"]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Iso_Button.geometry}
                material={materials["Material.015"]}
                position={[0.22, 0.15, -0.01]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Button.geometry}
                material={materials["Touched Plastic Smooth"]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Button_2.geometry}
                material={materials["Touched Plastic Smooth"]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Button_3.geometry}
                material={materials["Touched Plastic Smooth"]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Mode_Button.geometry}
                material={materials["Touched Plastic Smooth"]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Button_4.geometry}
                material={materials["LEATHER.003"]}
                position={[0.24, 0.09, -0.01]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Button_5.geometry}
                material={materials["LEATHER.003"]}
                position={[0, 0, -0.01]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Button_6.geometry}
                material={materials["LEATHER.003"]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Button_7.geometry}
                material={materials["LEATHER.003"]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Button_8.geometry}
                material={materials["LEATHER.003"]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Sensor.geometry}
                material={materials["Sensor Mat"]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                receiveShadow
                castShadow
                geometry={nodes.Display.geometry}
                // material={materials["Black Plastic"]}
                rotation={[0, 1.57, 0]}
            >
                <MeshPortalMaterial>
                    <ambientLight intensity={0.05} />
                    <mesh
                        position={[-1, 0, -0.5]}
                        rotation={[0, -Math.PI / 2, 0]}
                    >
                        <planeGeometry args={[2, 2, 5, 5]} />
                        <meshStandardMaterial
                            // roughness={0.5}
                            // metalness={0.1}
                            color={"#FFF"}
                            side={DoubleSide}
                        />
                    </mesh>
                    <ImageCarousel />
                </MeshPortalMaterial>
            </mesh>
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Display_Frame.geometry}
                material={materials["PlasticMaterial.005"]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.sensor_circle.geometry}
                material={materials["Black Plastic"]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Sensor_Circle.geometry}
                material={materials["Die-cast aluminum"]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Sensor_Inner_Circle.geometry}
                material={materials["Die-cast aluminum"]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Sensor_Frame.geometry}
                material={materials["Die-cast aluminum"]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Camera_Handle_Missing.geometry}
                material={materials["Rubber Matt"]}
                rotation={[0, 1.57, 0]}
            />
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Viewfinder.geometry}
                material={materials["PlasticMaterial.005"]}
                rotation={[0, 1.57, 0]}
            />
        </group>
    );
}

useGLTF.preload("/model/cam-final-mats.glb");
