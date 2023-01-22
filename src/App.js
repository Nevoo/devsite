import React, { Suspense, useState } from "react";
import "./App.css";
import { Canvas } from "@react-three/fiber";
import DonutGLTF from "./compontents/donut-gltf";
import { PerspectiveCamera } from "@react-three/drei";
import { useSpring, animated, config } from "@react-spring/web";

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
          <Suspense fallback={null}>
            <DonutGLTF onHover={onHover} />
          </Suspense>
        </Canvas>
      </animated.div>
    </div>
  );
}

export default App;
