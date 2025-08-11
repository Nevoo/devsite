"use client";

import * as THREE from "three";
import { useRef, useState } from "react";
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import {
  useFBO,
  useScroll,
  Image,
  Scroll,
  Preload,
  ScrollControls,
  MeshTransmissionMaterial,
} from "@react-three/drei";
import { easing } from "maath";

const images = [
  // Opening spread - nature and wedding
  {
    url: "/images/nature/gallery/DSC03828.jpeg",
    position: [-2.5, 0, 0],
    scale: [3, 2, 1],
  },
  {
    url: "/images/weddings/gallery/DSC02847.jpeg",
    position: [1.5, 0, 1],
    scale: [3, 2, 1],
  },
  // Concert series
  {
    url: "/images/concerts/gallery/DSC04248.jpeg",
    position: [-2.5, -3, 2],
    scale: [2, 1.3, 1],
  },
  {
    url: "/images/concerts/gallery/DSC04137.jpeg",
    position: [0, -3, 3],
    scale: [2, 1.3, 1],
  },
  {
    url: "/images/concerts/gallery/DSC04360.jpeg",
    position: [2.5, -3, 4],
    scale: [2, 1.3, 1],
  },
  // Travel and street mix
  {
    url: "/images/travel/gallery/DSC03862.jpeg",
    position: [-2, -6, 5],
    scale: [2.5, 1.7, 1],
  },
  {
    url: "/images/street/gallery/DSC05320.jpeg",
    position: [1, -6, 6],
    scale: [2.5, 1.7, 1],
  },
  // Nature series
  {
    url: "/images/nature/gallery/DSC03694.jpeg",
    position: [-2.5, -9, 7],
    scale: [2, 1.3, 1],
  },
  {
    url: "/images/nature/gallery/DSC8162.jpeg",
    position: [0, -9, 8],
    scale: [2, 1.3, 1],
  },
  {
    url: "/images/nature/gallery/DSC03830.jpeg",
    position: [2.5, -9, 9],
    scale: [2, 1.3, 1],
  },
  // Wedding moments
  {
    url: "/images/weddings/gallery/DSC02640.jpeg",
    position: [-1.5, -12, 10],
    scale: [2.5, 1.7, 1],
  },
  {
    url: "/images/weddings/gallery/DSC02936.jpeg",
    position: [1.5, -12, 11],
    scale: [2.5, 1.7, 1],
  },
  // Final spread
  {
    url: "/images/nature/gallery/DSC03588.jpeg",
    position: [0, -15.5, 0],
    scale: [6, 4, 1],
  },
];

export function Gallery() {
  return (
    <div className="w-full h-screen">
      <Canvas camera={{ position: [0, 0, 20], fov: 15 }}>
        <ScrollControls damping={0.2} pages={4} distance={0.5}>
          <Lens>
            <Scroll>
              <Images />
            </Scroll>
            <Preload />
          </Lens>
        </ScrollControls>
      </Canvas>
    </div>
  );
}

function Lens({ children, damping = 0.15 }) {
  const ref = useRef();
  const buffer = useFBO();
  const viewport = useThree((state) => state.viewport);
  const [scene] = useState(() => new THREE.Scene());

  useFrame((state, delta) => {
    const viewport = state.viewport.getCurrentViewport(
      state.camera,
      [0, 0, 15]
    );
    easing.damp3(
      ref.current.position,
      [
        (state.pointer.x * viewport.width) / 2,
        (state.pointer.y * viewport.height) / 2,
        15,
      ],
      damping * 2, // Slower movement for smoother effect
      delta
    );

    state.gl.setRenderTarget(buffer);
    state.gl.setClearColor("#d8d7d7");
    state.gl.render(scene, state.camera);
    state.gl.setRenderTarget(null);
  });

  return (
    <>
      {createPortal(children, scene)}
      <mesh scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} />
      </mesh>
      <mesh scale={0.8} ref={ref} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.5, 0.5, 0.01, 64]} />
        <MeshTransmissionMaterial
          buffer={buffer.texture}
          ior={1.02}
          thickness={0.2}
          anisotropy={0.1}
          chromaticAberration={0.03}
          distortion={0.05}
          distortionScale={0.2}
          temporalDistortion={0.01}
          transmissionSampler={false}
          backside={false}
          resolution={512}
          samples={32}
          background={new THREE.Color("#d8d7d7")}
        />
      </mesh>
    </>
  );
}

function Images() {
  const group = useRef();
  const data = useScroll();

  useFrame(() => {
    // Zoom effects for different image groups
    group.current.children.forEach((child, i) => {
      if (i < 2) {
        // Opening spread
        child.material.zoom = 1 + data.range(0, 1 / 4) / 3;
      } else if (i < 5) {
        // Concert series
        child.material.zoom = 1 + data.range(0.15, 1 / 4) / 3;
      } else if (i < 7) {
        // Travel and street
        child.material.zoom = 1 + data.range(0.4, 1 / 4) / 3;
      } else if (i < 10) {
        // Nature series
        child.material.zoom = 1 + data.range(0.65, 1 / 4) / 3;
      } else if (i < 12) {
        // Wedding moments
        child.material.zoom = 1 + data.range(0.8, 1 / 4) / 3;
      } else {
        // Final spread
        child.material.zoom = 1 + (1 - data.range(0.85, 1 / 4)) / 3;
      }
    });
  });

  return (
    <group ref={group}>
      {images.map((img, i) => (
        <Image
          key={i}
          position={img.position}
          scale={img.scale}
          url={img.url}
          transparent={false}
          toneMapped={false}
        />
      ))}
    </group>
  );
}
