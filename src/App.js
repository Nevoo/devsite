import React, { Suspense, useState, useRef } from "react";
import "./App.css";
import { Canvas, useFrame } from "@react-three/fiber";
import DonutGLTF from "./compontents/blender-models/donut-gltf";
import {
  PerspectiveCamera,
  Environment,
  OrbitControls,
  Points,
  PointMaterial,
  Lightformer,
} from "@react-three/drei";
import { useSpring, animated, config } from "@react-spring/web";
import { useControls } from "leva";
import { inSphere } from "maath/random";
import Headline from "./compontents/text/text";

function App() {
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
      {/* <animated.div className="App" style={isHovering ? { background } : null}> */}
      <animated.div className="App">
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

          <Stars config={debugConfig}></Stars>
          <Suspense fallback={null}>
            <group position={debugConfig.modelPosition}>
              <DonutGLTF onHover={onHover} />
              <Headline config={debugConfig} shouldAnimate={isHovering}>
                {debugConfig.text}
              </Headline>
            </group>
          </Suspense>
        </Canvas>
      </animated.div>
    </div>
  );
}

function Stars({ config, ...props }) {
  const ref = useRef();
  const [sphere] = useState(() =>
    inSphere(new Float32Array(5000), { radius: 1 })
  );

  useFrame((state, delta) => {
    ref.current.rotation.x -= delta / config.starRotationSpeedX;
    ref.current.rotation.y -= delta / config.starRotationSpeedY;
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points
        ref={ref}
        positions={sphere}
        stride={3}
        frustumCulled={false}
        {...props}
      >
        <PointMaterial
          transparent
          color={config.starColor}
          size={0.01}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
}

export default App;
