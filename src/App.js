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
          <color attach="background" args={["#fef4ef"]} />
          <ambientLight />
          <directionalLight castShadow intensity={0.6} position={[0, 0, 10]} />
          <EffectComposer multisampling={4}>
            {/* <SSAO
              samples={40}
              radius={0.1}
              intensity={30}
              luminanceInfluence={0.1}
              color="red"
            /> */}
            {/* <Bloom
              luminanceThreshold={0}
              mipmapBlur
              luminanceSmoothing={0}
              intensity={0.2}
            />
            <DepthOfField
              target={[0, 0, 3]}
              focalLength={1.8}
              bokehScale={15}
              height={700}
            /> */}
          </EffectComposer>
          {/* <Bubbles></Bubbles> */}
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
                {[2, 0, 2, 0, 2, 0, 2, 0].map((x, i) => (
                  <Lightformer
                    key={i}
                    form="circle"
                    intensity={4}
                    rotation={[Math.PI / 2, 0, 0]}
                    position={[x, 4, i * 4]}
                    scale={[4, 1, 1]}
                  />
                ))}
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
          <Bubbles color="#29C1A2" config={config}></Bubbles>
          <Scene scale={0.0005}></Scene>
        </Canvas>
      </animated.div>
    </div>
  );
}

function Scene({ ...props }) {
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

  return (
    <>
      <group {...props}>
        <Shape name="Torus" float={0} color="#fef4ef" config={config} />
      </group>
    </>
  );
}

function Shape({ name, float = 300, color, config, ...props }) {
  const { nodes } = useSpline("/shapes.splinecode");
  return (
    <Float floatIntensity={float} rotationIntensity={0} speed={2}>
      <mesh renderOrder={100} geometry={nodes[name].geometry} {...props}>
        <MeshTransmissionMaterial
          {...config}
          color={color}
          toneMapped={false}
        />
      </mesh>
    </Float>
  );
}

const Bubbles = ({ color, config, ...props }) => {
  return (
    <Instances
      limit={particles.length} // Optional: max amount of items (for calculating buffer size)
      castShadow
      receiveShadow
      // range={150}
      position={[0, 0, 0]}
    >
      <sphereGeometry args={[0.01, 32, 32]} />
      <MeshTransmissionMaterial {...config} color={color} toneMapped={false} />
      {particles.map((data, i) => {
        var bubbleColor = "#FF9060";
        if (i % 3 === 0) {
          bubbleColor = "#fef4ef";
        } else if (i % 5 === 0) {
          bubbleColor = color;
        }
        console.log(bubbleColor);
        return <Bubble color={bubbleColor} key={i} {...data} />;
      })}
    </Instances>
  );
};

function Bubble({ color, factor, speed, xFactor, yFactor, zFactor }) {
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
  return <Instance color={color} ref={ref} />;
}

export default App;
