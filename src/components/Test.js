"use client";

import React, { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
// import * as THREE from "three";

function AnimatedText({ text, position, fontSize = 1 }) {
    const materialRef = useRef();
    const { size } = useThree();

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uScroll: { value: 0 },
        }),
        []
    );

    useFrame((state, delta) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value += delta;
            materialRef.current.uniforms.uScroll.value =
                state.camera.position.y / size.height;
        }
    });

    return (
        <Text
            position={position}
            fontSize={fontSize}
            font="fonts/Dirtyline-36daysoftype.otf"
            anchorX="center"
            anchorY="middle"
        >
            {text}
            <shaderMaterial
                ref={materialRef}
                attach="material"
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent
            />
        </Text>
    );
}

export default function Component() {
    return (
        <group>
            <AnimatedText text="SCROLL" position={[0, 0, 0]} fontSize={1} />
            <AnimatedText text="TO SEE" position={[0, -1, 0]} fontSize={1} />
            <AnimatedText
                text="THE EFFECT"
                position={[0, -2, 0]}
                fontSize={1}
            />
        </group>
    );
}
