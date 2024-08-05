/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.2.16 public/cam-final-smooth1.glb --transform -j 
Files: public/cam-final-smooth1.glb [5.33MB] > /Users/rouven/Dev/projects/private/websites/devsite/cam-final-smooth1-transformed.glb [1.81MB] (66%)
*/
import * as THREE from "three";

import React, { useRef } from "react";
import { Mask, MeshPortalMaterial, Sky, useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import useCameraTransitionState from "../../../../global-state/model-state";

const zPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const yPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1);

    export function CameraNew({ portalChildren, ...props }) {
    const displayRef = useRef();
    const { width, height } = useThree((state) => state.size);

    const cameraRotation = useCameraTransitionState((state) => state.rotation);

    const { nodes, materials } = useGLTF("/cam-final-smooth1-transformed.glb");
    return (
        <group {...props} dispose={null}>
            <mesh
                geometry={nodes.Cam.geometry}
                material={materials.PaletteMaterial001}
            />
            <mesh
                geometry={nodes.Iso_Button.geometry}
                material={materials.PaletteMaterial002}
            />
            <mesh
                geometry={nodes.Button.geometry}
                material={materials.PaletteMaterial003}
            />
            <mesh
                geometry={nodes.Button_2.geometry}
                material={materials.PaletteMaterial003}
            />
            <mesh
                geometry={nodes.Button_3.geometry}
                material={materials.PaletteMaterial003}
            />
            <mesh
                geometry={nodes.Mode_Button.geometry}
                material={materials.PaletteMaterial003}
            />
            <mesh
                geometry={nodes.Button_4.geometry}
                material={materials.PaletteMaterial003}
            />
            <mesh
                geometry={nodes.Button_5.geometry}
                material={materials.PaletteMaterial003}
            />
            <mesh
                geometry={nodes.Button_6.geometry}
                material={materials.PaletteMaterial003}
            />
            <mesh
                geometry={nodes.Button_7.geometry}
                material={materials.PaletteMaterial003}
            />
            <mesh
                geometry={nodes.Button_8.geometry}
                material={materials.PaletteMaterial002}
            />
            <mesh
                geometry={nodes.Sensor.geometry}
                material={materials.PaletteMaterial004}
            />

            <mesh geometry={nodes.Display.geometry}>
                <MeshPortalMaterial>
                    <group rotation={[0, Math.PI * 1.5, 0]}>
                        {portalChildren}
                    </group>
                </MeshPortalMaterial>
            </mesh>

            <mesh
                geometry={nodes.Display_Frame.geometry}
                material={materials.PaletteMaterial003}
            />
            <mesh
                geometry={nodes.sensor_circle.geometry}
                material={materials.PaletteMaterial002}
            />
            <mesh
                geometry={nodes.Sensor_Circle.geometry}
                material={materials["Die-cast aluminum"]}
            />
            <mesh
                geometry={nodes.Sensor_Inner_Circle.geometry}
                material={materials["Die-cast aluminum"]}
            />
            <mesh
                geometry={nodes.Sensor_Frame.geometry}
                material={materials["Die-cast aluminum"]}
            />
            <mesh
                geometry={nodes.Camera_Handle_Missing.geometry}
                material={materials["Rubber Matt"]}
            />
            <mesh
                geometry={nodes.Viewfinder.geometry}
                material={materials.PaletteMaterial005}
            />
        </group>
    );
}

useGLTF.preload("/cam-final-smooth1-transformed.glb");

function Model({ clip, ...props }) {
    const { nodes, materials } = useGLTF("/low_poly_mccree-transformed.glb");
    return (
        <mesh geometry={nodes.base.geometry} {...props} dispose={null}>
            <meshBasicMaterial
                map={materials.PaletteMaterial001.map}
                side={THREE.DoubleSide}
                clippingPlanes={clip ? [zPlane, yPlane] : null}
            />
        </mesh>
    );
}
