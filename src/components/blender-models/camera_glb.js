import React, { useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";

export function Camera(props) {
    const { nodes, materials } = useGLTF("/cam.glb");

    return (
        <group dispose={null} {...props} position={[-0.02, -0.01, 0.02]}>
            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Cube_1.geometry}
                material={materials.Material}
            />

            <mesh
                castShadow
                receiveShadow
                geometry={nodes.Cube_2.geometry}
                material={materials["Material.001"]}
            />
        </group>
    );
}
