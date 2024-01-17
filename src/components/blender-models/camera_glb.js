import React, { useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { animated } from "@react-spring/three";

export function Camera(props) {
    const { nodes, materials } = useGLTF("/cam.glb");

    return (
        <animated.group dispose={null} {...props}>
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
        </animated.group>
    );
}
