import React, { Suspense, useState } from "react";
import "../App.css";
import DonutGLTF from "../components/blender-models/donut-gltf";
import { PerspectiveCamera, OrbitControls } from "@react-three/drei";
import { useControls } from "leva";
import Headline from "../components/text/text";
import Stars from "../components/stars/stars";

const DonutSzene = () => {
  const [isHovering, setIsHovering] = useState(false);

  const debugConfig = useControls({
    starRotationSpeedX: { value: 10, min: 1, max: 100, step: 1 },
    starRotationSpeedY: { value: 15, min: 1, max: 100, step: 1 },
    textPosition: [0.1, 0.02, 0.05],
    starColor: "#ffa0e0",
    color: "#ffffff",
    text: "D  NUT",
    curveSegments: { value: 32, min: 1, max: 100, step: 1 },
    bevelSegments: { value: 32, min: 1, max: 100, step: 1 },
    bevelEnabled: true,
    bevelSize: { value: 0.005, min: 0, max: 0.01, step: 0.0001 },
    bevelThickness: { value: 0.03, min: 0, max: 1, step: 0.001 },
    bevelOffset: { value: 0, min: 0, max: 1, step: 0.001 },
    height: { value: 0.0, min: 0, max: 10, step: 0.01 },
    lineHeight: { value: 0.5, min: 0, max: 10, step: 0.01 },
    letterSpacing: {
      value: 0.02,
      min: -1,
      max: 1,
      step: 0.01,
    },
    modelPosition: [-0.09, -0.02, -0.2],
  });

  const onHover = (isAnimating) => {
    setIsHovering(isAnimating);
  };

  return (
    <>
      <OrbitControls></OrbitControls>
      <PerspectiveCamera
        name="Camera"
        makeDefault
        far={100}
        near={0.1}
        fov={22.9}
        position={[0, 0, 1]}
        rotation={[0, 0, 0]}
      />

      <ambientLight />
      <directionalLight castShadow intensity={0.6} position={[0, 0, 10]} />

      <Stars config={debugConfig}></Stars>
      <Suspense fallback={null}>
        <group position={debugConfig.modelPosition}>
          <DonutGLTF onHover={onHover} />
          <Headline config={debugConfig} shouldAnimate={isHovering}>
            {debugConfig.text}
          </Headline>
        </group>
      </Suspense>
    </>
  );
};

export default DonutSzene;
