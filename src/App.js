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
} from "@react-three/drei";
import { useSpring, animated, config } from "@react-spring/web";
import { EffectComposer, SSAO } from "@react-three/postprocessing";
import { MathUtils } from "three";

const particles = Array.from({ length: 150 }, () => ({
  factor: MathUtils.randInt(2, 10),
  speed: MathUtils.randFloat(0.005, 2),
  xFactor: MathUtils.randFloatSpread(0.08),
  yFactor: MathUtils.randFloatSpread(0.04),
  zFactor: MathUtils.randFloatSpread(0.04),
}));

function App() {
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
            makeDefault={true}
            far={100}
            near={0.1}
            fov={22.9}
            position={[0, 0, 1]}
            rotation={[0, 0, 0]}
          />
          <ambientLight intensity={0.3} />
          <spotLight position={[10, 10, 10]} angle={0.3} />
          <pointLight position={[-10, -10, -10]} />
          <EffectComposer multisampling={4}>
            <SSAO
              samples={40}
              radius={0.1}
              intensity={30}
              luminanceInfluence={0.1}
              color="red"
            />
          </EffectComposer>
          <Instances
            limit={particles.length} // Optional: max amount of items (for calculating buffer size)
            castShadow
            receiveShadow
            // range={150}
            position={[0, 0, 0]}
          >
            <sphereGeometry args={[0.01, 32, 32]} />
            <meshStandardMaterial roughness={0} color="#f0f0f0" />
            {particles.map((data, i) => (
              <Bubble key={i} {...data} />
            ))}
          </Instances>
          <Suspense fallback={null}>
            <DonutGLTF onHover={onHover} />
            <Environment preset="city" />
          </Suspense>
        </Canvas>
      </animated.div>
    </div>
  );
}

function Bubble({ factor, speed, xFactor, yFactor, zFactor }) {
  const ref = useRef();
  useFrame((state) => {
    const t = factor + state.clock.elapsedTime * (speed / 2);
    ref.current.scale.setScalar(Math.max(1.5, Math.cos(t) * 5));
    let positionFactor = 10;
    ref.current.position.set(
      Math.cos(t) +
        Math.sin(t * 1) / positionFactor +
        xFactor +
        Math.cos((t / positionFactor) * factor) +
        (Math.sin(t * 1) * factor) / positionFactor,
      Math.sin(t) +
        Math.cos(t * 2) / positionFactor +
        yFactor +
        Math.sin((t / positionFactor) * factor) +
        (Math.cos(t * 2) * factor) / positionFactor,
      Math.sin(t) +
        Math.cos(t * 2) / positionFactor +
        zFactor +
        Math.cos((t / positionFactor) * factor) +
        (Math.sin(t * 3) * factor) / positionFactor
    );
  });
  return <Instance ref={ref} />;
}

export default App;
