import React, { Suspense, useState } from "react";
import "../App.css";
import { Camera } from "../components/blender-models/camera_glb";
import { PerspectiveCamera, OrbitControls } from "@react-three/drei";
import Headline from "../components/text/text";
import { useControls } from "leva";
import { animated, useSpring, config } from "@react-spring/three";
import { useNavigate } from "react-router-dom";

const LandingPageScene = () => {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);

  const [active, setActive] = useState(false);

  const { scale } = useSpring({
    scale: active ? 2.7 : 2.5,
    config: config.wobbly,
  });

  const debugConfig = useControls({
    textPosition: [0.03, 0.02, 0.05],
    text: "PICS",
    curveSegments: { value: 32, min: 1, max: 100, step: 1 },
    bevelSegments: { value: 32, min: 1, max: 100, step: 1 },
    bevelEnabled: true,
    bevelSize: { value: 0.002, min: 0, max: 0.01, step: 0.0001 },
    bevelThickness: { value: 0.01, min: 0, max: 1, step: 0.001 },
    bevelOffset: { value: 0, min: 0, max: 1, step: 0.001 },
    height: { value: 0.0, min: 0, max: 10, step: 0.01 },
    lineHeight: { value: 0.5, min: 0, max: 10, step: 0.01 },
    letterSpacing: {
      value: 0.008,
      min: -1,
      max: 1,
      step: 0.001,
    },
    modelPosition: [0, 0.04, -0.2],
    modelRotation: [0.15, 0, 0],
    cameraPosition: [-0.06, 0.03, 0.08],
    cameraRotation: [0.02, -1.09, 0.0],
    cameraScale: [2.5, 2.5, 2.5],
    ambienLightIntensity: { value: 0.3, min: 0, max: 1, step: 0.001 },
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

      <ambientLight intensity={debugConfig.ambienLightIntensity} />
      <directionalLight castShadow intensity={0.6} position={[0, 0, 10]} />

      <Suspense fallback={null}>
        <animated.group
          scale={scale}
          position={debugConfig.modelPosition}
          rotation={debugConfig.modelRotation}
          onClick={() => {
            navigate("/gallery");
          }}
          onPointerOver={() => {
            setActive(true);
          }}
          onPointerOut={() => {
            setActive(false);
          }}
        >
          <Camera
            rotation={debugConfig.cameraRotation}
            position={debugConfig.cameraPosition}
          />
          <Headline config={debugConfig} shouldAnimate={isHovering}>
            {debugConfig.text}
          </Headline>
        </animated.group>
      </Suspense>
    </>
  );
};

export default LandingPageScene;
