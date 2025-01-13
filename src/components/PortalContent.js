import React from "react";
import { Text } from "@react-three/drei";

export function PortfolioContent() {
  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <Text
        position={[0, 0, -1.5]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        Portfolio
      </Text>
    </group>
  );
}

export function GalleryContent() {
  return (
    <group>
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <Text
        position={[0, 0, -1.5]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        Gallery
      </Text>
    </group>
  );
}

export function AboutContent() {
  return (
    <group>
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <Text
        position={[0, 0, -1.5]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        About
      </Text>
    </group>
  );
}
