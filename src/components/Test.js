"use client";

import React, { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
// import * as THREE from "three";

export function AnimatedText({ text, position, fontSize = 1 }) {
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
