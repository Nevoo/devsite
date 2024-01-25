import React, { useRef, useState } from "react";
import { Bounds, Center, useGLTF } from "@react-three/drei";
import { animated } from "@react-spring/three";
import { Flex, Box } from "@react-three/flex";

export function Camera(props) {
    const { nodes, materials } = useGLTF("/cam.glb");

    return (
        <Flex
            justifyContent="flex-start"
            // alignItems="flex-start"
            // size={[window.innerWidth, window.innerHeight, 0]}
        >
            <Box>
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
            </Box>
        </Flex>
    );
}
