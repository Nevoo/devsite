import React, { Suspense, useState, useRef } from "react";
import "./App.css";
import { Canvas, useFrame } from "@react-three/fiber";
import DonutGLTF from "./compontents/donut-gltf";
import {
  PerspectiveCamera,
  Instances,
  Instance,
  Environment,
  OrbitControls,
  Float,
  MeshTransmissionMaterial,
  Lightformer,
} from "@react-three/drei";
import { useSpring, animated, config } from "@react-spring/web";
import {
  EffectComposer,
  SSAO,
  Bloom,
  DepthOfField,
} from "@react-three/postprocessing";
import { MathUtils } from "three";
import useSpline from "@splinetool/r3f-spline";
import { useControls } from "leva";

const particles = Array.from({ length: 150 }, () => ({
  factor: MathUtils.randInt(2, 10),
  speed: MathUtils.randFloat(0.005, 2),
  xFactor: MathUtils.randFloatSpread(0.08),
  yFactor: MathUtils.randFloatSpread(0.04),
  zFactor: MathUtils.randFloatSpread(0.04),
}));

function App() {
  const config = useControls({
    backside: false,
    samples: { value: 16, min: 1, max: 32, step: 1 },
    resolution: { value: 256, min: 64, max: 2048, step: 64 },
    transmission: { value: 0.95, min: 0, max: 1 },
    roughness: { value: 0.5, min: 0, max: 1, step: 0.01 },
    clearcoat: { value: 0.1, min: 0, max: 1, step: 0.01 },
    clearcoatRoughness: { value: 0.1, min: 0, max: 1, step: 0.01 },
    thickness: { value: 200, min: 0, max: 200, step: 0.01 },
    backsideThickness: { value: 200, min: 0, max: 200, step: 0.01 },
    ior: { value: 1.5, min: 1, max: 5, step: 0.01 },
    chromaticAberration: { value: 1, min: 0, max: 1 },
    anisotropy: { value: 1, min: 0, max: 10, step: 0.01 },
    distortion: { value: 0, min: 0, max: 1, step: 0.01 },
    distortionScale: { value: 0.2, min: 0.01, max: 1, step: 0.01 },
    temporalDistortion: { value: 0, min: 0, max: 1, step: 0.01 },
    attenuationDistance: { value: 0.5, min: 0, max: 10, step: 0.01 },
    attenuationColor: "#ffffff",
    color: "#ffffff",
  });

  const [isHovering, setIsHovering] = useState(false);
  const [{ background }] = useSpring(
    () => ({
      from: { background: "var(--step0)" },
      to: [
        { background: "var(--step1)" },
        { background: "var(--step2)" },
        { background: "var(--step3)" },
        { background: "var(--step4)" },
      ],
      config: config.molasses,
      loop: {
        reverse: true,
      },
    }),
    []
  );

  const onHover = (isAnimating) => {
    setIsHovering(isAnimating);
  };

  return (
    <div>
      <animated.div className="App" style={isHovering ? { background } : null}>
        <Canvas>
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
          <Suspense fallback={null}>
            <DonutGLTF onHover={onHover} />
            <Environment resolution={256}>
              <group rotation={[-Math.PI / 2, 0, 0]}>
                <Lightformer
                  intensity={4}
                  rotation-x={Math.PI / 2}
                  position={[0, 5, -9]}
                  scale={[10, 10, 1]}
                />
                <Lightformer
                  intensity={2}
                  rotation-y={Math.PI / 2}
                  position={[-5, 1, -1]}
                  scale={[50, 2, 1]}
                />
                <Lightformer
                  intensity={2}
                  rotation-y={Math.PI / 2}
                  position={[-5, -1, -1]}
                  scale={[50, 2, 1]}
                />
                <Lightformer
                  intensity={2}
                  rotation-y={-Math.PI / 2}
                  position={[10, 1, 0]}
                  scale={[50, 2, 1]}
                />
              </group>
            </Environment>
          </Suspense>
        </Canvas>
      </animated.div>
    </div>
  );
}

export default App;
