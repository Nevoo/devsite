import React from "react";
import "./App.css";
import { Canvas } from "@react-three/fiber";
import { useSpring, animated, config } from "@react-spring/web";
import DonutScene from "./scenes/donut_scene";
import GalleryScene from "./scenes/gallery_scene";

function App() {
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

  return (
    <div>
      {/* <animated.div className="App" style={isHovering ? { background } : null}> */}
      <animated.div className="App">
        <Canvas dpr={[1, 1.5]} camera={{ fov: 70, position: [0, 2, 15] }}>
          {/* <DonutScene></DonutScene> */}
          <GalleryScene />
        </Canvas>
      </animated.div>
    </div>
  );
}

export default App;
